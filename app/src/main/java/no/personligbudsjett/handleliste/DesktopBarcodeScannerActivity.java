package no.personligbudsjett.handleliste;

import android.Manifest;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.os.SystemClock;
import android.util.Size;
import android.view.HapticFeedbackConstants;
import android.view.View;
import android.widget.TextView;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.Camera;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.ImageProxy;
import androidx.camera.core.Preview;
import androidx.camera.core.ZoomState;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.content.ContextCompat;
import androidx.lifecycle.LiveData;

import com.google.common.util.concurrent.ListenableFuture;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScannerOptions;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.ZoomSuggestionOptions;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.common.InputImage;

import org.json.JSONObject;

import java.net.URL;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Persistent product-barcode scanner used only as a camera/transport companion for desktop.
 * Product lookup stays on Personlig Budsjett desktop; Android sends only the decoded code.
 */
public class DesktopBarcodeScannerActivity extends AppCompatActivity {
    public static final String EXTRA_PAIRING_URL = "pairing_url";

    private static final long SAME_CODE_COOLDOWN_MS = 1600L;

    private PreviewView previewView;
    private TextView connectionText;
    private TextView lastCodeText;
    private TextView sendStatusText;
    private BarcodeScanner scanner;
    private Camera camera;
    private URL endpoint;

    private ExecutorService cameraExecutor;
    private ExecutorService networkExecutor;
    private final AtomicBoolean analyzing = new AtomicBoolean(false);
    private final Map<String, Long> recentCodes = new ConcurrentHashMap<>();

    private final ActivityResultLauncher<String> permission =
            registerForActivityResult(new ActivityResultContracts.RequestPermission(), granted -> {
                if (granted) startCamera();
                else setFatalStatus("Kameratilgang er nødvendig for å skanne varer.");
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_desktop_barcode_scanner);

        previewView = findViewById(R.id.desktopScannerPreview);
        connectionText = findViewById(R.id.desktopConnectionText);
        lastCodeText = findViewById(R.id.desktopLastCodeText);
        sendStatusText = findViewById(R.id.desktopSendStatusText);
        findViewById(R.id.desktopScannerCloseButton).setOnClickListener(v -> finish());

        try {
            endpoint = LocalTransfer.validatePairingUrl(
                    getIntent().getStringExtra(EXTRA_PAIRING_URL),
                    LocalTransfer.Direction.BARCODE_TO_PC
            );
            connectionText.setText("● Tilkoblet Personlig Budsjett");
        } catch (Exception e) {
            setFatalStatus("Ugyldig scanner-session: " + safeMessage(e));
            return;
        }

        cameraExecutor = Executors.newSingleThreadExecutor();
        networkExecutor = Executors.newSingleThreadExecutor();

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            startCamera();
        } else {
            permission.launch(Manifest.permission.CAMERA);
        }
    }

    private void startCamera() {
        ListenableFuture<ProcessCameraProvider> future = ProcessCameraProvider.getInstance(this);
        future.addListener(() -> {
            try {
                ProcessCameraProvider provider = future.get();
                Preview preview = new Preview.Builder().build();
                preview.setSurfaceProvider(previewView.getSurfaceProvider());

                ImageAnalysis analysis = new ImageAnalysis.Builder()
                        .setTargetResolution(new Size(1920, 1080))
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build();

                provider.unbindAll();
                camera = provider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis);

                float maxZoom = 4.0f;
                LiveData<ZoomState> zoomState = camera.getCameraInfo().getZoomState();
                if (zoomState != null && zoomState.getValue() != null) {
                    maxZoom = Math.max(1.0f, zoomState.getValue().getMaxZoomRatio());
                }
                final float supportedMaxZoom = maxZoom;
                ZoomSuggestionOptions zoomOptions = new ZoomSuggestionOptions.Builder(zoomRatio -> {
                    if (camera == null) return false;
                    float bounded = Math.max(1.0f, Math.min(zoomRatio, supportedMaxZoom));
                    camera.getCameraControl().setZoomRatio(bounded);
                    return true;
                }).setMaxSupportedZoomRatio(supportedMaxZoom).build();

                BarcodeScannerOptions options = new BarcodeScannerOptions.Builder()
                        .setBarcodeFormats(
                                Barcode.FORMAT_EAN_13,
                                Barcode.FORMAT_EAN_8,
                                Barcode.FORMAT_UPC_A,
                                Barcode.FORMAT_UPC_E
                        )
                        .enableAllPotentialBarcodes()
                        .setZoomSuggestionOptions(zoomOptions)
                        .build();
                scanner = BarcodeScanning.getClient(options);
                analysis.setAnalyzer(cameraExecutor, this::analyze);
            } catch (Exception e) {
                setFatalStatus("Kunne ikke starte kamera: " + safeMessage(e));
            }
        }, ContextCompat.getMainExecutor(this));
    }

    private void analyze(@NonNull ImageProxy proxy) {
        BarcodeScanner currentScanner = scanner;
        if (currentScanner == null || !analyzing.compareAndSet(false, true)) {
            proxy.close();
            return;
        }
        if (proxy.getImage() == null) {
            analyzing.set(false);
            proxy.close();
            return;
        }

        InputImage image = InputImage.fromMediaImage(proxy.getImage(), proxy.getImageInfo().getRotationDegrees());
        currentScanner.process(image)
                .addOnSuccessListener(barcodes -> {
                    for (Barcode barcode : barcodes) {
                        String raw = normalizeBarcode(barcode.getRawValue());
                        if (raw == null) continue;
                        if (shouldSend(raw)) {
                            sendBarcode(raw);
                            break;
                        }
                    }
                })
                .addOnCompleteListener(task -> {
                    analyzing.set(false);
                    proxy.close();
                });
    }

    private String normalizeBarcode(String raw) {
        if (raw == null) return null;
        String value = raw.trim();
        if (!value.matches("\\d{6,14}")) return null;
        return value;
    }

    private boolean shouldSend(String code) {
        long now = SystemClock.elapsedRealtime();
        Long previous = recentCodes.put(code, now);
        if (previous != null && now - previous < SAME_CODE_COOLDOWN_MS) return false;
        // Prevent an unbounded map during long scanning sessions.
        if (recentCodes.size() > 100) {
            recentCodes.entrySet().removeIf(entry -> now - entry.getValue() > 10000L);
        }
        return true;
    }

    private void sendBarcode(String code) {
        runOnUiThread(() -> {
            lastCodeText.setText(code);
            sendStatusText.setText("Sender …");
            sendStatusText.setTextColor(Color.WHITE);
        });

        if (camera != null) {
            camera.getCameraControl().setZoomRatio(1.0f);
        }

        networkExecutor.execute(() -> {
            try {
                JSONObject payload = new JSONObject();
                payload.put("type", "barcode");
                payload.put("ean", code);
                String response = LocalTransfer.postJson(endpoint, payload.toString());
                boolean ok = new JSONObject(response).optBoolean("ok", false);
                if (!ok) throw new IllegalStateException("Desktop bekreftet ikke mottaket");
                runOnUiThread(() -> {
                    previewView.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS);
                    lastCodeText.setText(code);
                    sendStatusText.setText("✓ Sendt til PC");
                    sendStatusText.setTextColor(0xFF7EE787);
                });
            } catch (Exception e) {
                recentCodes.remove(code);
                runOnUiThread(() -> {
                    sendStatusText.setText("Kunne ikke sende: " + safeMessage(e));
                    sendStatusText.setTextColor(0xFFFF8A80);
                });
            }
        });
    }

    private void setFatalStatus(String message) {
        if (connectionText != null) {
            connectionText.setText("● Ikke tilkoblet");
            connectionText.setTextColor(0xFFFF8A80);
        }
        if (sendStatusText != null) sendStatusText.setText(message);
    }

    private String safeMessage(Exception e) {
        String message = e.getMessage();
        return message == null || message.trim().isEmpty() ? e.getClass().getSimpleName() : message.trim();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (scanner != null) scanner.close();
        if (cameraExecutor != null) cameraExecutor.shutdownNow();
        if (networkExecutor != null) networkExecutor.shutdownNow();
    }
}

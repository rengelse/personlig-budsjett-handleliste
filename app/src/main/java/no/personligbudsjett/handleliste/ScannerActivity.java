package no.personligbudsjett.handleliste;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Size;
import android.widget.TextView;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.ImageProxy;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.content.ContextCompat;

import com.google.common.util.concurrent.ListenableFuture;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScannerOptions;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.common.InputImage;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public class ScannerActivity extends AppCompatActivity {
    public static final String EXTRA_QR = "qr";
    public static final String EXTRA_PROMPT = "prompt";
    public static final String EXTRA_MODE = "mode";
    public static final String MODE_PAIRING_QR = "pairing_qr";
    public static final String MODE_PRODUCT_BARCODE = "product_barcode";

    private PreviewView previewView;
    private TextView statusText;
    private ExecutorService executor;
    private BarcodeScanner scanner;
    private final AtomicBoolean busy = new AtomicBoolean(false);
    private final AtomicBoolean finished = new AtomicBoolean(false);

    private final ActivityResultLauncher<String> permission =
            registerForActivityResult(new ActivityResultContracts.RequestPermission(), granted -> {
                if (granted) startCamera();
                else {
                    statusText.setText("Kameratilgang er nødvendig for å skanne koden.");
                }
            });

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_scanner);
        previewView = findViewById(R.id.preview);
        statusText = findViewById(R.id.statusText);
        String prompt = getIntent().getStringExtra(EXTRA_PROMPT);
        if (prompt != null && !prompt.trim().isEmpty()) statusText.setText(prompt);
        findViewById(R.id.closeButton).setOnClickListener(v -> finish());

        executor = Executors.newSingleThreadExecutor();
        String mode = getIntent().getStringExtra(EXTRA_MODE);
        BarcodeScannerOptions.Builder optionsBuilder = new BarcodeScannerOptions.Builder();
        if (MODE_PRODUCT_BARCODE.equals(mode)) {
            optionsBuilder.setBarcodeFormats(
                    Barcode.FORMAT_EAN_13,
                    Barcode.FORMAT_EAN_8,
                    Barcode.FORMAT_UPC_A,
                    Barcode.FORMAT_UPC_E
            );
        } else {
            optionsBuilder.setBarcodeFormats(Barcode.FORMAT_QR_CODE);
        }
        BarcodeScannerOptions options = optionsBuilder.build();
        scanner = BarcodeScanning.getClient(options);

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

                // Keep a detailed analysis frame for reliable pairing-QR decoding across screen sizes.
                ImageAnalysis analysis = new ImageAnalysis.Builder()
                        .setTargetResolution(new Size(1920, 1080))
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build();
                analysis.setAnalyzer(executor, this::analyze);

                provider.unbindAll();
                provider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis);
            } catch (Exception e) {
                runOnUiThread(() -> statusText.setText("Kunne ikke starte kamera: " + e.getMessage()));
            }
        }, ContextCompat.getMainExecutor(this));
    }

    private void analyze(@NonNull ImageProxy proxy) {
        if (finished.get() || !busy.compareAndSet(false, true)) {
            proxy.close();
            return;
        }

        if (proxy.getImage() == null) {
            busy.set(false);
            proxy.close();
            return;
        }

        InputImage image = InputImage.fromMediaImage(
                proxy.getImage(),
                proxy.getImageInfo().getRotationDegrees()
        );

        scanner.process(image)
                .addOnSuccessListener(barcodes -> {
                    for (Barcode barcode : barcodes) {
                        String raw = barcode.getRawValue();
                        if (raw == null || raw.isBlank()) continue;
                        if (finished.compareAndSet(false, true)) {
                            Intent result = new Intent().putExtra(EXTRA_QR, raw);
                            setResult(RESULT_OK, result);
                            finish();
                            break;
                        }
                    }
                })
                .addOnCompleteListener(task -> {
                    busy.set(false);
                    proxy.close();
                });
    }

    @Override protected void onDestroy() {
        super.onDestroy();
        if (scanner != null) scanner.close();
        if (executor != null) executor.shutdownNow();
    }
}

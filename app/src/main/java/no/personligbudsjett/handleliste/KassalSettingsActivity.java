package no.personligbudsjett.handleliste;

import android.os.Bundle;
import android.text.InputType;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

public class KassalSettingsActivity extends AppCompatActivity {
    private EditText apiKeyInput;
    private TextView statusText;
    private Button testButton;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_kassal_settings);
        apiKeyInput = findViewById(R.id.kassalApiKeyInput);
        statusText = findViewById(R.id.kassalStatusText);
        testButton = findViewById(R.id.kassalTestButton);
        Button saveButton = findViewById(R.id.kassalSaveButton);
        int accent = PaletteManager.current(this).primary;
        if (saveButton.getBackground() != null) saveButton.getBackground().mutate().setTint(accent);
        saveButton.setTextColor(PaletteManager.contrastText(accent));
        apiKeyInput.setText(KassalApi.getApiKey(this));
        updateStatus();
        findViewById(R.id.kassalBackButton).setOnClickListener(v -> finish());
        findViewById(R.id.kassalToggleVisibility).setOnClickListener(v -> toggleVisibility());
        findViewById(R.id.kassalSaveButton).setOnClickListener(v -> {
            KassalApi.setApiKey(this, apiKeyInput.getText().toString());
            updateStatus();
            Toast.makeText(this, "API-nøkkel lagret lokalt", Toast.LENGTH_SHORT).show();
        });
        testButton.setOnClickListener(v -> testConnection());
    }

    private void toggleVisibility() {
        int selection = apiKeyInput.getSelectionStart();
        boolean hidden = (apiKeyInput.getInputType() & InputType.TYPE_TEXT_VARIATION_PASSWORD) != 0;
        apiKeyInput.setInputType(InputType.TYPE_CLASS_TEXT | (hidden ? InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD : InputType.TYPE_TEXT_VARIATION_PASSWORD));
        apiKeyInput.setSelection(Math.max(0, selection));
    }

    private void updateStatus() {
        if (KassalApi.hasApiKey(this)) {
            statusText.setText("API-nøkkel er lagret på denne telefonen");
        } else {
            statusText.setText("Ingen API-nøkkel er lagret");
        }
    }

    private void testConnection() {
        KassalApi.setApiKey(this, apiKeyInput.getText().toString());
        testButton.setEnabled(false);
        statusText.setText("Tester tilkobling …");
        new Thread(() -> {
            try {
                KassalApi.testConnection(this);
                runOnUiThread(() -> {
                    testButton.setEnabled(true);
                    statusText.setText("✓ Tilkoblet Kassal.app");
                });
            } catch (Exception e) {
                runOnUiThread(() -> {
                    testButton.setEnabled(true);
                    statusText.setText("Kunne ikke koble til");
                    new android.app.AlertDialog.Builder(this).setTitle("Kassal.app").setMessage(e.getMessage()).setPositiveButton("OK", null).show();
                });
            }
        }, "kassal-test").start();
    }
}

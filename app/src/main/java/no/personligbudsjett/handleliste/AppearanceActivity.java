package no.personligbudsjett.handleliste;

import android.app.AlertDialog;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.app.AppCompatDelegate;

public class AppearanceActivity extends AppCompatActivity {
    private TextView modeValue;
    private TextView themeValue;

    @Override protected void onCreate(Bundle savedInstanceState) {
        applySavedMode();
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_appearance);
        findViewById(R.id.backButton).setOnClickListener(v -> finish());
        modeValue = findViewById(R.id.modeValue);
        themeValue = findViewById(R.id.themeValue);
        findViewById(R.id.modeRow).setOnClickListener(v -> chooseMode());
        findViewById(R.id.themeRow).setOnClickListener(v -> startActivity(new Intent(this, ThemeActivity.class)));
        refresh();
    }

    @Override protected void onResume() {
        super.onResume();
        refresh();
    }

    private void refresh() {
        if (modeValue == null) return;
        String mode = PaletteManager.mode(this);
        String label = "Som på enheten";
        if ("light".equals(mode)) label = "Lys";
        else if ("dark".equals(mode)) label = "Mørk";
        modeValue.setText(label + "  ›");
        themeValue.setText(PaletteManager.current(this).name + "  ›");
    }

    private void chooseMode() {
        String[] labels = {"Som på enheten", "Lys", "Mørk"};
        String[] values = {"system", "light", "dark"};
        String current = PaletteManager.mode(this);
        int selected = "light".equals(current) ? 1 : "dark".equals(current) ? 2 : 0;
        new AlertDialog.Builder(this)
                .setTitle("Mørk modus")
                .setSingleChoiceItems(labels, selected, (dialog, which) -> {
                    PaletteManager.setMode(this, values[which]);
                    applySavedMode();
                    dialog.dismiss();
                    recreate();
                })
                .setNegativeButton("Avbryt", null)
                .show();
    }

    private void applySavedMode() {
        String mode = PaletteManager.mode(this);
        int value = AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM;
        if ("light".equals(mode)) value = AppCompatDelegate.MODE_NIGHT_NO;
        else if ("dark".equals(mode)) value = AppCompatDelegate.MODE_NIGHT_YES;
        AppCompatDelegate.setDefaultNightMode(value);
    }
}

package no.personligbudsjett.handleliste;

import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.drawable.DrawableCompat;

public class ThemeActivity extends AppCompatActivity {
    private String selectedId;
    private LinearLayout paletteContainer;
    private ProgressBar previewProgress;
    private Button previewButton;
    private Button saveButton;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_theme);
        selectedId = PaletteManager.current(this).id;
        paletteContainer = findViewById(R.id.paletteContainer);
        previewProgress = findViewById(R.id.previewProgress);
        previewButton = findViewById(R.id.previewButton);
        saveButton = findViewById(R.id.saveButton);
        findViewById(R.id.backButton).setOnClickListener(v -> finish());
        saveButton.setOnClickListener(v -> {
            PaletteManager.set(this, selectedId);
            setResult(RESULT_OK);
            finish();
        });
        renderPalettes();
        applyPreview();
    }

    private void renderPalettes() {
        paletteContainer.removeAllViews();
        for (PaletteManager.Palette palette : PaletteManager.all()) {
            LinearLayout holder = new LinearLayout(this);
            holder.setOrientation(LinearLayout.VERTICAL);
            holder.setGravity(Gravity.CENTER);
            LinearLayout.LayoutParams hp = new LinearLayout.LayoutParams(dp(132), dp(150));
            hp.setMargins(0, 0, dp(12), 0);
            holder.setLayoutParams(hp);

            TextView swatch = new TextView(this);
            swatch.setGravity(Gravity.CENTER);
            swatch.setTextSize(28);
            swatch.setText(palette.id.equals(selectedId) ? "✓    ●  ●" : "     ●  ●");
            swatch.setTextColor(Color.WHITE);
            GradientDrawable bg = new GradientDrawable();
            bg.setColor(Color.parseColor("#2B2D2C"));
            bg.setCornerRadius(dp(18));
            bg.setStroke(dp(palette.id.equals(selectedId) ? 3 : 1), palette.id.equals(selectedId) ? palette.primary : Color.parseColor("#454847"));
            swatch.setBackground(bg);
            swatch.setCompoundDrawablePadding(0);
            swatch.setPadding(dp(10),0,dp(10),0);
            LinearLayout.LayoutParams sp = new LinearLayout.LayoutParams(dp(124), dp(104));
            swatch.setLayoutParams(sp);
            // Colored dots are approximated through the palette name card background accent stripe below.
            View stripe = new View(this);
            GradientDrawable stripeBg = new GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT, new int[]{palette.primary, palette.secondary});
            stripeBg.setCornerRadius(dp(4));
            stripe.setBackground(stripeBg);
            LinearLayout.LayoutParams stripeParams = new LinearLayout.LayoutParams(dp(70), dp(7));
            stripeParams.setMargins(0, -dp(18), 0, dp(13));
            stripe.setLayoutParams(stripeParams);

            TextView label = new TextView(this);
            label.setText(palette.name);
            label.setTextColor(getColor(R.color.pb_muted));
            label.setTextSize(13);
            label.setGravity(Gravity.CENTER);
            holder.addView(swatch);
            holder.addView(stripe);
            holder.addView(label);
            holder.setOnClickListener(v -> {
                selectedId = palette.id;
                renderPalettes();
                applyPreview();
            });
            paletteContainer.addView(holder);
        }
    }

    private void applyPreview() {
        PaletteManager.Palette p = PaletteManager.byId(selectedId);
        previewProgress.setProgressTintList(android.content.res.ColorStateList.valueOf(p.primary));
        tintButton(previewButton, p.primary);
        tintButton(saveButton, p.primary);
    }

    private void tintButton(Button button, int color) {
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(color);
        bg.setCornerRadius(dp(14));
        button.setBackground(bg);
        button.setTextColor(PaletteManager.contrastText(color));
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
}

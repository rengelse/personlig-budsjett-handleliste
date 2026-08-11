package no.personligbudsjett.handleliste;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;

public final class PaletteManager {
    private static final String PREFS = "appearance";
    private static final String KEY_PALETTE = "palette";
    public static final String DEFAULT = "budget";

    public static final class Palette {
        public final String id, name;
        public final int primary, secondary;
        Palette(String id, String name, String primary, String secondary) {
            this.id = id; this.name = name;
            this.primary = Color.parseColor(primary);
            this.secondary = Color.parseColor(secondary);
        }
    }

    private static final Palette[] PALETTES = {
            new Palette("budget", "Personlig Budsjett", "#35D14F", "#63EA78"),
            new Palette("ocean", "Hav", "#43B9D6", "#8DDC87"),
            new Palette("sapphire", "Safir", "#7398F5", "#F28EB5"),
            new Palette("forest", "Skog", "#32A852", "#A2D74E"),
            new Palette("sunset", "Solnedgang", "#F28A3C", "#E96791")
    };

    private PaletteManager() {}

    public static Palette[] all() { return PALETTES; }

    public static Palette current(Context context) {
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        return byId(p.getString(KEY_PALETTE, DEFAULT));
    }

    public static void set(Context context, String id) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_PALETTE, id).apply();
    }

    public static Palette byId(String id) {
        for (Palette p : PALETTES) if (p.id.equals(id)) return p;
        return PALETTES[0];
    }

    public static int contrastText(int color) {
        double r = Color.red(color) / 255.0;
        double g = Color.green(color) / 255.0;
        double b = Color.blue(color) / 255.0;
        double luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return luminance > 0.62 ? Color.parseColor("#101512") : Color.WHITE;
    }

    public static String mode(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("mode", "system");
    }

    public static void setMode(Context context, String mode) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("mode", mode).apply();
    }

    public static boolean keepScreenOn(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean("keep_screen_on", false);
    }

    public static void setKeepScreenOn(Context context, boolean value) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean("keep_screen_on", value).apply();
    }
}

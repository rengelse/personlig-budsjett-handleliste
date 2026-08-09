package no.personligbudsjett.handleliste;

import android.util.Base64;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.GZIPInputStream;

public final class QrProtocol {
    public static final String PREFIX = "PB1:";

    public static final class Payload {
        public String listName = "Handleliste";
        public final List<ShoppingItem> items = new ArrayList<>();
    }

    private QrProtocol() {}

    public static Payload decode(String raw) throws Exception {
        if (raw == null) throw new IllegalArgumentException("Tom QR-kode");
        String value = raw.trim();

        final String json;
        if (value.startsWith(PREFIX)) {
            String encoded = value.substring(PREFIX.length());
            byte[] compressed = Base64.decode(encoded, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
            json = gunzip(compressed);
        } else if (value.startsWith("{")) {
            // Development/debug fallback. Production desktop QR uses PB1.
            json = value;
        } else {
            throw new IllegalArgumentException("QR-koden er ikke fra Personlig Budsjett");
        }

        JSONObject root = new JSONObject(json);
        if (root.optInt("v", 0) != 1) throw new IllegalArgumentException("Ukjent QR-versjon");

        Payload p = new Payload();
        p.listName = root.optString("list", "Handleliste");
        JSONArray arr = root.optJSONArray("items");
        if (arr == null) throw new IllegalArgumentException("QR-koden mangler varer");

        for (int n = 0; n < arr.length(); n++) {
            JSONObject o = arr.optJSONObject(n);
            if (o == null) continue;
            ShoppingItem item = ShoppingItem.fromJson(o);
            if (!item.name.isEmpty()) p.items.add(item);
        }
        if (p.items.isEmpty()) throw new IllegalArgumentException("Handlelisten er tom");
        return p;
    }

    private static String gunzip(byte[] input) throws Exception {
        try (GZIPInputStream gis = new GZIPInputStream(new ByteArrayInputStream(input));
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int read;
            while ((read = gis.read(buffer)) != -1) out.write(buffer, 0, read);
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }
}

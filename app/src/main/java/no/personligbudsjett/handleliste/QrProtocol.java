package no.personligbudsjett.handleliste;

import android.util.Base64;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.zip.GZIPInputStream;

public final class QrProtocol {
    public static final String PREFIX = "PB1:";

    public static final class Payload {
        public int version = 1;
        public String listName = "Handleliste";
        public String sourceListId = "";
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
            json = value;
        } else {
            throw new IllegalArgumentException("QR-koden er ikke fra Personlig Budsjett");
        }
        return decodeJson(json);
    }

    /** Parse the direct application/json body returned by the local desktop transfer server. */
    public static Payload decodeJson(String json) throws Exception {
        if (json == null || json.trim().isEmpty()) throw new IllegalArgumentException("Tom handleliste fra PC");
        JSONObject root = new JSONObject(json);
        int version = root.optInt("v", 0);
        if (version != 1 && version != 2) throw new IllegalArgumentException("Ukjent PB1-versjon");
        return version == 2 ? decodeV2(root) : decodeV1(root);
    }

    private static Payload decodeV2(JSONObject root) {
        Payload p = new Payload();
        p.version = 2;
        p.listName = "Handleliste";
        p.sourceListId = root.optString("id", "").trim();

        JSONArray arr = root.optJSONArray("i");
        if (arr == null) throw new IllegalArgumentException("QR-koden mangler varer");

        for (int n = 0; n < arr.length(); n++) {
            JSONObject o = arr.optJSONObject(n);
            if (o == null) continue;

            ShoppingItem item = new ShoppingItem();
            item.id = UUID.randomUUID().toString();
            item.sourceItemId = o.optString("i", "").trim();
            item.name = o.optString("n", "").trim();
            item.qty = o.optDouble("q", 0);
            item.unit = o.optString("u", "").trim();
            item.category = o.optString("c", "Annet").trim();
            if (item.category.isEmpty()) item.category = "Annet";
            item.store = o.optString("s", "").trim();
            item.ean = ""; // EAN is intentionally not part of compact PB v2.
            if (o.has("p") && !o.isNull("p")) item.estimatedPrice = o.optDouble("p");
            item.actualPrice = null;
            item.checked = false;
            if (!item.name.isEmpty()) p.items.add(item);
        }

        if (p.items.isEmpty()) throw new IllegalArgumentException("Handlelisten er tom");
        return p;
    }

    private static Payload decodeV1(JSONObject root) {
        Payload p = new Payload();
        p.version = 1;
        p.listName = root.optString("list", "Handleliste");
        p.sourceListId = firstNonEmpty(root.optString("id", ""), root.optString("listId", ""), root.optString("sid", ""));
        JSONArray arr = root.optJSONArray("items");
        if (arr == null) throw new IllegalArgumentException("QR-koden mangler varer");

        for (int n = 0; n < arr.length(); n++) {
            JSONObject o = arr.optJSONObject(n);
            if (o == null) continue;
            ShoppingItem item = ShoppingItem.fromJson(o);
            item.sourceItemId = firstNonEmpty(o.optString("id", ""), o.optString("itemId", ""), o.optString("li", ""));
            item.id = UUID.randomUUID().toString();
            item.actualPrice = null;
            if (!item.name.isEmpty()) p.items.add(item);
        }
        if (p.items.isEmpty()) throw new IllegalArgumentException("Handlelisten er tom");
        return p;
    }

    private static String firstNonEmpty(String... values) {
        for (String value : values) {
            if (value != null && !value.trim().isEmpty()) return value.trim();
        }
        return "";
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

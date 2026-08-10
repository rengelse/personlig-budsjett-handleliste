package no.personligbudsjett.handleliste;

import android.util.Base64;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.GZIPOutputStream;

public final class ReturnQrProtocol {
    public static final String PREFIX = "PB2:";

    private ReturnQrProtocol() {}

    public static String encode(ShoppingTrip trip) throws Exception {
        if (trip == null || !trip.isCompleted()) {
            throw new IllegalArgumentException("Handleturen må være fullført");
        }

        JSONObject root = new JSONObject();
        root.put("v", 1);
        root.put("id", trip.id);
        root.put("l", trip.listName == null ? "Handleliste" : trip.listName);
        root.put("ca", trip.createdAt);
        root.put("da", trip.completedAt);
        root.put("et", trip.expectedTotal());
        if (trip.actualTotal != null) root.put("at", trip.actualTotal);

        JSONArray purchasedItems = new JSONArray();
        for (ShoppingItem item : trip.items) {
            if (!item.checked) continue;
            JSONObject o = new JSONObject();
            o.put("n", item.name);
            o.put("q", item.qty);
            o.put("u", item.unit);
            o.put("c", item.category);
            if (item.estimatedPrice != null) o.put("ep", item.estimatedPrice);
            if (item.store != null && !item.store.trim().isEmpty()) o.put("s", item.store);
            if (item.ean != null && !item.ean.trim().isEmpty()) o.put("e", item.ean);
            purchasedItems.put(o);
        }
        if (purchasedItems.length() == 0) {
            throw new IllegalArgumentException("Handleturen har ingen varer markert som kjøpt");
        }
        root.put("i", purchasedItems);

        byte[] compressed = gzip(root.toString().getBytes(StandardCharsets.UTF_8));
        return PREFIX + Base64.encodeToString(compressed, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
    }

    private static byte[] gzip(byte[] input) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (GZIPOutputStream gzip = new GZIPOutputStream(out)) {
            gzip.write(input);
        }
        return out.toByteArray();
    }
}

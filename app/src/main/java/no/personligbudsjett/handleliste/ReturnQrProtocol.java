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


    /** Build direct PB2 v2 JSON for POST over the local pairing connection. */
    public static String encodeJsonV2(ShoppingTrip trip) throws Exception {
        if (trip == null || !trip.isCompleted()) {
            throw new IllegalArgumentException("Handleturen må være fullført");
        }
        long purchasedCount = trip.items.stream().filter(item -> item.checked).count();
        if (purchasedCount == 0) {
            throw new IllegalArgumentException("Handleturen har ingen varer markert som kjøpt");
        }
        if (trip.sourceIdentityMixed || trip.sourceListId == null || trip.sourceListId.trim().isEmpty()) {
            throw new IllegalArgumentException("Denne handleturen mangler desktopens liste-ID og kan ikke sendes tilbake via lokal overføring");
        }
        boolean missingItemIdentity = trip.items.stream()
                .filter(item -> item.checked)
                .anyMatch(item -> item.sourceItemId == null || item.sourceItemId.trim().isEmpty());
        if (missingItemIdentity) {
            throw new IllegalArgumentException("En eller flere kjøpte varer mangler desktop-ID og kan ikke sendes presist tilbake");
        }
        return buildV2Root(trip).toString();
    }

    private static JSONObject buildV2Root(ShoppingTrip trip) throws Exception {
        JSONObject root = new JSONObject();
        root.put("v", 2);
        root.put("id", trip.sourceListId.trim());
        if (trip.actualTotal != null) root.put("t", trip.actualTotal);

        JSONArray purchasedItems = new JSONArray();
        for (ShoppingItem item : trip.items) {
            if (!item.checked) continue;
            JSONObject o = new JSONObject();
            o.put("i", item.sourceItemId.trim());
            o.put("n", item.name);
            o.put("q", item.qty);
            o.put("u", item.unit == null ? "" : item.unit);
            o.put("c", item.category == null ? "" : item.category);
            o.put("s", item.store == null ? "" : item.store);
            if (item.actualPrice != null) o.put("p", item.actualPrice);
            purchasedItems.put(o);
        }
        root.put("i", purchasedItems);
        return root;
    }

    public static String encode(ShoppingTrip trip) throws Exception {
        if (trip == null || !trip.isCompleted()) {
            throw new IllegalArgumentException("Handleturen må være fullført");
        }
        long purchasedCount = trip.items.stream().filter(item -> item.checked).count();
        if (purchasedCount == 0) {
            throw new IllegalArgumentException("Handleturen har ingen varer markert som kjøpt");
        }

        // New compact PB2 v2 requires the original desktop list identity. Older stored trips
        // without that identity keep using PB2 v1, which Desktop v0.7.2 still supports.
        boolean hasCompleteV2Identity = !trip.sourceIdentityMixed
                && trip.sourceListId != null
                && !trip.sourceListId.trim().isEmpty()
                && trip.items.stream()
                    .filter(item -> item.checked)
                    .allMatch(item -> item.sourceItemId != null && !item.sourceItemId.trim().isEmpty());
        if (hasCompleteV2Identity) return encodeV2(trip);
        return encodeLegacyV1(trip);
    }

    private static String encodeV2(ShoppingTrip trip) throws Exception {
        return encodeRoot(buildV2Root(trip));
    }

    private static String encodeLegacyV1(ShoppingTrip trip) throws Exception {
        JSONObject root = new JSONObject();
        root.put("v", 1);
        root.put("id", trip.id);
        if (!trip.sourceIdentityMixed && trip.sourceListId != null && !trip.sourceListId.trim().isEmpty()) {
            root.put("sid", trip.sourceListId.trim());
        }
        root.put("l", trip.listName == null ? "Handleliste" : trip.listName);
        root.put("ca", trip.createdAt);
        root.put("da", trip.completedAt);
        root.put("cur", "NOK");
        root.put("et", trip.expectedTotal());
        if (trip.actualTotal != null) root.put("at", trip.actualTotal);

        JSONArray purchasedItems = new JSONArray();
        for (ShoppingItem item : trip.items) {
            if (!item.checked) continue;
            JSONObject o = new JSONObject();
            if (item.sourceItemId != null && !item.sourceItemId.trim().isEmpty()) o.put("li", item.sourceItemId.trim());
            o.put("n", item.name);
            o.put("q", item.qty);
            o.put("u", item.unit);
            o.put("c", item.category);
            if (item.estimatedPrice != null) o.put("ep", item.estimatedPrice);
            if (item.actualPrice != null) o.put("ap", item.actualPrice);
            if (item.store != null && !item.store.trim().isEmpty()) o.put("s", item.store);
            if (item.ean != null && !item.ean.trim().isEmpty()) o.put("e", item.ean);
            purchasedItems.put(o);
        }
        root.put("i", purchasedItems);
        return encodeRoot(root);
    }

    private static String encodeRoot(JSONObject root) throws Exception {
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

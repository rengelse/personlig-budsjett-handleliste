package no.personligbudsjett.handleliste;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class ShoppingTrip {
    public String id = UUID.randomUUID().toString();
    public String listName = "Handleliste";
    public long createdAt = System.currentTimeMillis();
    public Long completedAt = null;
    public Double actualTotal = null;
    public final List<ShoppingItem> items = new ArrayList<>();

    public boolean isCompleted() {
        return completedAt != null;
    }

    public double expectedTotal() {
        return items.stream()
                .filter(item -> item.estimatedPrice != null)
                .mapToDouble(item -> item.estimatedPrice)
                .sum();
    }

    public JSONObject toJson() throws JSONException {
        JSONObject o = new JSONObject();
        o.put("id", id);
        o.put("listName", listName == null ? "Handleliste" : listName);
        o.put("createdAt", createdAt);
        if (completedAt != null) o.put("completedAt", completedAt);
        if (actualTotal != null) o.put("actualTotal", actualTotal);
        JSONArray arr = new JSONArray();
        for (ShoppingItem item : items) arr.put(item.toJson());
        o.put("items", arr);
        return o;
    }

    public static ShoppingTrip fromJson(JSONObject o) {
        ShoppingTrip trip = new ShoppingTrip();
        trip.id = o.optString("id", UUID.randomUUID().toString());
        trip.listName = o.optString("listName", "Handleliste");
        trip.createdAt = o.optLong("createdAt", System.currentTimeMillis());
        if (o.has("completedAt") && !o.isNull("completedAt")) trip.completedAt = o.optLong("completedAt");
        if (o.has("actualTotal") && !o.isNull("actualTotal")) trip.actualTotal = o.optDouble("actualTotal");
        trip.items.clear();
        JSONArray arr = o.optJSONArray("items");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject item = arr.optJSONObject(i);
                if (item != null) trip.items.add(ShoppingItem.fromJson(item));
            }
        }
        return trip;
    }
}

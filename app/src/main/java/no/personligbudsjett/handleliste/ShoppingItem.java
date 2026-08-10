package no.personligbudsjett.handleliste;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.UUID;

public class ShoppingItem {
    public String id = UUID.randomUUID().toString();
    public String name = "";
    public double qty = 0;
    public String unit = "";
    public String category = "Annet";
    public Double estimatedPrice = null;
    // Stable identity from the originating PB1 line, when supplied by desktop.
    public String sourceItemId = "";
    // Actual unit/line price is optional and must only be set when it is genuinely known.
    public Double actualPrice = null;
    public String store = "";
    public String ean = "";
    public boolean checked = false;

    public JSONObject toJson() throws JSONException {
        JSONObject o = new JSONObject();
        o.put("id", id);
        o.put("name", name);
        o.put("qty", qty);
        o.put("unit", unit);
        o.put("category", category);
        if (estimatedPrice != null) o.put("price", estimatedPrice);
        if (sourceItemId != null && !sourceItemId.trim().isEmpty()) o.put("sourceItemId", sourceItemId);
        if (actualPrice != null) o.put("actualPrice", actualPrice);
        o.put("store", store);
        o.put("ean", ean);
        o.put("checked", checked);
        return o;
    }

    public static ShoppingItem fromJson(JSONObject o) {
        ShoppingItem i = new ShoppingItem();
        i.id = o.optString("id", UUID.randomUUID().toString());
        i.name = o.optString("name", "").trim();
        i.qty = o.optDouble("qty", 0);
        i.unit = o.optString("unit", "").trim();
        i.category = o.optString("category", "Annet").trim();
        if (i.category.isEmpty()) i.category = "Annet";
        if (o.has("price") && !o.isNull("price")) i.estimatedPrice = o.optDouble("price");
        i.sourceItemId = o.optString("sourceItemId", "").trim();
        if (o.has("actualPrice") && !o.isNull("actualPrice")) i.actualPrice = o.optDouble("actualPrice");
        i.store = o.optString("store", "").trim();
        i.ean = o.optString("ean", "").trim();
        i.checked = o.optBoolean("checked", false);
        return i;
    }
}

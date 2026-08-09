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
        i.store = o.optString("store", "").trim();
        i.ean = o.optString("ean", "").trim();
        i.checked = o.optBoolean("checked", false);
        return i;
    }
}

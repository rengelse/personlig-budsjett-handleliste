package no.personligbudsjett.handleliste;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class ShoppingStore {
    private static final String PREF = "pb_shopping_store";
    private static final String KEY_NAME = "list_name";
    private static final String KEY_ITEMS = "items";

    private final SharedPreferences prefs;

    public ShoppingStore(Context context) {
        prefs = context.getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }

    public String getListName() {
        return prefs.getString(KEY_NAME, "Handleliste");
    }

    public List<ShoppingItem> loadItems() {
        List<ShoppingItem> result = new ArrayList<>();
        try {
            JSONArray arr = new JSONArray(prefs.getString(KEY_ITEMS, "[]"));
            for (int i=0; i<arr.length(); i++) {
                JSONObject o = arr.optJSONObject(i);
                if (o != null) result.add(ShoppingItem.fromJson(o));
            }
        } catch (Exception ignored) {}
        return result;
    }

    public void save(String listName, List<ShoppingItem> items) {
        JSONArray arr = new JSONArray();
        for (ShoppingItem item : items) {
            try { arr.put(item.toJson()); } catch (Exception ignored) {}
        }
        prefs.edit()
                .putString(KEY_NAME, listName == null ? "Handleliste" : listName)
                .putString(KEY_ITEMS, arr.toString())
                .apply();
    }
}

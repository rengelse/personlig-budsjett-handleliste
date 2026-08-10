package no.personligbudsjett.handleliste;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class ShoppingStore {
    private static final String PREF = "pb_shopping_store";
    private static final String KEY_TRIPS = "shopping_trips_v2";
    private static final String KEY_ACTIVE_TRIP_ID = "active_trip_id_v2";

    // v0.5.2 legacy keys, kept only for one-time migration.
    private static final String LEGACY_KEY_NAME = "list_name";
    private static final String LEGACY_KEY_ITEMS = "items";

    private final SharedPreferences prefs;

    public ShoppingStore(Context context) {
        prefs = context.getSharedPreferences(PREF, Context.MODE_PRIVATE);
        migrateLegacyIfNeeded();
    }

    public ShoppingTrip loadActiveTrip() {
        String activeId = prefs.getString(KEY_ACTIVE_TRIP_ID, "");
        if (activeId == null || activeId.isEmpty()) return null;
        for (ShoppingTrip trip : loadTrips()) {
            if (activeId.equals(trip.id) && !trip.isCompleted()) return trip;
        }
        return null;
    }

    public List<ShoppingTrip> loadHistory() {
        List<ShoppingTrip> history = new ArrayList<>();
        for (ShoppingTrip trip : loadTrips()) if (trip.isCompleted()) history.add(trip);
        history.sort(Comparator.comparingLong((ShoppingTrip trip) -> trip.completedAt == null ? trip.createdAt : trip.completedAt).reversed());
        return history;
    }

    public void saveActiveTrip(ShoppingTrip activeTrip) {
        List<ShoppingTrip> trips = loadTrips();
        if (activeTrip == null) {
            prefs.edit().remove(KEY_ACTIVE_TRIP_ID).apply();
            return;
        }
        upsert(trips, activeTrip);
        persistTrips(trips, activeTrip.id);
    }

    public void completeTrip(ShoppingTrip trip) {
        if (trip == null) return;
        List<ShoppingTrip> trips = loadTrips();
        upsert(trips, trip);
        persistTrips(trips, null);
    }

    public void deleteActiveTrip() {
        String activeId = prefs.getString(KEY_ACTIVE_TRIP_ID, "");
        List<ShoppingTrip> trips = loadTrips();
        if (activeId != null && !activeId.isEmpty()) trips.removeIf(trip -> activeId.equals(trip.id));
        persistTrips(trips, null);
    }

    private void upsert(List<ShoppingTrip> trips, ShoppingTrip replacement) {
        for (int i = 0; i < trips.size(); i++) {
            if (trips.get(i).id.equals(replacement.id)) {
                trips.set(i, replacement);
                return;
            }
        }
        trips.add(replacement);
    }

    private List<ShoppingTrip> loadTrips() {
        List<ShoppingTrip> result = new ArrayList<>();
        try {
            JSONArray arr = new JSONArray(prefs.getString(KEY_TRIPS, "[]"));
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.optJSONObject(i);
                if (o != null) result.add(ShoppingTrip.fromJson(o));
            }
        } catch (Exception ignored) {}
        return result;
    }

    private void persistTrips(List<ShoppingTrip> trips, String activeId) {
        JSONArray arr = new JSONArray();
        for (ShoppingTrip trip : trips) {
            try { arr.put(trip.toJson()); } catch (Exception ignored) {}
        }
        SharedPreferences.Editor editor = prefs.edit().putString(KEY_TRIPS, arr.toString());
        if (activeId == null || activeId.isEmpty()) editor.remove(KEY_ACTIVE_TRIP_ID);
        else editor.putString(KEY_ACTIVE_TRIP_ID, activeId);
        editor.apply();
    }

    private void migrateLegacyIfNeeded() {
        if (prefs.contains(KEY_TRIPS)) return;
        String oldItems = prefs.getString(LEGACY_KEY_ITEMS, "[]");
        try {
            JSONArray arr = new JSONArray(oldItems == null ? "[]" : oldItems);
            if (arr.length() == 0) {
                prefs.edit().putString(KEY_TRIPS, "[]").apply();
                return;
            }
            ShoppingTrip trip = new ShoppingTrip();
            trip.listName = prefs.getString(LEGACY_KEY_NAME, "Handleliste");
            trip.items.clear();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject item = arr.optJSONObject(i);
                if (item != null) trip.items.add(ShoppingItem.fromJson(item));
            }
            List<ShoppingTrip> trips = new ArrayList<>();
            trips.add(trip);
            persistTrips(trips, trip.id);
        } catch (Exception ignored) {
            prefs.edit().putString(KEY_TRIPS, "[]").apply();
        }
    }
}

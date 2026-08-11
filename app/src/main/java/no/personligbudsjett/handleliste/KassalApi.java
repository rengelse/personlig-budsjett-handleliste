package no.personligbudsjett.handleliste;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public final class KassalApi {
    private static final String PREFS = "kassal_api";
    private static final String KEY_TOKEN = "api_token";
    private static final String BASE_URL = "https://kassal.app/api/v1";

    public static final class Product {
        public String name = "";
        public String brand = "";
        public String store = "";
        public String ean = "";
        public String image = "";
        public String weightUnit = "";
        public double weight = 0;
        public Double price = null;

        public String subtitle() {
            List<String> parts = new ArrayList<>();
            if (!brand.isBlank()) parts.add(brand);
            if (!store.isBlank()) parts.add(store);
            if (price != null) parts.add(String.format(java.util.Locale.forLanguageTag("nb-NO"), "%.2f kr", price));
            return String.join(" · ", parts);
        }
    }

    private KassalApi() {}

    public static String getApiKey(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_TOKEN, "").trim();
    }

    public static void setApiKey(Context context, String token) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_TOKEN, token == null ? "" : token.trim()).apply();
    }

    public static boolean hasApiKey(Context context) {
        return !getApiKey(context).isEmpty();
    }

    public static List<Product> lookupEan(Context context, String ean) throws Exception {
        String clean = ean == null ? "" : ean.replaceAll("[^0-9]", "");
        if (clean.isEmpty()) throw new IllegalArgumentException("Strekkoden mangler EAN-nummer.");
        String token = getApiKey(context);
        if (token.isEmpty()) throw new IllegalStateException("Kassal.app API-nøkkel mangler. Legg den inn under Innstillinger → Kassal.app.");
        JSONObject root = requestJson(BASE_URL + "/products/ean/" + clean, token);
        JSONObject data = root.optJSONObject("data");
        JSONArray products = data == null ? null : data.optJSONArray("products");
        List<Product> result = new ArrayList<>();
        if (products == null) return result;
        for (int index = 0; index < products.length(); index++) {
            JSONObject o = products.optJSONObject(index);
            if (o == null) continue;
            Product p = new Product();
            p.name = o.optString("name", "").trim();
            p.brand = o.optString("brand", "").trim();
            p.ean = o.optString("ean", clean).trim();
            p.image = o.optString("image", "").trim();
            p.weight = o.optDouble("weight", 0);
            p.weightUnit = o.optString("weight_unit", "").trim();
            JSONObject store = o.optJSONObject("store");
            if (store != null) p.store = store.optString("name", "").trim();
            JSONObject currentPrice = o.optJSONObject("current_price");
            if (currentPrice != null && currentPrice.has("price") && !currentPrice.isNull("price")) {
                double value = currentPrice.optDouble("price", Double.NaN);
                if (Double.isFinite(value) && value > 0) p.price = value;
            }
            if (!p.name.isEmpty()) result.add(p);
        }
        result.sort(Comparator.comparing((Product p) -> p.price == null ? Double.MAX_VALUE : p.price)
                .thenComparing(p -> p.store == null ? "" : p.store));
        return result;
    }

    public static void testConnection(Context context) throws Exception {
        String token = getApiKey(context);
        if (token.isEmpty()) throw new IllegalStateException("Skriv inn API-nøkkelen først.");
        requestJson(BASE_URL + "/products?search=melk", token);
    }

    private static JSONObject requestJson(String address, String token) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(address).openConnection();
        connection.setRequestMethod("GET");
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(15000);
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("Authorization", "Bearer " + token);
        int status = connection.getResponseCode();
        InputStream stream = status >= 200 && status < 300 ? connection.getInputStream() : connection.getErrorStream();
        String body = readAll(stream);
        connection.disconnect();
        if (status == 401 || status == 403) throw new IllegalArgumentException("API-nøkkelen ble avvist av Kassal.app.");
        if (status == 429) throw new IllegalStateException("For mange forespørsler til Kassal.app. Prøv igjen om litt.");
        if (status < 200 || status >= 300) throw new IllegalStateException("Kassal.app svarte HTTP " + status + (body.isBlank() ? "" : "."));
        return new JSONObject(body);
    }

    private static String readAll(InputStream input) throws Exception {
        if (input == null) return "";
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(input, StandardCharsets.UTF_8))) {
            StringBuilder out = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) out.append(line);
            return out.toString();
        }
    }
}

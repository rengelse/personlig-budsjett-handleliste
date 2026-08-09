package no.personligbudsjett.handleliste;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Scanner;

public class UpdateManager {
    private static final String LATEST_API = "https://api.github.com/repos/rengelse/personlig-budsjett-handleliste/releases/latest";
    private static final String USER_AGENT = "PersonligBudsjettHandleliste/" + BuildConfig.VERSION_NAME;

    public static class ReleaseInfo {
        public String version;
        public String title;
        public String notes;
        public String apkUrl;
        public boolean updateAvailable;
    }

    public interface CheckCallback {
        void onSuccess(ReleaseInfo info);
        void onError(String message);
    }

    public interface DownloadCallback {
        void onProgress(int percent);
        void onSuccess(File apkFile);
        void onError(String message);
    }

    public static void checkAsync(CheckCallback callback) {
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(LATEST_API).openConnection();
                connection.setConnectTimeout(10000);
                connection.setReadTimeout(10000);
                connection.setRequestProperty("Accept", "application/vnd.github+json");
                connection.setRequestProperty("X-GitHub-Api-Version", "2022-11-28");
                connection.setRequestProperty("User-Agent", USER_AGENT);

                int code = connection.getResponseCode();
                if (code != HttpURLConnection.HTTP_OK) {
                    throw new IllegalStateException("GitHub svarte " + code);
                }

                String json;
                try (InputStream input = connection.getInputStream();
                     Scanner scanner = new Scanner(input, StandardCharsets.UTF_8.name()).useDelimiter("\\A")) {
                    json = scanner.hasNext() ? scanner.next() : "";
                }

                JSONObject release = new JSONObject(json);
                ReleaseInfo info = new ReleaseInfo();
                info.version = normalizeVersion(release.optString("tag_name", ""));
                info.title = release.optString("name", "Handleliste v" + info.version);
                info.notes = release.optString("body", "");
                info.apkUrl = findApkUrl(release.optJSONArray("assets"));
                info.updateAvailable = compareVersions(info.version, BuildConfig.VERSION_NAME) > 0;

                if (info.version.isEmpty()) throw new IllegalStateException("Release mangler versjonsnummer");
                if (info.updateAvailable && info.apkUrl.isEmpty()) throw new IllegalStateException("Release mangler handleliste.apk");
                callback.onSuccess(info);
            } catch (Exception e) {
                callback.onError(e.getMessage() == null ? "Kunne ikke kontrollere oppdateringer" : e.getMessage());
            } finally {
                if (connection != null) connection.disconnect();
            }
        }).start();
    }

    public static void downloadAsync(Context context, ReleaseInfo release, DownloadCallback callback) {
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                if (release == null || release.apkUrl == null || release.apkUrl.isEmpty()) {
                    throw new IllegalStateException("Nedlastingsadresse mangler");
                }
                File dir = new File(context.getCacheDir(), "updates");
                if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("Kunne ikke opprette oppdateringsmappe");
                File target = new File(dir, "handleliste.apk");
                if (target.exists() && !target.delete()) throw new IllegalStateException("Kunne ikke erstatte gammel oppdateringsfil");

                connection = (HttpURLConnection) new URL(release.apkUrl).openConnection();
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(30000);
                connection.setInstanceFollowRedirects(true);
                connection.setRequestProperty("User-Agent", USER_AGENT);
                int code = connection.getResponseCode();
                if (code < 200 || code >= 300) throw new IllegalStateException("Nedlasting svarte " + code);

                long total = connection.getContentLengthLong();
                try (BufferedInputStream input = new BufferedInputStream(connection.getInputStream());
                     BufferedOutputStream output = new BufferedOutputStream(new FileOutputStream(target))) {
                    byte[] buffer = new byte[64 * 1024];
                    long downloaded = 0;
                    int lastPercent = -1;
                    int read;
                    while ((read = input.read(buffer)) != -1) {
                        output.write(buffer, 0, read);
                        downloaded += read;
                        if (total > 0) {
                            int percent = (int) Math.min(100, (downloaded * 100L) / total);
                            if (percent != lastPercent) {
                                lastPercent = percent;
                                callback.onProgress(percent);
                            }
                        }
                    }
                }
                if (!target.exists() || target.length() < 1024) throw new IllegalStateException("Nedlastet APK er ugyldig");
                callback.onSuccess(target);
            } catch (Exception e) {
                callback.onError(e.getMessage() == null ? "Kunne ikke laste ned oppdateringen" : e.getMessage());
            } finally {
                if (connection != null) connection.disconnect();
            }
        }).start();
    }

    public static Intent unknownSourcesIntent(Context context) {
        return new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + context.getPackageName()));
    }

    public static Intent installIntent(Context context, File apkFile) {
        Uri uri = FileProvider.getUriForFile(context,
                context.getPackageName() + ".fileprovider", apkFile);
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return intent;
    }

    private static String findApkUrl(JSONArray assets) {
        if (assets == null) return "";
        for (int i = 0; i < assets.length(); i++) {
            JSONObject asset = assets.optJSONObject(i);
            if (asset == null) continue;
            if ("handleliste.apk".equalsIgnoreCase(asset.optString("name", ""))) {
                return asset.optString("browser_download_url", "");
            }
        }
        return "";
    }

    private static String normalizeVersion(String value) {
        String v = value == null ? "" : value.trim();
        v = v.replaceFirst("(?i)^mobile-v", "");
        v = v.replaceFirst("(?i)^v", "");
        return v;
    }

    static int compareVersions(String a, String b) {
        int[] av = versionParts(a);
        int[] bv = versionParts(b);
        int count = Math.max(av.length, bv.length);
        for (int i = 0; i < count; i++) {
            int ai = i < av.length ? av[i] : 0;
            int bi = i < bv.length ? bv[i] : 0;
            if (ai != bi) return Integer.compare(ai, bi);
        }
        return 0;
    }

    private static int[] versionParts(String value) {
        String clean = normalizeVersion(value).split("[-+]", 2)[0];
        String[] parts = clean.split("\\.");
        int[] out = new int[parts.length];
        for (int i = 0; i < parts.length; i++) {
            try { out[i] = Integer.parseInt(parts[i].replaceAll("[^0-9]", "")); }
            catch (Exception ignored) { out[i] = 0; }
        }
        return out;
    }
}

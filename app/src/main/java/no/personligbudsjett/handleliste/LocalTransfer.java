package no.personligbudsjett.handleliste;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public final class LocalTransfer {
    public enum Direction {
        RECEIVE_FROM_PC("/pb/send/"),
        SEND_TO_PC("/pb/receive/"),
        BARCODE_TO_PC("/pb/barcode/");

        final String pathPrefix;
        Direction(String pathPrefix) { this.pathPrefix = pathPrefix; }
    }

    public static final class HttpStatusException extends Exception {
        public final int statusCode;
        HttpStatusException(int statusCode, String message) {
            super(message);
            this.statusCode = statusCode;
        }
    }

    private LocalTransfer() {}

    public static URL validatePairingUrl(String raw, Direction direction) throws Exception {
        if (raw == null || raw.trim().isEmpty()) {
            throw new IllegalArgumentException("Tom QR-kode");
        }

        URI uri = new URI(raw.trim());
        if (!"http".equalsIgnoreCase(uri.getScheme())) {
            throw new IllegalArgumentException("QR-koden må bruke lokal HTTP");
        }
        if (uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null) {
            throw new IllegalArgumentException("Ugyldig pairing-adresse");
        }

        String host = uri.getHost();
        if (!isPrivateIpv4(host)) {
            throw new IllegalArgumentException("QR-koden peker ikke til en lokal IPv4-adresse");
        }

        String path = uri.getPath();
        if (path == null || !path.startsWith(direction.pathPrefix)) {
            if (direction == Direction.RECEIVE_FROM_PC) {
                throw new IllegalArgumentException("Dette er ikke en «Send til mobil»-QR fra Personlig Budsjett");
            } else if (direction == Direction.SEND_TO_PC) {
                throw new IllegalArgumentException("Dette er ikke en «Motta fra mobil»-QR fra Personlig Budsjett");
            } else {
                throw new IllegalArgumentException("Dette er ikke en «Skann til PC»-QR fra Personlig Budsjett");
            }
        }
        String token = path.substring(direction.pathPrefix.length());
        if (token.isEmpty() || token.contains("/") || !token.matches("[A-Za-z0-9_-]+")) {
            throw new IllegalArgumentException("Ugyldig pairing-token");
        }

        int port = uri.getPort();
        if (port == 0 || port < -1 || port > 65535) {
            throw new IllegalArgumentException("Ugyldig port i pairing-adressen");
        }
        return uri.toURL();
    }

    public static String getJson(URL url) throws Exception {
        HttpURLConnection connection = open(url);
        try {
            connection.setRequestMethod("GET");
            connection.setRequestProperty("Accept", "application/json");
            int status = connection.getResponseCode();
            String body = readBody(connection, status);
            if (status != HttpURLConnection.HTTP_OK) throw statusException(status, body);
            return body;
        } finally {
            connection.disconnect();
        }
    }

    public static String postJson(URL url, String json) throws Exception {
        HttpURLConnection connection = open(url);
        try {
            connection.setRequestMethod("POST");
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            connection.setRequestProperty("Accept", "application/json");
            byte[] data = json.getBytes(StandardCharsets.UTF_8);
            connection.setFixedLengthStreamingMode(data.length);
            try (OutputStream out = connection.getOutputStream()) {
                out.write(data);
            }
            int status = connection.getResponseCode();
            String body = readBody(connection, status);
            if (status != HttpURLConnection.HTTP_OK) throw statusException(status, body);
            return body;
        } finally {
            connection.disconnect();
        }
    }

    private static HttpURLConnection open(URL url) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(10000);
        connection.setUseCaches(false);
        return connection;
    }

    private static String readBody(HttpURLConnection connection, int status) throws Exception {
        InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
        if (stream == null) return "";
        try (InputStream in = stream; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int read;
            while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }

    private static HttpStatusException statusException(int status, String body) {
        String message;
        switch (status) {
            case 400: message = "Desktop avviste ugyldige PB-data"; break;
            case 404: message = "Pairing-koden er ugyldig, utløpt eller peker til feil adresse"; break;
            case 405: message = "Feil overføringsretning eller HTTP-metode"; break;
            case 410: message = "Pairing-sesjonen er utløpt eller allerede brukt"; break;
            default: message = "Desktop svarte med HTTP " + status; break;
        }
        if (body != null && !body.trim().isEmpty() && body.length() < 300) {
            message += "\n\n" + body.trim();
        }
        return new HttpStatusException(status, message);
    }

    private static boolean isPrivateIpv4(String host) {
        if (host == null) return false;
        String[] parts = host.split("\\.", -1);
        if (parts.length != 4) return false;
        int[] octets = new int[4];
        try {
            for (int i = 0; i < 4; i++) {
                if (parts[i].isEmpty() || parts[i].length() > 3) return false;
                octets[i] = Integer.parseInt(parts[i]);
                if (octets[i] < 0 || octets[i] > 255) return false;
            }
        } catch (NumberFormatException e) {
            return false;
        }
        return octets[0] == 10
                || (octets[0] == 172 && octets[1] >= 16 && octets[1] <= 31)
                || (octets[0] == 192 && octets[1] == 168)
                || (octets[0] == 169 && octets[1] == 254);
    }
}

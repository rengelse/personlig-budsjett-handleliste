package no.personligbudsjett.handleliste;

import android.app.AlertDialog;
import android.content.Intent;
import android.os.Bundle;
import android.text.InputType;
import android.view.View;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class MainActivity extends AppCompatActivity {
    private ShoppingStore store;
    private final List<ShoppingItem> items = new ArrayList<>();
    private String listName = "Handleliste";
    private ShoppingAdapter adapter;
    private TextView titleText;
    private TextView summaryText;

    private final ActivityResultLauncher<Intent> scannerLauncher =
            registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
                if (result.getResultCode() != RESULT_OK || result.getData() == null) return;
                String raw = result.getData().getStringExtra(ScannerActivity.EXTRA_QR);
                if (raw != null) importQr(raw);
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        store = new ShoppingStore(this);
        listName = store.getListName();
        items.addAll(store.loadItems());

        titleText = findViewById(R.id.titleText);
        summaryText = findViewById(R.id.summaryText);

        RecyclerView list = findViewById(R.id.list);
        list.setLayoutManager(new LinearLayoutManager(this));
        adapter = new ShoppingAdapter(new ShoppingAdapter.Listener() {
            @Override public void onCheckedChanged(ShoppingItem item, boolean checked) {
                item.checked = checked;
                saveAndRender();
            }
            @Override public void onEdit(ShoppingItem item) {
                editItem(item);
            }
        });
        list.setAdapter(adapter);

        findViewById(R.id.scanButton).setOnClickListener(v ->
                scannerLauncher.launch(new Intent(this, ScannerActivity.class)));
        findViewById(R.id.addButton).setOnClickListener(v -> editItem(null));
        findViewById(R.id.clearDoneButton).setOnClickListener(v -> clearDone());

        render();
    }

    private void importQr(String raw) {
        try {
            QrProtocol.Payload payload = QrProtocol.decode(raw);
            if (items.isEmpty()) {
                replaceWith(payload);
                return;
            }

            new AlertDialog.Builder(this)
                    .setTitle(payload.listName)
                    .setMessage(payload.items.size() + " varer mottatt. Hva vil du gjøre?")
                    .setPositiveButton("Erstatt liste", (d,w) -> replaceWith(payload))
                    .setNeutralButton("Slå sammen", (d,w) -> mergeWith(payload))
                    .setNegativeButton("Avbryt", null)
                    .show();
        } catch (Exception e) {
            new AlertDialog.Builder(this)
                    .setTitle("Kunne ikke lese handlelisten")
                    .setMessage(e.getMessage())
                    .setPositiveButton("OK", null)
                    .show();
        }
    }

    private void replaceWith(QrProtocol.Payload payload) {
        items.clear();
        items.addAll(payload.items);
        listName = payload.listName;
        saveAndRender();
    }

    private void mergeWith(QrProtocol.Payload payload) {
        for (ShoppingItem incoming : payload.items) {
            ShoppingItem existing = findMergeTarget(incoming);
            if (existing == null) items.add(incoming);
            else {
                existing.qty += incoming.qty;
                if (existing.estimatedPrice == null) existing.estimatedPrice = incoming.estimatedPrice;
                if (existing.store.isEmpty()) existing.store = incoming.store;
                existing.checked = false;
            }
        }
        listName = payload.listName;
        saveAndRender();
    }

    private ShoppingItem findMergeTarget(ShoppingItem incoming) {
        for (ShoppingItem existing : items) {
            if (!incoming.ean.isEmpty() && incoming.ean.equals(existing.ean)) return existing;
            if (incoming.name.equalsIgnoreCase(existing.name) &&
                    incoming.unit.equalsIgnoreCase(existing.unit)) return existing;
        }
        return null;
    }

    private void editItem(ShoppingItem item) {
        boolean isNew = item == null;
        ShoppingItem target = isNew ? new ShoppingItem() : item;

        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        int pad = dp(20);
        box.setPadding(pad, dp(6), pad, 0);

        EditText name = field("Vare", target.name);
        EditText qty = field("Mengde", target.qty > 0 ? String.valueOf(target.qty) : "");
        qty.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        EditText unit = field("Enhet (g, kg, stk ...)", target.unit);
        EditText category = field("Kategori", target.category);
        box.addView(name); box.addView(qty); box.addView(unit); box.addView(category);

        AlertDialog dialog = new AlertDialog.Builder(this)
                .setTitle(isNew ? "Legg til vare" : "Rediger vare")
                .setView(box)
                .setPositiveButton("Lagre", null)
                .setNegativeButton("Avbryt", null)
                .create();

        if (!isNew) dialog.setButton(AlertDialog.BUTTON_NEUTRAL, "Slett", (d,w) -> {});
        dialog.setOnShowListener(x -> {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
                String n = name.getText().toString().trim();
                if (n.isEmpty()) { name.setError("Skriv inn varenavn"); return; }
                target.name = n;
                target.qty = parse(qty.getText().toString());
                target.unit = unit.getText().toString().trim();
                target.category = category.getText().toString().trim();
                if (target.category.isEmpty()) target.category = "Annet";
                if (isNew) items.add(target);
                saveAndRender();
                dialog.dismiss();
            });
            if (!isNew) {
                dialog.getButton(AlertDialog.BUTTON_NEUTRAL).setVisibility(View.VISIBLE);
                dialog.getButton(AlertDialog.BUTTON_NEUTRAL).setText("Slett");
                dialog.getButton(AlertDialog.BUTTON_NEUTRAL).setOnClickListener(v -> {
                    items.remove(target);
                    saveAndRender();
                    dialog.dismiss();
                });
            }
        });
        dialog.show();
    }

    private EditText field(String hint, String value) {
        EditText e = new EditText(this);
        e.setHint(hint);
        e.setText(value == null ? "" : value);
        e.setSingleLine(true);
        e.setPadding(0, dp(8), 0, dp(8));
        return e;
    }

    private void clearDone() {
        long count = items.stream().filter(i -> i.checked).count();
        if (count == 0) return;
        new AlertDialog.Builder(this)
                .setTitle("Fjern ferdige varer?")
                .setMessage(count + " varer fjernes fra listen.")
                .setPositiveButton("Fjern", (d,w) -> {
                    items.removeIf(i -> i.checked);
                    saveAndRender();
                })
                .setNegativeButton("Avbryt", null)
                .show();
    }

    private void saveAndRender() {
        store.save(listName, items);
        render();
    }

    private void render() {
        titleText.setText(listName == null || listName.isEmpty() ? "Handleliste" : listName);

        long open = items.stream().filter(i -> !i.checked).count();
        double total = items.stream()
                .filter(i -> !i.checked && i.estimatedPrice != null)
                .mapToDouble(i -> i.estimatedPrice)
                .sum();
        boolean hasPrice = items.stream().anyMatch(i -> !i.checked && i.estimatedPrice != null);

        String summary = open + (open == 1 ? " vare" : " varer");
        if (hasPrice) {
            summary += " · ca. " + NumberFormat.getCurrencyInstance(new Locale("nb","NO")).format(total);
        }
        summaryText.setText(items.isEmpty() ? "Ingen aktiv liste" : summary);

        Map<String,List<ShoppingItem>> grouped = new LinkedHashMap<>();
        items.stream().filter(i -> !i.checked)
                .sorted(Comparator.comparing((ShoppingItem i) -> i.category, String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(i -> i.name, String.CASE_INSENSITIVE_ORDER))
                .forEach(i -> grouped.computeIfAbsent(i.category, k -> new ArrayList<>()).add(i));

        List<String> headers = new ArrayList<>();
        List<List<ShoppingItem>> groups = new ArrayList<>();
        for (Map.Entry<String,List<ShoppingItem>> e : grouped.entrySet()) {
            headers.add(e.getKey());
            groups.add(e.getValue());
        }

        List<ShoppingItem> done = new ArrayList<>();
        for (ShoppingItem item : items) if (item.checked) done.add(item);
        if (!done.isEmpty()) {
            headers.add("Ferdig (" + done.size() + ")");
            groups.add(done);
        }

        adapter.setRows(headers, groups);
    }

    private double parse(String text) {
        try { return Double.parseDouble(text.trim().replace(',', '.')); }
        catch (Exception e) { return 0; }
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}

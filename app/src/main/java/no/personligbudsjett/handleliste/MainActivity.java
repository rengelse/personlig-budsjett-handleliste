package no.personligbudsjett.handleliste;

import android.app.AlertDialog;
import android.content.Intent;
import android.os.Bundle;
import android.os.Build;
import android.widget.Button;
import android.widget.ProgressBar;
import android.content.pm.PackageManager;
import java.io.File;
import android.text.InputType;
import android.view.View;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
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
    private TextView progressText;
    private TextView progressPercent;
    private TextView totalItemsText;
    private TextView openPriceText;
    private TextView expectedTotalText;
    private android.widget.ProgressBar progressBar;
    private android.widget.Button groupStoreButton;
    private android.widget.Button groupCategoryButton;
    private boolean groupByStore = true;
    private View overviewPanel;
    private TextView overviewStatus;
    private TextView overviewStores;
    private View settingsPanel;
    private TextView settingsVersionText;
    private android.widget.Button navOverviewButton;
    private android.widget.Button navListButton;
    private android.widget.Button navScanButton;
    private android.widget.Button navSettingsButton;
    private TextView updateStatusText;
    private TextView latestVersionText;
    private Button releaseInfoButton;
    private Button checkUpdatesButton;
    private Button installUpdateButton;
    private ProgressBar updateDownloadProgress;
    private UpdateManager.ReleaseInfo latestRelease;
    private File pendingApk;
    private boolean automaticUpdateNoticeShown = false;

    private final ActivityResultLauncher<Intent> unknownSourcesLauncher =
            registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
                if (pendingApk == null) return;
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || getPackageManager().canRequestPackageInstalls()) {
                    launchInstaller(pendingApk);
                } else {
                    updateStatusText.setText("Tillat installasjon fra denne appen for å fortsette");
                }
            });

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

        View bottomNav = findViewById(R.id.bottomNav);
        final int bottomNavPaddingLeft = bottomNav.getPaddingLeft();
        final int bottomNavPaddingTop = bottomNav.getPaddingTop();
        final int bottomNavPaddingRight = bottomNav.getPaddingRight();
        final int bottomNavPaddingBottom = bottomNav.getPaddingBottom();

        ViewCompat.setOnApplyWindowInsetsListener(bottomNav, (view, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            view.setPadding(
                    bottomNavPaddingLeft,
                    bottomNavPaddingTop,
                    bottomNavPaddingRight,
                    bottomNavPaddingBottom + systemBars.bottom
            );
            return insets;
        });
        ViewCompat.requestApplyInsets(bottomNav);

        store = new ShoppingStore(this);
        listName = store.getListName();
        items.addAll(store.loadItems());

        titleText = findViewById(R.id.titleText);
        summaryText = findViewById(R.id.versionText);
        progressText = findViewById(R.id.progressText);
        progressPercent = findViewById(R.id.progressPercent);
        totalItemsText = findViewById(R.id.totalItemsText);
        openPriceText = findViewById(R.id.openPriceText);
        expectedTotalText = findViewById(R.id.expectedTotalText);
        progressBar = findViewById(R.id.progressBar);
        groupStoreButton = findViewById(R.id.groupStoreButton);
        groupCategoryButton = findViewById(R.id.groupCategoryButton);
        groupByStore = getPreferences(MODE_PRIVATE).getBoolean("group_by_store", true);
        overviewPanel = findViewById(R.id.overviewPanel);
        overviewStatus = findViewById(R.id.overviewStatus);
        overviewStores = findViewById(R.id.overviewStores);
        settingsPanel = findViewById(R.id.settingsPanel);
        settingsVersionText = findViewById(R.id.settingsVersionText);
        updateStatusText = findViewById(R.id.updateStatusText);
        latestVersionText = findViewById(R.id.latestVersionText);
        releaseInfoButton = findViewById(R.id.releaseInfoButton);
        checkUpdatesButton = findViewById(R.id.checkUpdatesButton);
        installUpdateButton = findViewById(R.id.installUpdateButton);
        updateDownloadProgress = findViewById(R.id.updateDownloadProgress);
        navOverviewButton = findViewById(R.id.navOverview);
        navListButton = findViewById(R.id.navList);
        navScanButton = findViewById(R.id.navScan);
        navSettingsButton = findViewById(R.id.navSettings);
        settingsVersionText.setText("v" + BuildConfig.VERSION_NAME);

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

        findViewById(R.id.addButton).setOnClickListener(v -> showQuickAdd());
        findViewById(R.id.clearDoneButton).setOnClickListener(v -> clearDone());
        groupStoreButton.setOnClickListener(v -> setGrouping(true));
        groupCategoryButton.setOnClickListener(v -> setGrouping(false));
        navScanButton.setOnClickListener(v ->
                scannerLauncher.launch(new Intent(this, ScannerActivity.class)));
        navOverviewButton.setOnClickListener(v -> showOverview());
        navListButton.setOnClickListener(v -> showList());
        navSettingsButton.setOnClickListener(v -> showSettings());
        findViewById(R.id.continueShoppingButton).setOnClickListener(v -> showList());
        checkUpdatesButton.setOnClickListener(v -> checkForUpdates(false));
        releaseInfoButton.setOnClickListener(v -> showReleaseInfo());
        installUpdateButton.setOnClickListener(v -> startUpdateDownload());

        render();
        checkForUpdates(true);
    }

    private void checkForUpdates(boolean automatic) {
        if (!automatic) {
            updateStatusText.setText("Ser etter oppdatering …");
            checkUpdatesButton.setEnabled(false);
        }
        UpdateManager.checkAsync(new UpdateManager.CheckCallback() {
            @Override public void onSuccess(UpdateManager.ReleaseInfo info) {
                runOnUiThread(() -> {
                    latestRelease = info;
                    latestVersionText.setText("v" + info.version);
                    releaseInfoButton.setEnabled(true);
                    checkUpdatesButton.setEnabled(true);
                    if (info.updateAvailable) {
                        updateStatusText.setText("Ny versjon v" + info.version + " tilgjengelig");
                        installUpdateButton.setVisibility(View.VISIBLE);
                        navSettingsButton.setText("⚙  •\nInnstillinger");
                        if (automatic && !automaticUpdateNoticeShown) {
                            automaticUpdateNoticeShown = true;
                            android.widget.Toast.makeText(MainActivity.this,
                                    "Ny versjon v" + info.version + " er tilgjengelig",
                                    android.widget.Toast.LENGTH_LONG).show();
                        }
                    } else {
                        updateStatusText.setText("Oppdatert");
                        installUpdateButton.setVisibility(View.GONE);
                        navSettingsButton.setText("⚙\nInnstillinger");
                    }
                });
            }

            @Override public void onError(String message) {
                runOnUiThread(() -> {
                    checkUpdatesButton.setEnabled(true);
                    if (!automatic || settingsPanel.getVisibility() == View.VISIBLE) {
                        updateStatusText.setText("Kunne ikke sjekke: " + message);
                    }
                });
            }
        });
    }

    private void showReleaseInfo() {
        if (latestRelease == null) return;
        String notes = latestRelease.notes == null ? "" : latestRelease.notes.trim();
        if (notes.isEmpty()) notes = "Ingen release-info er publisert for denne versjonen.";
        AlertDialog.Builder builder = new AlertDialog.Builder(this)
                .setTitle(latestRelease.title == null || latestRelease.title.trim().isEmpty()
                        ? "Handleliste v" + latestRelease.version : latestRelease.title)
                .setMessage(notes)
                .setNegativeButton("Lukk", null);
        if (latestRelease.updateAvailable) {
            builder.setPositiveButton("Oppdater", (dialog, which) -> startUpdateDownload());
        }
        builder.show();
    }

    private void startUpdateDownload() {
        if (latestRelease == null || !latestRelease.updateAvailable) return;
        installUpdateButton.setEnabled(false);
        checkUpdatesButton.setEnabled(false);
        releaseInfoButton.setEnabled(false);
        updateDownloadProgress.setProgress(0);
        updateDownloadProgress.setVisibility(View.VISIBLE);
        updateStatusText.setText("Laster ned oppdatering 0 %");

        UpdateManager.downloadAsync(this, latestRelease, new UpdateManager.DownloadCallback() {
            @Override public void onProgress(int percent) {
                runOnUiThread(() -> {
                    updateDownloadProgress.setProgress(percent);
                    updateStatusText.setText("Laster ned oppdatering " + percent + " %");
                });
            }

            @Override public void onSuccess(File apkFile) {
                runOnUiThread(() -> {
                    pendingApk = apkFile;
                    updateDownloadProgress.setProgress(100);
                    updateStatusText.setText("Oppdatering klar – åpner installasjon");
                    requestInstall(apkFile);
                });
            }

            @Override public void onError(String message) {
                runOnUiThread(() -> {
                    updateStatusText.setText("Oppdateringen kunne ikke lastes ned: " + message);
                    updateDownloadProgress.setVisibility(View.GONE);
                    installUpdateButton.setEnabled(true);
                    checkUpdatesButton.setEnabled(true);
                    releaseInfoButton.setEnabled(true);
                });
            }
        });
    }

    private void requestInstall(File apkFile) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getPackageManager().canRequestPackageInstalls()) {
            updateStatusText.setText("Tillat installasjon fra denne appen for å fortsette");
            unknownSourcesLauncher.launch(UpdateManager.unknownSourcesIntent(this));
            return;
        }
        launchInstaller(apkFile);
    }

    private void launchInstaller(File apkFile) {
        try {
            startActivity(UpdateManager.installIntent(this, apkFile));
        } catch (Exception e) {
            updateStatusText.setText("Kunne ikke åpne Android-installasjonen");
            installUpdateButton.setEnabled(true);
            checkUpdatesButton.setEnabled(true);
            releaseInfoButton.setEnabled(true);
        }
    }

    private void showOverview() {
        findViewById(R.id.topScroll).setVisibility(View.GONE);
        findViewById(R.id.list).setVisibility(View.GONE);
        ((View)findViewById(R.id.addButton).getParent()).setVisibility(View.GONE);
        settingsPanel.setVisibility(View.GONE);
        overviewPanel.setVisibility(View.VISIBLE);
        setActiveNav(navOverviewButton);
    }

    private void showList() {
        overviewPanel.setVisibility(View.GONE);
        settingsPanel.setVisibility(View.GONE);
        findViewById(R.id.topScroll).setVisibility(View.VISIBLE);
        findViewById(R.id.list).setVisibility(View.VISIBLE);
        ((View)findViewById(R.id.addButton).getParent()).setVisibility(View.VISIBLE);
        setActiveNav(navListButton);
    }

    private void showSettings() {
        overviewPanel.setVisibility(View.GONE);
        findViewById(R.id.topScroll).setVisibility(View.GONE);
        findViewById(R.id.list).setVisibility(View.GONE);
        ((View)findViewById(R.id.addButton).getParent()).setVisibility(View.GONE);
        settingsPanel.setVisibility(View.VISIBLE);
        setActiveNav(navSettingsButton);
    }

    private void setActiveNav(android.widget.Button active) {
        android.widget.Button[] buttons = {navOverviewButton, navListButton, navScanButton, navSettingsButton};
        for (android.widget.Button button : buttons) {
            boolean selected = button == active;
            button.setTextColor(ContextCompat.getColor(this, selected ? R.color.pb_primary : R.color.pb_muted));
            button.setTypeface(button.getTypeface(), selected ? android.graphics.Typeface.BOLD : android.graphics.Typeface.NORMAL);
        }
    }

    private void showQuickAdd() {
        View view = getLayoutInflater().inflate(R.layout.dialog_add_item, null);
        android.widget.EditText search = view.findViewById(R.id.quickSearch);
        android.widget.LinearLayout most = view.findViewById(R.id.mostUsedContainer);
        android.widget.LinearLayout recent = view.findViewById(R.id.recentContainer);

        android.content.SharedPreferences prefs = getSharedPreferences("item_usage", MODE_PRIVATE);
        java.util.List<String> names = new java.util.ArrayList<>();
        for (ShoppingItem item : items) if (item.name != null && !item.name.trim().isEmpty() && !names.contains(item.name)) names.add(item.name);
        names.sort((a,b) -> Integer.compare(prefs.getInt("count_"+b,0), prefs.getInt("count_"+a,0)));

        for (int i=0; i<Math.min(5,names.size()); i++) addQuickButton(most, names.get(i), search);
        java.util.List<String> rev = new java.util.ArrayList<>(names);
        java.util.Collections.reverse(rev);
        for (int i=0; i<Math.min(4,rev.size()); i++) addQuickButton(recent, rev.get(i), search);

        AlertDialog dialog = new AlertDialog.Builder(this)
                .setView(view)
                .setNegativeButton("Avbryt", null)
                .setPositiveButton("Legg til", null)
                .create();
        dialog.setOnShowListener(d -> dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
            String name = search.getText().toString().trim();
            if (name.isEmpty()) return;
            ShoppingItem item = new ShoppingItem();
            item.name = name;
            item.qty = 1;
            item.unit = "stk";
            items.add(item);
            prefs.edit().putInt("count_"+name, prefs.getInt("count_"+name,0)+1)
                    .putString("last_"+System.currentTimeMillis(), name).apply();
            saveAndRender();
            dialog.dismiss();
        }));
        dialog.show();
    }

    private void addQuickButton(android.widget.LinearLayout parent, String name, android.widget.EditText search) {
        android.widget.Button b = new android.widget.Button(this);
        b.setText(name);
        b.setAllCaps(false);
        b.setOnClickListener(v -> search.setText(name));
        parent.addView(b, new android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT));
    }

    private void setGrouping(boolean byStore) {
        groupByStore = byStore;
        getPreferences(MODE_PRIVATE).edit().putBoolean("group_by_store", byStore).apply();
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
        box.setPadding(pad, dp(8), pad, 0);

        TextView nameLabel = dialogLabel("Vare");
        EditText name = field("", target.name);
        name.setHint("Varenavn");
        box.addView(nameLabel);
        box.addView(name);

        LinearLayout amountRow = new LinearLayout(this);
        amountRow.setOrientation(LinearLayout.HORIZONTAL);
        amountRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
        amountRow.setPadding(0, dp(10), 0, 0);

        LinearLayout qtyBox = new LinearLayout(this);
        qtyBox.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams qtyBoxLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.7f);
        qtyBoxLp.setMarginEnd(dp(12));
        qtyBox.setLayoutParams(qtyBoxLp);
        qtyBox.addView(dialogLabel("Mengde"));

        LinearLayout stepper = new LinearLayout(this);
        stepper.setOrientation(LinearLayout.HORIZONTAL);
        stepper.setGravity(android.view.Gravity.CENTER_VERTICAL);

        android.widget.Button minus = new android.widget.Button(this);
        minus.setText("−");
        minus.setTextSize(20);
        minus.setAllCaps(false);
        minus.setMinWidth(dp(48));

        EditText qty = field("", target.qty > 0 ? formatQty(target.qty) : "1");
        qty.setGravity(android.view.Gravity.CENTER);
        qty.setSelectAllOnFocus(true);
        qty.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        LinearLayout.LayoutParams qtyLp = new LinearLayout.LayoutParams(0, dp(52), 1f);
        qtyLp.setMargins(dp(5), 0, dp(5), 0);
        qty.setLayoutParams(qtyLp);

        android.widget.Button plus = new android.widget.Button(this);
        plus.setText("+");
        plus.setTextSize(20);
        plus.setAllCaps(false);
        plus.setMinWidth(dp(48));

        stepper.addView(minus, new LinearLayout.LayoutParams(dp(52), dp(52)));
        stepper.addView(qty);
        stepper.addView(plus, new LinearLayout.LayoutParams(dp(52), dp(52)));
        qtyBox.addView(stepper);

        LinearLayout unitBox = new LinearLayout(this);
        unitBox.setOrientation(LinearLayout.VERTICAL);
        unitBox.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));
        unitBox.addView(dialogLabel("Enhet"));

        android.widget.Spinner unit = new android.widget.Spinner(this);
        String[] units = {"stk", "g", "kg", "ml", "dl", "l", "pk", "pose", "boks"};
        android.widget.ArrayAdapter<String> unitAdapter = new android.widget.ArrayAdapter<>(
                this, android.R.layout.simple_spinner_dropdown_item, units);
        unit.setAdapter(unitAdapter);
        unit.setMinimumHeight(dp(52));
        String currentUnit = target.unit == null ? "" : target.unit.trim();
        int unitIndex = 0;
        for (int i = 0; i < units.length; i++) {
            if (units[i].equalsIgnoreCase(currentUnit)) { unitIndex = i; break; }
        }
        unit.setSelection(unitIndex);
        unitBox.addView(unit, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(52)));

        amountRow.addView(qtyBox);
        amountRow.addView(unitBox);
        box.addView(amountRow);

        TextView categoryLabel = dialogLabel("Kategori");
        EditText category = field("", target.category);
        category.setHint("Kategori");
        LinearLayout.LayoutParams categoryLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        categoryLp.topMargin = dp(10);
        categoryLabel.setLayoutParams(categoryLp);
        box.addView(categoryLabel);
        box.addView(category);

        minus.setOnClickListener(v -> adjustQty(qty, -1));
        plus.setOnClickListener(v -> adjustQty(qty, 1));

        AlertDialog.Builder builder = new AlertDialog.Builder(this)
                .setTitle(isNew ? "Legg til vare" : "Rediger vare")
                .setView(box)
                .setPositiveButton("Lagre", null)
                .setNegativeButton("Avbryt", null);
        if (!isNew) builder.setNeutralButton("Slett", null);

        AlertDialog dialog = builder.create();
        dialog.setOnShowListener(x -> {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
                String n = name.getText().toString().trim();
                if (n.isEmpty()) { name.setError("Skriv inn varenavn"); return; }
                target.name = n;
                target.qty = parse(qty.getText().toString());
                target.unit = String.valueOf(unit.getSelectedItem());
                target.category = category.getText().toString().trim();
                if (target.category.isEmpty()) target.category = "Annet";
                if (isNew) items.add(target);
                saveAndRender();
                dialog.dismiss();
            });
            if (!isNew) {
                dialog.getButton(AlertDialog.BUTTON_NEUTRAL).setOnClickListener(v -> {
                    items.remove(target);
                    saveAndRender();
                    dialog.dismiss();
                });
            }
        });
        dialog.show();
    }

    private TextView dialogLabel(String text) {
        TextView label = new TextView(this);
        label.setText(text);
        label.setTextSize(13);
        label.setTypeface(label.getTypeface(), android.graphics.Typeface.BOLD);
        label.setPadding(0, dp(4), 0, dp(4));
        return label;
    }

    private String formatQty(double value) {
        if (value == Math.rint(value)) return String.valueOf((long) value);
        return String.valueOf(value).replace('.', ',');
    }

    private void adjustQty(EditText field, int direction) {
        double current = parse(field.getText().toString());
        if (current <= 0) current = 1;
        double next = Math.max(0.1, current + direction);
        field.setText(formatQty(next));
        field.setSelection(field.getText().length());
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
        titleText.setText("Handleliste");

        long open = items.stream().filter(i -> !i.checked).count();
        long doneCount = items.size() - open;

        double openTotal = items.stream()
                .filter(i -> !i.checked && i.estimatedPrice != null)
                .mapToDouble(i -> i.estimatedPrice)
                .sum();

        double expectedTotal = items.stream()
                .filter(i -> i.estimatedPrice != null)
                .mapToDouble(i -> i.estimatedPrice)
                .sum();

        boolean hasAnyPrice = items.stream().anyMatch(i -> i.estimatedPrice != null);
        NumberFormat money = NumberFormat.getCurrencyInstance(new Locale("nb","NO"));

        summaryText.setText("Versjon " + BuildConfig.VERSION_NAME);

        int percent = items.isEmpty() ? 0 : (int)Math.round((doneCount * 100.0) / items.size());
        progressText.setText(doneCount + " av " + items.size() + " handlet");
        progressPercent.setText(percent + "%");
        progressBar.setProgress(percent);

        totalItemsText.setText("Totalt " + items.size() + (items.size()==1 ? " vare" : " varer"));
        openPriceText.setText(hasAnyPrice ? money.format(openTotal) : "—");
        expectedTotalText.setText(hasAnyPrice ? money.format(expectedTotal) : "—");

        groupStoreButton.setBackgroundResource(groupByStore ? R.drawable.bg_chip_active : R.drawable.bg_chip);
        groupCategoryButton.setBackgroundResource(groupByStore ? R.drawable.bg_chip : R.drawable.bg_chip_active);
        groupStoreButton.setTextColor(ContextCompat.getColor(this, groupByStore ? R.color.pb_primary_text : R.color.pb_text));
        groupCategoryButton.setTextColor(ContextCompat.getColor(this, groupByStore ? R.color.pb_text : R.color.pb_primary_text));

        Map<String,List<ShoppingItem>> grouped = new LinkedHashMap<>();
        items.stream()
                .filter(i -> !i.checked)
                .sorted(Comparator
                        .comparing((ShoppingItem i) -> groupKey(i), String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(i -> i.name, String.CASE_INSENSITIVE_ORDER))
                .forEach(i -> grouped.computeIfAbsent(groupKey(i), k -> new ArrayList<>()).add(i));

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

        java.util.Set<String> storeSet = new java.util.TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        int missingPrice = 0;
        java.util.Map<String,Double> storeTotals = new java.util.TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        for (ShoppingItem item : items) {
            String s = item.store == null ? "" : item.store.trim();
            if (!s.isEmpty()) {
                storeSet.add(s);
                if (item.estimatedPrice != null) storeTotals.put(s, storeTotals.getOrDefault(s, 0.0) + item.estimatedPrice);
            }
            if (item.estimatedPrice == null) missingPrice++;
        }
        overviewStatus.setText(doneCount + " av " + items.size() + " handlet\n" +
                "Forventet totalpris: " + (hasAnyPrice ? money.format(expectedTotal) : "—") + "\n" +
                "Gjenstår: " + (hasAnyPrice ? money.format(openTotal) : "—") + "\n" +
                "Mangler pris: " + missingPrice);
        StringBuilder storeInfo = new StringBuilder("Butikker: " + storeSet.size());
        for (java.util.Map.Entry<String,Double> e : storeTotals.entrySet()) {
            storeInfo.append("\n").append(e.getKey()).append("  ·  ").append(money.format(e.getValue()));
        }
        overviewStores.setText(storeInfo.toString());

        adapter.setGroupingByStore(groupByStore);
        adapter.setRows(headers, groups);
    }

    private String groupKey(ShoppingItem item) {
        if (groupByStore) {
            String store = item.store == null ? "" : item.store.trim();
            return store.isEmpty() ? "Butikk ikke valgt" : store;
        }
        String category = item.category == null ? "" : item.category.trim();
        return category.isEmpty() ? "Annet" : category;
    }

    private double parse(String text) {
        try { return Double.parseDouble(text.trim().replace(',', '.')); }
        catch (Exception e) { return 0; }
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}

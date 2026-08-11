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
import android.widget.ScrollView;
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
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.net.URL;

import org.json.JSONObject;

public class MainActivity extends AppCompatActivity {
    private enum TransferMode { NONE, RECEIVE_FROM_PC, SEND_TO_PC }

    private TransferMode pendingTransferMode = TransferMode.NONE;
    private ShoppingTrip pendingTransferTrip = null;
    private ShoppingStore store;
    private ShoppingTrip activeTrip;
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
    private TextView actualTotalText;
    private Button editActualTotalButton;
    private Button completeTripButton;
    private android.widget.ProgressBar progressBar;
    private android.widget.Button groupStoreButton;
    private android.widget.Button groupCategoryButton;
    private Button clearDoneButton;
    private View progressCard;
    private View groupingControls;
    private View actionBar;
    private View emptyState;
    private boolean groupByStore = true;
    private boolean hideDone = false;
    private View overviewPanel;
    private View transferPanel;
    private TextView overviewStatus;
    private TextView overviewStores;
    private LinearLayout historyContainer;
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
                TransferMode mode = pendingTransferMode;
                ShoppingTrip trip = pendingTransferTrip;
                pendingTransferMode = TransferMode.NONE;
                pendingTransferTrip = null;
                if (result.getResultCode() != RESULT_OK || result.getData() == null) return;
                String raw = result.getData().getStringExtra(ScannerActivity.EXTRA_QR);
                if (raw == null) return;
                if (mode == TransferMode.RECEIVE_FROM_PC) receiveFromPc(raw);
                else if (mode == TransferMode.SEND_TO_PC && trip != null) sendTripToPc(trip, raw);
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
        activeTrip = store.loadActiveTrip();
        if (activeTrip != null) {
            listName = activeTrip.listName;
            items.addAll(activeTrip.items);
        }

        titleText = findViewById(R.id.titleText);
        summaryText = findViewById(R.id.versionText);
        progressText = findViewById(R.id.progressText);
        progressPercent = findViewById(R.id.progressPercent);
        totalItemsText = findViewById(R.id.totalItemsText);
        openPriceText = findViewById(R.id.openPriceText);
        expectedTotalText = findViewById(R.id.expectedTotalText);
        actualTotalText = findViewById(R.id.actualTotalText);
        editActualTotalButton = findViewById(R.id.editActualTotalButton);
        completeTripButton = findViewById(R.id.completeTripButton);
        progressBar = findViewById(R.id.progressBar);
        groupStoreButton = findViewById(R.id.groupStoreButton);
        groupCategoryButton = findViewById(R.id.groupCategoryButton);
        clearDoneButton = findViewById(R.id.clearDoneButton);
        progressCard = findViewById(R.id.progressCard);
        groupingControls = findViewById(R.id.groupingControls);
        actionBar = findViewById(R.id.actionBar);
        emptyState = findViewById(R.id.emptyState);
        groupByStore = getPreferences(MODE_PRIVATE).getBoolean("group_by_store", true);
        hideDone = getPreferences(MODE_PRIVATE).getBoolean("hide_done", false);
        overviewPanel = findViewById(R.id.overviewPanel);
        transferPanel = findViewById(R.id.transferPanel);
        overviewStatus = findViewById(R.id.overviewStatus);
        overviewStores = findViewById(R.id.overviewStores);
        historyContainer = findViewById(R.id.historyContainer);
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
        findViewById(R.id.emptyAddButton).setOnClickListener(v -> showQuickAdd());
        findViewById(R.id.emptyReceiveButton).setOnClickListener(v -> startReceiveFromPc());
        clearDoneButton.setOnClickListener(v -> clearDone());
        editActualTotalButton.setOnClickListener(v -> editActualTotal());
        completeTripButton.setOnClickListener(v -> completeCurrentTrip());
        groupStoreButton.setOnClickListener(v -> setGrouping(true));
        groupCategoryButton.setOnClickListener(v -> setGrouping(false));
        navScanButton.setOnClickListener(v -> showTransfer());
        findViewById(R.id.transferReceiveButton).setOnClickListener(v -> startReceiveFromPc());
        findViewById(R.id.transferHistoryButton).setOnClickListener(v -> showOverview());
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
        actionBar.setVisibility(View.GONE);
        emptyState.setVisibility(View.GONE);
        settingsPanel.setVisibility(View.GONE);
        transferPanel.setVisibility(View.GONE);
        overviewPanel.setVisibility(View.VISIBLE);
        renderHistory();
        setActiveNav(navOverviewButton);
    }

    private void showList() {
        overviewPanel.setVisibility(View.GONE);
        transferPanel.setVisibility(View.GONE);
        settingsPanel.setVisibility(View.GONE);
        findViewById(R.id.topScroll).setVisibility(View.VISIBLE);
        applyListEmptyState();
        setActiveNav(navListButton);
    }

    private void showTransfer() {
        overviewPanel.setVisibility(View.GONE);
        settingsPanel.setVisibility(View.GONE);
        findViewById(R.id.topScroll).setVisibility(View.GONE);
        findViewById(R.id.list).setVisibility(View.GONE);
        actionBar.setVisibility(View.GONE);
        emptyState.setVisibility(View.GONE);
        transferPanel.setVisibility(View.VISIBLE);
        setActiveNav(navScanButton);
    }

    private void showSettings() {
        overviewPanel.setVisibility(View.GONE);
        transferPanel.setVisibility(View.GONE);
        findViewById(R.id.topScroll).setVisibility(View.GONE);
        findViewById(R.id.list).setVisibility(View.GONE);
        actionBar.setVisibility(View.GONE);
        emptyState.setVisibility(View.GONE);
        settingsPanel.setVisibility(View.VISIBLE);
        setActiveNav(navSettingsButton);
    }

    private void applyListEmptyState() {
        boolean empty = items.isEmpty();
        if (progressCard != null) progressCard.setVisibility(empty ? View.GONE : View.VISIBLE);
        if (groupingControls != null) groupingControls.setVisibility(empty ? View.GONE : View.VISIBLE);
        if (emptyState != null) emptyState.setVisibility(empty ? View.VISIBLE : View.GONE);
        findViewById(R.id.list).setVisibility(empty ? View.GONE : View.VISIBLE);
        if (actionBar != null) actionBar.setVisibility(empty ? View.GONE : View.VISIBLE);
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
        android.widget.LinearLayout recent = view.findViewById(R.id.recentList);
        android.widget.LinearLayout common = view.findViewById(R.id.commonList);
        android.widget.LinearLayout most = view.findViewById(R.id.mostList);
        android.widget.LinearLayout categoryGrid = view.findViewById(R.id.categoryGrid);
        View commonPanel = view.findViewById(R.id.commonPanel);
        View categoriesPanel = view.findViewById(R.id.categoriesPanel);
        View mostPanel = view.findViewById(R.id.mostPanel);
        android.widget.Button tabCommon = view.findViewById(R.id.tabCommon);
        android.widget.Button tabCategories = view.findViewById(R.id.tabCategories);
        android.widget.Button tabMost = view.findViewById(R.id.tabMost);

        android.content.SharedPreferences prefs = getSharedPreferences("item_usage", MODE_PRIVATE);
        migrateLegacyItemUsage(prefs);
        java.util.List<String> names = getUsageNames(prefs);
        java.util.List<String> recentlyUsed = new java.util.ArrayList<>(names);
        recentlyUsed.sort((a, b) -> Long.compare(prefs.getLong("last_used_" + b, 0L), prefs.getLong("last_used_" + a, 0L)));
        for (int i = 0; i < Math.min(6, recentlyUsed.size()); i++) addSuggestionRow(recent, recentlyUsed.get(i), "", search, prefs);

        String[][] commonItems = {
                {"Melk","Meieri"},{"Brød","Bakeri"},{"Egg","Meieri"},{"Smør","Meieri"},
                {"Kjøttdeig","Kjøtt"},{"Poteter","Frukt og grønt"},{"Tomater","Frukt og grønt"},{"Ost","Meieri"},
                {"Bananer","Frukt og grønt"},{"Ris","Tørrvarer"},{"Pasta","Tørrvarer"},{"Kaffe","Drikke"}
        };
        for (String[] item : commonItems) addSuggestionRow(common, item[0], item[1], search, prefs);

        java.util.List<String> mostUsed = new java.util.ArrayList<>(names);
        mostUsed.sort((a, b) -> {
            int c = Integer.compare(prefs.getInt("count_" + b, 0), prefs.getInt("count_" + a, 0));
            return c != 0 ? c : Long.compare(prefs.getLong("last_used_" + b, 0L), prefs.getLong("last_used_" + a, 0L));
        });
        for (String name : mostUsed) addSuggestionRow(most, name, "", search, prefs);
        if (mostUsed.isEmpty()) { TextView t = new TextView(this); t.setText("Mest brukte varer dukker opp her etter hvert."); t.setTextColor(ContextCompat.getColor(this,R.color.pb_muted)); t.setPadding(0,dp(16),0,0); most.addView(t); }

        String[][] cats = {{"🥬","Frukt & grønt"},{"🥛","Meieri & egg"},{"🥩","Kjøtt"},{"🍞","Bakeri"},{"❄","Frys"},{"🥫","Tørrvarer"},{"🥤","Drikke"},{"🍽","Ferdigmat"}};
        for (int r=0;r<cats.length;r+=2) {
            LinearLayout row = new LinearLayout(this); row.setOrientation(LinearLayout.HORIZONTAL);
            for (int k=0;k<2 && r+k<cats.length;k++) {
                String[] cat=cats[r+k]; android.widget.Button b=new android.widget.Button(this);
                b.setText(cat[0]+"  "+cat[1]); b.setAllCaps(false); b.setGravity(android.view.Gravity.START|android.view.Gravity.CENTER_VERTICAL);
                b.setTextColor(ContextCompat.getColor(this,R.color.pb_text)); b.setBackgroundResource(R.drawable.bg_card);
                LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,dp(72),1f); lp.setMargins(k==0?0:dp(5),dp(5),k==0?dp(5):0,dp(5)); row.addView(b,lp);
                b.setOnClickListener(v -> { populateCategoryProducts(common, cat[1], search, prefs); search.setText(""); search.setHint(cat[1]+" – skriv vare"); commonPanel.setVisibility(View.VISIBLE); categoriesPanel.setVisibility(View.GONE); mostPanel.setVisibility(View.GONE); switchQuickTab(commonPanel,categoriesPanel,mostPanel,tabCommon,tabCategories,tabMost,0); });
            }
            categoryGrid.addView(row);
        }

        AlertDialog dialog = new AlertDialog.Builder(this).setView(view).create();
        dialog.setOnShowListener(d -> {
            if (dialog.getWindow()!=null) dialog.getWindow().setLayout(android.view.ViewGroup.LayoutParams.MATCH_PARENT, android.view.ViewGroup.LayoutParams.MATCH_PARENT);
        });
        view.findViewById(R.id.quickBack).setOnClickListener(v -> dialog.dismiss());
        View.OnClickListener commonTab = v -> switchQuickTab(commonPanel,categoriesPanel,mostPanel,tabCommon,tabCategories,tabMost,0);
        tabCommon.setOnClickListener(commonTab);
        tabCategories.setOnClickListener(v -> switchQuickTab(commonPanel,categoriesPanel,mostPanel,tabCommon,tabCategories,tabMost,1));
        tabMost.setOnClickListener(v -> switchQuickTab(commonPanel,categoriesPanel,mostPanel,tabCommon,tabCategories,tabMost,2));
        search.setOnEditorActionListener((v, actionId, event) -> { String n=search.getText().toString().trim(); if(n.isEmpty()) return false; addQuickItem(n,"",prefs); dialog.dismiss(); return true; });
        dialog.show();
        if (dialog.getWindow()!=null) { dialog.getWindow().setLayout(android.view.ViewGroup.LayoutParams.MATCH_PARENT, android.view.ViewGroup.LayoutParams.MATCH_PARENT); dialog.getWindow().setBackgroundDrawableResource(R.color.pb_background); }
    }

    private void switchQuickTab(View common, View cats, View most, android.widget.Button a, android.widget.Button b, android.widget.Button c, int selected) {
        common.setVisibility(selected==0?View.VISIBLE:View.GONE); cats.setVisibility(selected==1?View.VISIBLE:View.GONE); most.setVisibility(selected==2?View.VISIBLE:View.GONE);
        android.widget.Button[] bs={a,b,c}; for(int i=0;i<bs.length;i++){ bs[i].setTextColor(ContextCompat.getColor(this,i==selected?R.color.pb_primary:R.color.pb_muted)); bs[i].setTypeface(bs[i].getTypeface(),i==selected?android.graphics.Typeface.BOLD:android.graphics.Typeface.NORMAL); }
    }

    private void populateCategoryProducts(android.widget.LinearLayout parent, String category, android.widget.EditText search, android.content.SharedPreferences prefs) {
        parent.removeAllViews();
        String[] products;
        switch (category) {
            case "Frukt & grønt": products=new String[]{"Bananer","Epler","Tomater","Agurk","Paprika","Poteter","Løk","Gulrøtter"}; break;
            case "Meieri & egg": products=new String[]{"Melk","Egg","Smør","Ost","Yoghurt","Fløte","Rømme"}; break;
            case "Kjøtt": products=new String[]{"Kjøttdeig","Kyllingfilet","Bacon","Pølser","Karbonadedeig"}; break;
            case "Bakeri": products=new String[]{"Brød","Rundstykker","Tortilla","Knekkebrød"}; break;
            case "Frys": products=new String[]{"Frosne grønnsaker","Pizza","Is","Fiskefileter","Bær"}; break;
            case "Tørrvarer": products=new String[]{"Ris","Pasta","Mel","Sukker","Havregryn","Hermetiske tomater"}; break;
            case "Drikke": products=new String[]{"Kaffe","Te","Juice","Mineralvann","Saft"}; break;
            default: products=new String[]{"Middag","Suppe","Salat","Pålegg"};
        }
        for (String product : products) addSuggestionRow(parent, product, category, search, prefs);
    }

    private void addSuggestionRow(android.widget.LinearLayout parent, String name, String category, android.widget.EditText search, android.content.SharedPreferences prefs) {
        LinearLayout row=new LinearLayout(this); row.setGravity(android.view.Gravity.CENTER_VERTICAL); row.setPadding(0,dp(4),0,dp(4));
        android.widget.Button plus=new android.widget.Button(this); plus.setText("+"); plus.setTextSize(24); plus.setTextColor(ContextCompat.getColor(this,R.color.pb_primary_text)); plus.setBackgroundResource(R.drawable.bg_primary);
        row.addView(plus,new LinearLayout.LayoutParams(dp(48),dp(48)));
        TextView label=new TextView(this); label.setText(name); label.setTextSize(18); label.setTextColor(ContextCompat.getColor(this,R.color.pb_text)); label.setGravity(android.view.Gravity.CENTER_VERTICAL); label.setPadding(dp(16),0,0,0);
        row.addView(label,new LinearLayout.LayoutParams(0,dp(58),1f));
        View.OnClickListener add=v -> addQuickItem(name,category,prefs); plus.setOnClickListener(add); label.setOnClickListener(add); parent.addView(row);
    }

    private void addQuickItem(String name, String category, android.content.SharedPreferences prefs) {
        ensureActiveTrip(); ShoppingItem item=new ShoppingItem(); item.name=name; item.qty=1; item.unit="stk"; item.category=category==null?"":category; items.add(item); recordItemUsage(prefs,name); saveAndRender();
        android.widget.Toast.makeText(this,name+" lagt til",android.widget.Toast.LENGTH_SHORT).show();
    }

    private java.util.List<String> getUsageNames(android.content.SharedPreferences prefs) {
        java.util.LinkedHashSet<String> names = new java.util.LinkedHashSet<>();
        for (String key : prefs.getAll().keySet()) {
            if (key.startsWith("count_") && key.length() > 6) {
                names.add(key.substring(6));
            } else if (key.startsWith("last_used_") && key.length() > 10) {
                names.add(key.substring(10));
            }
        }
        return new java.util.ArrayList<>(names);
    }

    private void recordItemUsage(android.content.SharedPreferences prefs, String name) {
        long now = System.currentTimeMillis();
        prefs.edit()
                .putInt("count_" + name, prefs.getInt("count_" + name, 0) + 1)
                .putLong("last_used_" + name, now)
                .apply();
    }

    private void migrateLegacyItemUsage(android.content.SharedPreferences prefs) {
        if (prefs.getBoolean("usage_v2_migrated", false)) return;

        android.content.SharedPreferences.Editor editor = prefs.edit();
        java.util.Map<String, ?> all = prefs.getAll();
        java.util.Map<String, Long> newestByName = new java.util.HashMap<>();
        for (java.util.Map.Entry<String, ?> entry : all.entrySet()) {
            String key = entry.getKey();
            if (!key.startsWith("last_") || key.startsWith("last_used_")) continue;
            Object value = entry.getValue();
            if (!(value instanceof String)) continue;
            String name = ((String) value).trim();
            if (name.isEmpty()) continue;
            try {
                long timestamp = Long.parseLong(key.substring(5));
                Long previous = newestByName.get(name);
                if (previous == null || timestamp > previous) newestByName.put(name, timestamp);
            } catch (NumberFormatException ignored) {
            }
        }
        for (java.util.Map.Entry<String, Long> entry : newestByName.entrySet()) {
            String key = "last_used_" + entry.getKey();
            long existing = prefs.getLong(key, 0L);
            if (entry.getValue() > existing) editor.putLong(key, entry.getValue());
        }
        editor.putBoolean("usage_v2_migrated", true).apply();
    }

    private void addQuickButton(android.widget.LinearLayout parent, String name, android.widget.EditText search) {
        android.widget.Button b = new android.widget.Button(this);
        b.setText(name);
        b.setAllCaps(false);
        b.setTextSize(13);
        b.setMinHeight(0);
        b.setMinWidth(0);
        b.setPadding(dp(14), 0, dp(14), 0);
        b.setBackgroundResource(R.drawable.bg_chip);
        b.setTextColor(ContextCompat.getColor(this, R.color.pb_text));
        b.setOnClickListener(v -> search.setText(name));
        android.widget.LinearLayout.LayoutParams lp = new android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, dp(40));
        lp.setMarginEnd(dp(7));
        parent.addView(b, lp);
    }

    private void setGrouping(boolean byStore) {
        groupByStore = byStore;
        getPreferences(MODE_PRIVATE).edit().putBoolean("group_by_store", byStore).apply();
        render();
    }

    private void startReceiveFromPc() {
        pendingTransferMode = TransferMode.RECEIVE_FROM_PC;
        pendingTransferTrip = null;
        Intent intent = new Intent(this, ScannerActivity.class);
        intent.putExtra(ScannerActivity.EXTRA_PROMPT, "Skann «Send til mobil»-QR fra Personlig Budsjett på PC");
        scannerLauncher.launch(intent);
    }

    private void startSendToPc(ShoppingTrip trip) {
        try {
            // Validate that this historical trip can produce an exact PB2 v2 return before opening the camera.
            ReturnQrProtocol.encodeJsonV2(trip);
        } catch (Exception e) {
            showTransferError("Kan ikke sende handleturen", e);
            return;
        }
        pendingTransferMode = TransferMode.SEND_TO_PC;
        pendingTransferTrip = trip;
        Intent intent = new Intent(this, ScannerActivity.class);
        intent.putExtra(ScannerActivity.EXTRA_PROMPT, "Skann «Motta fra mobil»-QR fra Personlig Budsjett på PC");
        scannerLauncher.launch(intent);
    }

    private void receiveFromPc(String pairingQr) {
        final URL url;
        try {
            url = LocalTransfer.validatePairingUrl(pairingQr, LocalTransfer.Direction.RECEIVE_FROM_PC);
        } catch (Exception e) {
            showTransferError("Ugyldig pairing-QR", e);
            return;
        }

        AlertDialog progress = transferProgress("Mottar handleliste …", "Henter handlelisten direkte fra PC-en på lokalnettet.");
        new Thread(() -> {
            try {
                String json = LocalTransfer.getJson(url);
                QrProtocol.Payload payload = QrProtocol.decodeJson(json);
                runOnUiThread(() -> {
                    progress.dismiss();
                    offerImportedPayload(payload);
                });
            } catch (Exception e) {
                runOnUiThread(() -> {
                    progress.dismiss();
                    showTransferError("Kunne ikke motta handlelisten", e);
                });
            }
        }, "pb-lan-receive").start();
    }

    private void sendTripToPc(ShoppingTrip trip, String pairingQr) {
        final URL url;
        final String json;
        try {
            url = LocalTransfer.validatePairingUrl(pairingQr, LocalTransfer.Direction.SEND_TO_PC);
            json = ReturnQrProtocol.encodeJsonV2(trip);
        } catch (Exception e) {
            showTransferError("Kunne ikke starte sending", e);
            return;
        }

        AlertDialog progress = transferProgress("Sender handletur …", "Sender kjøpte varer direkte til PC-en på lokalnettet.");
        new Thread(() -> {
            try {
                String response = LocalTransfer.postJson(url, json);
                JSONObject result = new JSONObject(response);
                if (!result.optBoolean("ok", false)) throw new IllegalArgumentException("Desktop bekreftet ikke mottaket");
                runOnUiThread(() -> {
                    progress.dismiss();
                    new AlertDialog.Builder(this)
                            .setTitle("Handletur sendt")
                            .setMessage("De kjøpte varene er sendt til Personlig Budsjett på PC.")
                            .setPositiveButton("OK", null)
                            .show();
                });
            } catch (Exception e) {
                runOnUiThread(() -> {
                    progress.dismiss();
                    showTransferError("Kunne ikke sende handleturen", e);
                });
            }
        }, "pb-lan-send").start();
    }

    private AlertDialog transferProgress(String title, String message) {
        AlertDialog dialog = new AlertDialog.Builder(this)
                .setTitle(title)
                .setMessage(message)
                .setCancelable(false)
                .create();
        dialog.show();
        return dialog;
    }

    private void showTransferError(String title, Exception e) {
        String message = e.getMessage();
        if (message == null || message.trim().isEmpty()) message = "Ukjent feil";
        new AlertDialog.Builder(this)
                .setTitle(title)
                .setMessage(message + "\n\nKontroller at telefon og PC er på samme lokale Wi-Fi/LAN, og lag en ny pairing-QR hvis sesjonen har utløpt.")
                .setPositiveButton("OK", null)
                .show();
    }

    private void offerImportedPayload(QrProtocol.Payload payload) {
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
    }

    private void replaceWith(QrProtocol.Payload payload) {
        ensureActiveTrip();
        items.clear();
        items.addAll(payload.items);
        listName = payload.listName;
        activeTrip.listName = listName;
        activeTrip.sourceListId = payload.sourceListId;
        activeTrip.sourceIdentityMixed = false;
        activeTrip.actualTotal = null;
        saveAndRender();
        showList();
    }

    private void mergeWith(QrProtocol.Payload payload) {
        ensureActiveTrip();
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
        activeTrip.listName = listName;
        mergeSourceIdentity(payload.sourceListId);
        saveAndRender();
        showList();
    }

    private void mergeSourceIdentity(String incomingSourceListId) {
        String incoming = incomingSourceListId == null ? "" : incomingSourceListId.trim();
        if (incoming.isEmpty() || activeTrip.sourceIdentityMixed) return;
        String current = activeTrip.sourceListId == null ? "" : activeTrip.sourceListId.trim();
        if (current.isEmpty()) {
            activeTrip.sourceListId = incoming;
        } else if (!current.equals(incoming)) {
            // A trip merged from different desktop lists cannot truthfully expose one top-level sid.
            activeTrip.sourceListId = "";
            activeTrip.sourceIdentityMixed = true;
        }
    }

    private ShoppingItem findMergeTarget(ShoppingItem incoming) {
        String sourceId = incoming.sourceItemId == null ? "" : incoming.sourceItemId.trim();
        if (!sourceId.isEmpty()) {
            for (ShoppingItem existing : items) {
                String existingSourceId = existing.sourceItemId == null ? "" : existing.sourceItemId.trim();
                if (sourceId.equals(existingSourceId)) return existing;
            }
            // Preserve exact desktop line identity instead of merging two distinct PB1 lines by name/EAN.
            return null;
        }
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
                if (isNew) {
                    ensureActiveTrip();
                    items.add(target);
                }
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
        hideDone = !hideDone;
        getPreferences(MODE_PRIVATE).edit().putBoolean("hide_done", hideDone).apply();
        render();
    }

    private void saveAndRender() {
        if (activeTrip != null) {
            activeTrip.listName = listName;
            activeTrip.items.clear();
            activeTrip.items.addAll(items);
            store.saveActiveTrip(activeTrip);
        }
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

        summaryText.setText("v" + BuildConfig.VERSION_NAME);

        int percent = items.isEmpty() ? 0 : (int)Math.round((doneCount * 100.0) / items.size());
        progressText.setText(doneCount + " av " + items.size() + " handlet");
        progressPercent.setText(percent + "%");
        progressBar.setProgress(percent);

        totalItemsText.setText("Totalt " + items.size() + (items.size()==1 ? " vare" : " varer"));
        openPriceText.setText(hasAnyPrice ? money.format(openTotal) : "—");
        expectedTotalText.setText(hasAnyPrice ? money.format(expectedTotal) : "—");
        actualTotalText.setText(activeTrip != null && activeTrip.actualTotal != null ? money.format(activeTrip.actualTotal) : "—");
        editActualTotalButton.setEnabled(activeTrip != null && !items.isEmpty());
        completeTripButton.setEnabled(activeTrip != null && !items.isEmpty());

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
        if (!done.isEmpty() && !hideDone) {
            headers.add("Ferdig (" + done.size() + ")");
            groups.add(done);
        }
        clearDoneButton.setText(hideDone ? "Vis handlet" : "Skjul handlet");
        clearDoneButton.setEnabled(!done.isEmpty());

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
        overviewStatus.setText("Historikk over fullførte handleturer");
        overviewStores.setText("Aktiv tur: " + (activeTrip == null ? "Ingen" : listName));

        adapter.setGroupingByStore(groupByStore);
        adapter.setRows(headers, groups);
        applyListEmptyState();
    }

    private void ensureActiveTrip() {
        if (activeTrip != null) return;
        activeTrip = new ShoppingTrip();
        activeTrip.listName = listName;
        store.saveActiveTrip(activeTrip);
    }

    private void editActualTotal() {
        if (activeTrip == null) return;
        EditText input = new EditText(this);
        input.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        input.setHint("0,00");
        if (activeTrip.actualTotal != null) input.setText(String.format(Locale.US, "%.2f", activeTrip.actualTotal).replace('.', ','));
        input.setSelectAllOnFocus(true);
        int pad = dp(20);
        LinearLayout wrapper = new LinearLayout(this);
        wrapper.setPadding(pad, 0, pad, 0);
        wrapper.addView(input, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        AlertDialog dialog = new AlertDialog.Builder(this)
                .setTitle("Faktisk totalpris")
                .setMessage("Skriv inn beløpet du faktisk betalte.")
                .setView(wrapper)
                .setPositiveButton("Lagre", null)
                .setNegativeButton("Avbryt", null)
                .create();
        dialog.setOnShowListener(v -> dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v2 -> {
            String raw = input.getText().toString().trim();
            if (raw.isEmpty()) {
                activeTrip.actualTotal = null;
            } else {
                double value = parse(raw);
                if (value < 0) { input.setError("Ugyldig beløp"); return; }
                activeTrip.actualTotal = value;
            }
            saveAndRender();
            dialog.dismiss();
        }));
        dialog.show();
    }

    private void completeCurrentTrip() {
        if (activeTrip == null || items.isEmpty()) return;
        NumberFormat money = NumberFormat.getCurrencyInstance(new Locale("nb", "NO"));
        double expected = activeTrip.expectedTotal();
        String actual = activeTrip.actualTotal == null ? "Ikke registrert" : money.format(activeTrip.actualTotal);
        new AlertDialog.Builder(this)
                .setTitle("Fullfør handletur?")
                .setMessage("Forventet: " + money.format(expected) + "\nFaktisk: " + actual +
                        "\n\nTuren flyttes til historikken. Varer og kjøpt-status beholdes.")
                .setPositiveButton("Fullfør", (d, w) -> {
                    activeTrip.items.clear();
                    activeTrip.items.addAll(items);
                    activeTrip.listName = listName;
                    activeTrip.completedAt = System.currentTimeMillis();
                    store.completeTrip(activeTrip);
                    activeTrip = null;
                    items.clear();
                    listName = "Handleliste";
                    render();
                    showOverview();
                })
                .setNegativeButton("Avbryt", null)
                .show();
    }

    private void renderHistory() {
        if (historyContainer == null) return;
        historyContainer.removeAllViews();
        List<ShoppingTrip> history = store.loadHistory();
        if (history.isEmpty()) {
            TextView empty = new TextView(this);
            empty.setText("Ingen fullførte handleturer ennå.");
            empty.setTextColor(ContextCompat.getColor(this, R.color.pb_muted));
            empty.setTextSize(15);
            empty.setPadding(0, dp(18), 0, dp(18));
            historyContainer.addView(empty);
            return;
        }

        SimpleDateFormat monthKeyFormat = new SimpleDateFormat("yyyy-MM", new Locale("nb", "NO"));
        SimpleDateFormat monthFormat = new SimpleDateFormat("MMMM yyyy", new Locale("nb", "NO"));
        SimpleDateFormat dayFormat = new SimpleDateFormat("d. MMMM", new Locale("nb", "NO"));
        NumberFormat money = NumberFormat.getCurrencyInstance(new Locale("nb", "NO"));
        String currentMonthKey = monthKeyFormat.format(new Date());

        Map<String, List<ShoppingTrip>> byMonth = new LinkedHashMap<>();
        Map<String, Long> monthDates = new LinkedHashMap<>();
        for (ShoppingTrip trip : history) {
            long when = trip.completedAt == null ? trip.createdAt : trip.completedAt;
            String key = monthKeyFormat.format(new Date(when));
            byMonth.computeIfAbsent(key, ignored -> new ArrayList<>()).add(trip);
            monthDates.putIfAbsent(key, when);
        }

        for (Map.Entry<String, List<ShoppingTrip>> entry : byMonth.entrySet()) {
            String monthKey = entry.getKey();
            List<ShoppingTrip> monthTrips = entry.getValue();
            long monthDate = monthDates.get(monthKey);

            LinearLayout monthBlock = new LinearLayout(this);
            monthBlock.setOrientation(LinearLayout.VERTICAL);
            LinearLayout.LayoutParams blockLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            blockLp.bottomMargin = dp(8);
            monthBlock.setLayoutParams(blockLp);

            LinearLayout monthHeader = new LinearLayout(this);
            monthHeader.setOrientation(LinearLayout.HORIZONTAL);
            monthHeader.setGravity(android.view.Gravity.CENTER_VERTICAL);
            monthHeader.setPadding(0, dp(16), 0, dp(10));
            monthHeader.setClickable(true);
            monthHeader.setFocusable(true);

            LinearLayout monthText = new LinearLayout(this);
            monthText.setOrientation(LinearLayout.VERTICAL);
            monthText.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));

            TextView monthTitle = new TextView(this);
            monthTitle.setText(capitalize(monthFormat.format(new Date(monthDate))));
            monthTitle.setTextColor(ContextCompat.getColor(this, R.color.pb_text));
            monthTitle.setTextSize(18);
            monthTitle.setTypeface(monthTitle.getTypeface(), android.graphics.Typeface.BOLD);
            monthText.addView(monthTitle);

            double actualSum = 0;
            double expectedSum = 0;
            int actualCount = 0;
            for (ShoppingTrip trip : monthTrips) {
                expectedSum += trip.expectedTotal();
                if (trip.actualTotal != null) {
                    actualSum += trip.actualTotal;
                    actualCount++;
                }
            }
            TextView monthSummary = new TextView(this);
            String sumText = actualCount == monthTrips.size()
                    ? "Faktisk: " + money.format(actualSum)
                    : "Forventet: " + money.format(expectedSum);
            monthSummary.setText(monthTrips.size() + (monthTrips.size() == 1 ? " handletur · " : " handleturer · ") + sumText);
            monthSummary.setTextColor(ContextCompat.getColor(this, R.color.pb_muted));
            monthSummary.setTextSize(13);
            monthSummary.setPadding(0, dp(2), 0, 0);
            monthText.addView(monthSummary);
            monthHeader.addView(monthText);

            TextView arrow = new TextView(this);
            arrow.setTextColor(ContextCompat.getColor(this, R.color.pb_muted));
            arrow.setTextSize(20);
            arrow.setPadding(dp(12), 0, 0, 0);
            monthHeader.addView(arrow);
            monthBlock.addView(monthHeader);

            LinearLayout monthContent = new LinearLayout(this);
            monthContent.setOrientation(LinearLayout.VERTICAL);
            monthBlock.addView(monthContent);

            for (ShoppingTrip trip : monthTrips) {
                long when = trip.completedAt == null ? trip.createdAt : trip.completedAt;
                LinearLayout card = new LinearLayout(this);
                card.setOrientation(LinearLayout.VERTICAL);
                card.setBackgroundResource(R.drawable.bg_card);
                card.setPadding(dp(16), dp(14), dp(16), dp(14));
                card.setClickable(true);
                card.setFocusable(true);
                LinearLayout.LayoutParams cardLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                cardLp.bottomMargin = dp(10);
                card.setLayoutParams(cardLp);

                TextView heading = new TextView(this);
                heading.setText(dayFormat.format(new Date(when)) + "  ·  " + trip.listName);
                heading.setTextColor(ContextCompat.getColor(this, R.color.pb_text));
                heading.setTextSize(16);
                heading.setTypeface(heading.getTypeface(), android.graphics.Typeface.BOLD);
                card.addView(heading);

                long checked = trip.items.stream().filter(item -> item.checked).count();
                TextView details = new TextView(this);
                String expected = money.format(trip.expectedTotal());
                String actual = trip.actualTotal == null ? "—" : money.format(trip.actualTotal);
                String deviation = "";
                if (trip.actualTotal != null) {
                    double diff = trip.actualTotal - trip.expectedTotal();
                    deviation = "\nAvvik: " + (diff > 0 ? "+" : "") + money.format(diff);
                }
                details.setText(checked + " av " + trip.items.size() + " kjøpt\nForventet: " + expected + "\nFaktisk: " + actual + deviation);
                details.setTextColor(ContextCompat.getColor(this, R.color.pb_muted));
                details.setTextSize(14);
                details.setPadding(0, dp(6), 0, 0);
                card.addView(details);
                card.setOnClickListener(v -> showTripDetails(trip));
                monthContent.addView(card);
            }

            boolean expanded = monthKey.equals(currentMonthKey);
            monthContent.setVisibility(expanded ? View.VISIBLE : View.GONE);
            arrow.setText(expanded ? "⌃" : "⌄");
            monthHeader.setOnClickListener(v -> {
                boolean open = monthContent.getVisibility() == View.VISIBLE;
                monthContent.setVisibility(open ? View.GONE : View.VISIBLE);
                arrow.setText(open ? "⌄" : "⌃");
            });
            historyContainer.addView(monthBlock);
        }
    }

    private void showTripDetails(ShoppingTrip trip) {
        NumberFormat money = NumberFormat.getCurrencyInstance(new Locale("nb", "NO"));
        SimpleDateFormat dateFormat = new SimpleDateFormat("d. MMMM yyyy 'kl.' HH:mm", new Locale("nb", "NO"));
        long when = trip.completedAt == null ? trip.createdAt : trip.completedAt;

        ScrollView scroll = new ScrollView(this);
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(20), dp(8), dp(20), dp(12));
        scroll.addView(content);

        TextView meta = new TextView(this);
        long checked = trip.items.stream().filter(item -> item.checked).count();
        String actual = trip.actualTotal == null ? "—" : money.format(trip.actualTotal);
        String deviation = "";
        if (trip.actualTotal != null) {
            double diff = trip.actualTotal - trip.expectedTotal();
            deviation = "\nAvvik: " + (diff > 0 ? "+" : "") + money.format(diff);
        }
        meta.setText(dateFormat.format(new Date(when)) + "\n" + checked + " av " + trip.items.size() + " varer kjøpt" +
                "\n\nForventet: " + money.format(trip.expectedTotal()) + "\nFaktisk: " + actual + deviation);
        meta.setTextColor(ContextCompat.getColor(this, R.color.pb_text));
        meta.setTextSize(15);
        meta.setPadding(0, 0, 0, dp(16));
        content.addView(meta);

        Map<String, List<ShoppingItem>> grouped = new LinkedHashMap<>();
        for (ShoppingItem item : trip.items) {
            String storeName = item.store == null ? "" : item.store.trim();
            if (storeName.isEmpty()) storeName = "Butikk ikke valgt";
            grouped.computeIfAbsent(storeName, ignored -> new ArrayList<>()).add(item);
        }

        for (Map.Entry<String, List<ShoppingItem>> entry : grouped.entrySet()) {
            TextView storeTitle = new TextView(this);
            storeTitle.setText(entry.getKey());
            storeTitle.setTextColor(ContextCompat.getColor(this, R.color.pb_text));
            storeTitle.setTextSize(16);
            storeTitle.setTypeface(storeTitle.getTypeface(), android.graphics.Typeface.BOLD);
            storeTitle.setPadding(0, dp(10), 0, dp(5));
            content.addView(storeTitle);

            for (ShoppingItem item : entry.getValue()) {
                TextView row = new TextView(this);
                String qty = formatQty(item.qty) + (item.unit == null || item.unit.trim().isEmpty() ? "" : " " + item.unit.trim());
                String price = item.estimatedPrice == null ? "Pris —" : money.format(item.estimatedPrice);
                String state = item.checked ? "✓ Kjøpt" : "Ikke kjøpt";
                row.setText(item.name + "\n" + qty + "  ·  " + price + "  ·  " + state);
                row.setTextColor(ContextCompat.getColor(this, item.checked ? R.color.pb_muted : R.color.pb_text));
                row.setTextSize(14);
                row.setPadding(dp(12), dp(10), dp(12), dp(10));
                row.setBackgroundResource(R.drawable.bg_card);
                LinearLayout.LayoutParams rowLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                rowLp.bottomMargin = dp(7);
                row.setLayoutParams(rowLp);
                content.addView(row);
            }
        }

        AlertDialog detailsDialog = new AlertDialog.Builder(this)
                .setTitle(trip.listName == null || trip.listName.trim().isEmpty() ? "Handletur" : trip.listName)
                .setView(scroll)
                .setNegativeButton("Lukk", null)
                .setNeutralButton("Slett", null)
                .setPositiveButton("Send til PC", (dialog, which) -> startSendToPc(trip))
                .create();

        detailsDialog.setOnShowListener(ignored -> {
            detailsDialog.getButton(AlertDialog.BUTTON_NEUTRAL).setTextColor(ContextCompat.getColor(this, R.color.pb_danger));
            detailsDialog.getButton(AlertDialog.BUTTON_NEUTRAL).setOnClickListener(v ->
                    new AlertDialog.Builder(this)
                            .setTitle("Slett handletur?")
                            .setMessage("Er du sikker på at du vil slette denne handleturen?\n\nHandleturen og alle lagrede varer blir permanent slettet.")
                            .setNegativeButton("Avbryt", null)
                            .setPositiveButton("Slett", (confirmDialog, which) -> {
                                store.deleteHistoryTrip(trip.id);
                                detailsDialog.dismiss();
                                renderHistory();
                            })
                            .show());
        });
        detailsDialog.show();
    }

    private String capitalize(String text) {
        if (text == null || text.isEmpty()) return "";
        return text.substring(0, 1).toUpperCase(new Locale("nb", "NO")) + text.substring(1);
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

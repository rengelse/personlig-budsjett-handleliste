package no.personligbudsjett.handleliste;

import android.graphics.Paint;
import android.content.res.ColorStateList;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.CheckBox;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public class ShoppingAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {
    private static final int TYPE_HEADER = 0;
    private static final int TYPE_ITEM = 1;

    public interface Listener {
        void onCheckedChanged(ShoppingItem item, boolean checked);
        void onEdit(ShoppingItem item);
    }

    private static class Row {
        String header;
        List<ShoppingItem> group;
        ShoppingItem item;
        static Row header(String value, List<ShoppingItem> groupItems){
            Row r=new Row(); r.header=value; r.group=groupItems; return r;
        }
        static Row item(ShoppingItem value){ Row r=new Row(); r.item=value; return r; }
    }

    private final List<Row> rows = new ArrayList<>();
    private final Listener listener;
    private final NumberFormat currency = NumberFormat.getCurrencyInstance(new Locale("nb","NO"));
    private final Set<String> collapsed = new HashSet<>();
    private boolean groupingByStore = true;

    public ShoppingAdapter(Listener listener) {
        this.listener = listener;
    }

    public void setGroupingByStore(boolean value) {
        groupingByStore = value;
    }

    public void setRows(List<String> headers, List<List<ShoppingItem>> groups) {
        rows.clear();
        for (int i=0; i<headers.size(); i++) {
            List<ShoppingItem> group = groups.get(i);
            if (group.isEmpty()) continue;
            String header = headers.get(i);
            rows.add(Row.header(header, group));
            if (!collapsed.contains(header)) {
                for (ShoppingItem item : group) rows.add(Row.item(item));
            }
        }
        notifyDataSetChanged();
    }

    @Override public int getItemViewType(int position) {
        return rows.get(position).item == null ? TYPE_HEADER : TYPE_ITEM;
    }

    @NonNull
    @Override public RecyclerView.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        LayoutInflater inf = LayoutInflater.from(parent.getContext());
        if (viewType == TYPE_HEADER) return new HeaderHolder(inf.inflate(R.layout.item_header, parent, false));
        return new ItemHolder(inf.inflate(R.layout.item_shopping, parent, false));
    }

    @Override public void onBindViewHolder(@NonNull RecyclerView.ViewHolder holder, int position) {
        Row row = rows.get(position);

        if (holder instanceof HeaderHolder) {
            HeaderHolder h = (HeaderHolder) holder;
            h.text.setText(row.header);
            h.icon.setText(groupingByStore && !row.header.startsWith("Ferdig") ? "▣" : "◇");
            h.icon.setTextColor(PaletteManager.current(h.root.getContext()).primary);
            int groupSize = row.group == null ? 0 : row.group.size();
            h.count.setText(groupSize + (groupSize == 1 ? " vare" : " varer"));

            double total=0;
            boolean hasPrice=false;
            if(row.group!=null){
                for(ShoppingItem item:row.group){
                    if(item.estimatedPrice!=null){
                        total += item.estimatedPrice;
                        hasPrice=true;
                    }
                }
            }
            h.total.setText(hasPrice ? currency.format(total) : "");
            boolean isCollapsed=collapsed.contains(row.header);
            h.arrow.setText(isCollapsed ? "⌄" : "⌃");
            h.root.setOnClickListener(v -> {
                if(isCollapsed) collapsed.remove(row.header);
                else collapsed.add(row.header);
                rebuildFromCurrentRows();
            });
            return;
        }

        ItemHolder h = (ItemHolder) holder;
        ShoppingItem item = row.item;
        h.name.setText(item.name);
        String qty = item.qty > 0 ? trim(item.qty) + (item.unit.isEmpty() ? "" : " " + item.unit) : "";
        h.meta.setText(qty);
        h.icon.setText(iconFor(item));
        h.price.setText(item.estimatedPrice == null ? "—" : currency.format(item.estimatedPrice));

        h.check.setOnCheckedChangeListener(null);
        h.check.setButtonTintList(ColorStateList.valueOf(PaletteManager.current(h.root.getContext()).primary));
        h.check.setChecked(item.checked);
        h.check.setOnCheckedChangeListener((button, checked) -> listener.onCheckedChanged(item, checked));

        int flags = h.name.getPaintFlags();
        if (item.checked) flags |= Paint.STRIKE_THRU_TEXT_FLAG;
        else flags &= ~Paint.STRIKE_THRU_TEXT_FLAG;
        h.name.setPaintFlags(flags);

        float alpha=item.checked ? .48f : 1f;
        h.name.setAlpha(alpha);
        h.meta.setAlpha(alpha);
        h.price.setAlpha(alpha);
        h.icon.setAlpha(alpha);

        h.root.setOnClickListener(v -> listener.onCheckedChanged(item, !item.checked));
        h.root.setOnLongClickListener(v -> { listener.onEdit(item); return true; });
    }

    private void rebuildFromCurrentRows(){
        List<String> headers=new ArrayList<>();
        List<List<ShoppingItem>> groups=new ArrayList<>();
        for(Row row:rows){
            if(row.item==null && row.group!=null){
                headers.add(row.header);
                groups.add(row.group);
            }
        }
        setRows(headers,groups);
    }

    private String iconFor(ShoppingItem item){
        String c=(item.category==null?"":item.category).toLowerCase(new Locale("nb","NO"));
        String n=(item.name==null?"":item.name).toLowerCase(new Locale("nb","NO"));
        if(c.contains("kjøtt") || n.contains("kjøttdeig") || n.contains("karbonade")) return "🥩";
        if(c.contains("meieri") || n.contains("melk")) return "🥛";
        if(n.contains("ost") || n.contains("cheddar")) return "🧀";
        if(n.contains("løk")) return "🧅";
        if(n.contains("paprika")) return "🫑";
        if(n.contains("tomat")) return "🍅";
        if(n.contains("agurk")) return "🥒";
        if(n.contains("brød")) return "🍞";
        if(n.contains("yoghurt")) return "🥣";
        if(n.contains("salsa") || n.contains("saus")) return "🫙";
        if(c.contains("frukt") || c.contains("grønt")) return "🥬";
        if(c.contains("drikke")) return "🥤";
        return "🛒";
    }

    @Override public int getItemCount(){ return rows.size(); }

    static class HeaderHolder extends RecyclerView.ViewHolder {
        View root; TextView icon,text,count,total,arrow;
        HeaderHolder(View v){
            super(v); root=v.findViewById(R.id.headerRoot); icon=v.findViewById(R.id.headerIcon);
            text=v.findViewById(R.id.headerText); count=v.findViewById(R.id.headerCount);
            total=v.findViewById(R.id.headerTotal); arrow=v.findViewById(R.id.headerArrow);
        }
    }

    static class ItemHolder extends RecyclerView.ViewHolder {
        View root; CheckBox check; TextView icon,name,meta,price;
        ItemHolder(View v){
            super(v); root=v.findViewById(R.id.root); check=v.findViewById(R.id.check);
            icon=v.findViewById(R.id.itemIcon); name=v.findViewById(R.id.nameText);
            meta=v.findViewById(R.id.metaText); price=v.findViewById(R.id.priceText);
        }
    }

    private static String trim(double value) {
        if (Math.rint(value) == value) return String.valueOf((long)value);
        return String.valueOf(value).replace('.', ',');
    }
}

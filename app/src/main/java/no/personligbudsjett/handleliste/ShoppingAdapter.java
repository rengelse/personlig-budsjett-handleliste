package no.personligbudsjett.handleliste;

import android.graphics.Paint;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.CheckBox;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class ShoppingAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {
    private static final int TYPE_HEADER = 0;
    private static final int TYPE_ITEM = 1;

    public interface Listener {
        void onCheckedChanged(ShoppingItem item, boolean checked);
        void onEdit(ShoppingItem item);
    }

    private static class Row {
        String header;
        ShoppingItem item;
        static Row header(String value){ Row r=new Row(); r.header=value; return r; }
        static Row item(ShoppingItem value){ Row r=new Row(); r.item=value; return r; }
    }

    private final List<Row> rows = new ArrayList<>();
    private final Listener listener;
    private final NumberFormat currency = NumberFormat.getCurrencyInstance(new Locale("nb","NO"));

    public ShoppingAdapter(Listener listener) {
        this.listener = listener;
    }

    public void setRows(List<String> headers, List<List<ShoppingItem>> groups) {
        rows.clear();
        for (int i=0; i<headers.size(); i++) {
            if (groups.get(i).isEmpty()) continue;
            rows.add(Row.header(headers.get(i)));
            for (ShoppingItem item : groups.get(i)) rows.add(Row.item(item));
        }
        notifyDataSetChanged();
    }

    @Override public int getItemViewType(int position) {
        return rows.get(position).item == null ? TYPE_HEADER : TYPE_ITEM;
    }

    @NonNull
    @Override public RecyclerView.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        LayoutInflater inf = LayoutInflater.from(parent.getContext());
        if (viewType == TYPE_HEADER) {
            return new HeaderHolder(inf.inflate(R.layout.item_header, parent, false));
        }
        return new ItemHolder(inf.inflate(R.layout.item_shopping, parent, false));
    }

    @Override public void onBindViewHolder(@NonNull RecyclerView.ViewHolder holder, int position) {
        Row row = rows.get(position);
        if (holder instanceof HeaderHolder) {
            ((HeaderHolder) holder).text.setText(row.header);
            return;
        }

        ItemHolder h = (ItemHolder) holder;
        ShoppingItem item = row.item;
        h.name.setText(item.name);
        String qty = item.qty > 0 ? trim(item.qty) + (item.unit.isEmpty() ? "" : " " + item.unit) : "";
        String extra = item.store == null || item.store.isEmpty() ? "" : item.store;
        h.meta.setText(joinDot(qty, extra));
        h.price.setText(item.estimatedPrice == null ? "" : currency.format(item.estimatedPrice));

        h.check.setOnCheckedChangeListener(null);
        h.check.setChecked(item.checked);
        h.check.setOnCheckedChangeListener((button, checked) -> listener.onCheckedChanged(item, checked));

        int flags = h.name.getPaintFlags();
        if (item.checked) flags |= Paint.STRIKE_THRU_TEXT_FLAG;
        else flags &= ~Paint.STRIKE_THRU_TEXT_FLAG;
        h.name.setPaintFlags(flags);
        h.name.setAlpha(item.checked ? 0.55f : 1f);
        h.meta.setAlpha(item.checked ? 0.45f : 1f);
        h.price.setAlpha(item.checked ? 0.45f : 1f);

        h.root.setOnClickListener(v -> listener.onCheckedChanged(item, !item.checked));
        h.root.setOnLongClickListener(v -> { listener.onEdit(item); return true; });
    }

    @Override public int getItemCount(){ return rows.size(); }

    static class HeaderHolder extends RecyclerView.ViewHolder {
        TextView text;
        HeaderHolder(View v){ super(v); text=v.findViewById(R.id.headerText); }
    }

    static class ItemHolder extends RecyclerView.ViewHolder {
        View root;
        CheckBox check;
        TextView name, meta, price;
        ItemHolder(View v){
            super(v);
            root=v.findViewById(R.id.root);
            check=v.findViewById(R.id.check);
            name=v.findViewById(R.id.nameText);
            meta=v.findViewById(R.id.metaText);
            price=v.findViewById(R.id.priceText);
        }
    }

    private static String trim(double value) {
        if (Math.rint(value) == value) return String.valueOf((long)value);
        return String.valueOf(value).replace('.', ',');
    }

    private static String joinDot(String a, String b) {
        if (a == null || a.isEmpty()) return b == null ? "" : b;
        if (b == null || b.isEmpty()) return a;
        return a + " · " + b;
    }
}

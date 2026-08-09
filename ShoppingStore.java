<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@color/pb_background"
    android:paddingTop="16dp">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical"
        android:paddingLeft="16dp"
        android:paddingRight="16dp"
        android:paddingBottom="10dp">

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical">

            <TextView
                android:id="@+id/titleText"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="Handleliste"
                android:textColor="@color/pb_text"
                android:textSize="26sp"
                android:textStyle="bold"/>

            <TextView
                android:id="@+id/summaryText"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginTop="2dp"
                android:text="Ingen aktiv liste"
                android:textColor="@color/pb_muted"
                android:textSize="14sp"/>
        </LinearLayout>

        <Button
            android:id="@+id/scanButton"
            android:layout_width="wrap_content"
            android:layout_height="48dp"
            android:background="@drawable/bg_primary"
            android:text="Skann QR"
            android:textAllCaps="false"
            android:textColor="@color/pb_primary_text"
            android:textStyle="bold"/>
    </LinearLayout>

    <androidx.recyclerview.widget.RecyclerView
        android:id="@+id/list"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:clipToPadding="false"
        android:paddingLeft="12dp"
        android:paddingRight="12dp"
        android:paddingBottom="88dp"/>

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="72dp"
        android:orientation="horizontal"
        android:gravity="center_vertical"
        android:background="@color/pb_surface"
        android:paddingLeft="16dp"
        android:paddingRight="16dp">

        <Button
            android:id="@+id/addButton"
            android:layout_width="0dp"
            android:layout_height="48dp"
            android:layout_weight="1"
            android:background="@drawable/bg_secondary"
            android:text="+ Legg til vare"
            android:textAllCaps="false"
            android:textColor="@color/pb_text"/>

        <Space
            android:layout_width="10dp"
            android:layout_height="1dp"/>

        <Button
            android:id="@+id/clearDoneButton"
            android:layout_width="0dp"
            android:layout_height="48dp"
            android:layout_weight="1"
            android:background="@drawable/bg_secondary"
            android:text="Fjern ferdige"
            android:textAllCaps="false"
            android:textColor="@color/pb_text"/>
    </LinearLayout>
</LinearLayout>

import streamlit as st

from utils.database import (
    init_db,
    get_all_experiments,
    delete_experiment,
    get_categories,
    get_researchers,
)
from utils.export import to_csv, to_excel

init_db()

st.header("データ一覧")

df = get_all_experiments()

if df.empty:
    st.info("まだデータが登録されていません。「データ入力」ページからデータを追加してください。")
    st.stop()

# --- Filters ---
with st.expander("フィルタ", expanded=False):
    fcol1, fcol2, fcol3 = st.columns(3)
    with fcol1:
        filter_name = st.text_input("実験名で検索")
    with fcol2:
        categories = ["すべて"] + get_categories()
        filter_category = st.selectbox("カテゴリ", categories)
    with fcol3:
        researchers = ["すべて"] + get_researchers()
        filter_researcher = st.selectbox("実験者", researchers)

    filter_success = st.radio(
        "成功/失敗", ["すべて", "成功のみ", "失敗のみ"], horizontal=True
    )

filtered = df.copy()

if filter_name:
    filtered = filtered[
        filtered["experiment_name"].str.contains(filter_name, case=False, na=False)
    ]
if filter_category != "すべて":
    filtered = filtered[filtered["category"] == filter_category]
if filter_researcher != "すべて":
    filtered = filtered[filtered["researcher"] == filter_researcher]
if filter_success == "成功のみ":
    filtered = filtered[filtered["success"] == True]
elif filter_success == "失敗のみ":
    filtered = filtered[filtered["success"] == False]

st.write(f"**{len(filtered)}** 件のデータ")

# --- Display columns ---
display_cols = [
    "id",
    "experiment_name",
    "experiment_date",
    "researcher",
    "category",
    "condition_desc",
    "result_value",
    "result_unit",
    "result_text",
    "success",
    "notes",
]
existing_cols = [c for c in display_cols if c in filtered.columns]

st.dataframe(
    filtered[existing_cols],
    use_container_width=True,
    hide_index=True,
    column_config={
        "id": st.column_config.NumberColumn("ID", width="small"),
        "experiment_name": st.column_config.TextColumn("実験名"),
        "experiment_date": st.column_config.TextColumn("実験日"),
        "researcher": st.column_config.TextColumn("実験者"),
        "category": st.column_config.TextColumn("カテゴリ"),
        "condition_desc": st.column_config.TextColumn("実験条件"),
        "result_value": st.column_config.NumberColumn("数値結果", format="%.4f"),
        "result_unit": st.column_config.TextColumn("単位"),
        "result_text": st.column_config.TextColumn("テキスト結果"),
        "success": st.column_config.CheckboxColumn("成功"),
        "notes": st.column_config.TextColumn("備考"),
    },
)

# --- Export ---
st.subheader("エクスポート")
ecol1, ecol2 = st.columns(2)
with ecol1:
    st.download_button(
        label="CSV ダウンロード",
        data=to_csv(filtered),
        file_name="experiments.csv",
        mime="text/csv",
        use_container_width=True,
    )
with ecol2:
    st.download_button(
        label="Excel ダウンロード",
        data=to_excel(filtered),
        file_name="experiments.xlsx",
        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        use_container_width=True,
    )

# --- Delete ---
st.subheader("データ削除")
with st.expander("削除操作", expanded=False):
    delete_id = st.number_input("削除する実験ID", min_value=1, step=1, value=1)
    if st.button("削除", type="secondary"):
        delete_experiment(int(delete_id))
        st.success(f"ID {delete_id} のデータを削除しました。")
        st.rerun()

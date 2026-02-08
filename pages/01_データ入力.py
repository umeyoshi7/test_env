import streamlit as st
from datetime import date

from utils.database import init_db, insert_experiment, get_categories, get_researchers

init_db()

st.header("データ入力")
st.write("実験の条件と結果を入力してください。")

CATEGORY_OPTIONS = [
    "化学",
    "生物学",
    "物理学",
    "材料科学",
    "情報科学",
    "その他",
]

with st.form("experiment_form", clear_on_submit=True):
    col1, col2 = st.columns(2)

    with col1:
        experiment_name = st.text_input("実験名 *", placeholder="例: 触媒反応速度測定")
        experiment_date = st.date_input("実験日 *", value=date.today())
        researcher = st.text_input("実験者 *", placeholder="例: 山田太郎")

        existing_categories = get_categories()
        all_categories = sorted(set(CATEGORY_OPTIONS + existing_categories))
        category = st.selectbox("カテゴリ", [""] + all_categories)

    with col2:
        condition_desc = st.text_area(
            "実験条件",
            placeholder="例: 温度25°C, pH 7.0, 反応時間30分",
            height=100,
        )
        parameters = st.text_area(
            "パラメータ",
            placeholder="例: 濃度=0.1M, 圧力=1atm",
            height=100,
        )

    st.subheader("結果")
    col3, col4 = st.columns(2)

    with col3:
        result_value = st.number_input(
            "数値結果", value=None, format="%f", step=None
        )
        result_unit = st.text_input("単位", placeholder="例: mol/L, %, kg")

    with col4:
        result_text = st.text_area(
            "テキスト結果",
            placeholder="数値で表せない結果や補足情報",
            height=80,
        )
        success = st.checkbox("成功")

    notes = st.text_area("備考", placeholder="追加のメモや考察", height=80)

    submitted = st.form_submit_button("登録", type="primary", use_container_width=True)

if submitted:
    if not experiment_name:
        st.error("実験名は必須です。")
    elif not researcher:
        st.error("実験者は必須です。")
    else:
        data = {
            "experiment_name": experiment_name,
            "experiment_date": experiment_date.isoformat(),
            "researcher": researcher,
            "category": category,
            "condition_desc": condition_desc,
            "parameters": parameters,
            "result_value": result_value,
            "result_unit": result_unit,
            "result_text": result_text,
            "success": success,
            "notes": notes,
        }
        exp_id = insert_experiment(data)
        st.success(f"実験データを登録しました (ID: {exp_id})")

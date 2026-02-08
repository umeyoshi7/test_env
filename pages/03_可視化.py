import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd

from utils.database import init_db, get_all_experiments

init_db()

st.header("可視化")

df = get_all_experiments()

if df.empty:
    st.info("まだデータが登録されていません。「データ入力」ページからデータを追加してください。")
    st.stop()

# Convert date column
df["experiment_date"] = pd.to_datetime(df["experiment_date"], errors="coerce")

tab1, tab2, tab3, tab4 = st.tabs(["時系列", "カテゴリ別", "成功率", "分布"])

# --- Tab 1: Time series ---
with tab1:
    st.subheader("数値結果の時系列推移")
    ts_df = df.dropna(subset=["result_value"])
    if ts_df.empty:
        st.info("数値結果のあるデータがありません。")
    else:
        fig = px.scatter(
            ts_df,
            x="experiment_date",
            y="result_value",
            color="category",
            hover_data=["experiment_name", "researcher", "result_unit"],
            labels={
                "experiment_date": "実験日",
                "result_value": "数値結果",
                "category": "カテゴリ",
            },
        )
        fig.update_layout(height=500)
        st.plotly_chart(fig, use_container_width=True)

# --- Tab 2: Category comparison ---
with tab2:
    st.subheader("カテゴリ別の数値結果")
    cat_df = df.dropna(subset=["result_value"])
    cat_df = cat_df[cat_df["category"] != ""]
    if cat_df.empty:
        st.info("カテゴリと数値結果のあるデータがありません。")
    else:
        fig = px.box(
            cat_df,
            x="category",
            y="result_value",
            color="category",
            points="all",
            labels={"category": "カテゴリ", "result_value": "数値結果"},
        )
        fig.update_layout(height=500, showlegend=False)
        st.plotly_chart(fig, use_container_width=True)

# --- Tab 3: Success rate ---
with tab3:
    st.subheader("成功率")
    success_counts = df["success"].value_counts()
    labels = ["成功" if v else "失敗" for v in success_counts.index]
    fig = go.Figure(
        data=[
            go.Pie(
                labels=labels,
                values=success_counts.values,
                hole=0.4,
                marker=dict(colors=["#2ecc71", "#e74c3c"]),
            )
        ]
    )
    fig.update_layout(height=400)
    st.plotly_chart(fig, use_container_width=True)

    # Success rate by category
    cat_success = df[df["category"] != ""]
    if not cat_success.empty:
        st.subheader("カテゴリ別成功率")
        rate = (
            cat_success.groupby("category")["success"]
            .mean()
            .reset_index()
            .rename(columns={"success": "success_rate"})
        )
        rate["success_rate"] = rate["success_rate"] * 100
        fig = px.bar(
            rate,
            x="category",
            y="success_rate",
            labels={"category": "カテゴリ", "success_rate": "成功率 (%)"},
            text_auto=".1f",
        )
        fig.update_layout(height=400, yaxis_range=[0, 100])
        st.plotly_chart(fig, use_container_width=True)

# --- Tab 4: Distribution ---
with tab4:
    st.subheader("数値結果の分布")
    dist_df = df.dropna(subset=["result_value"])
    if dist_df.empty:
        st.info("数値結果のあるデータがありません。")
    else:
        n_bins = st.slider("ビン数", min_value=5, max_value=50, value=20)
        fig = px.histogram(
            dist_df,
            x="result_value",
            nbins=n_bins,
            color="category",
            labels={"result_value": "数値結果", "category": "カテゴリ"},
        )
        fig.update_layout(height=500)
        st.plotly_chart(fig, use_container_width=True)

        st.subheader("基本統計量")
        stats = dist_df.groupby("category")["result_value"].describe()
        st.dataframe(stats, use_container_width=True)

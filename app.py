import streamlit as st

from utils.database import init_db

st.set_page_config(
    page_title="実験データ収集",
    page_icon="🔬",
    layout="wide",
    initial_sidebar_state="expanded",
)

init_db()

st.title("実験データ結果収集アプリ")

st.markdown(
    """
このアプリでは実験データの記録・管理・可視化を行えます。

**機能一覧:**

| ページ | 説明 |
|--------|------|
| **データ入力** | 実験条件と結果を登録 |
| **データ一覧** | 登録済みデータの検索・編集・削除・エクスポート |
| **可視化** | グラフによるデータ分析 |

左のサイドバーからページを選択してください。
"""
)

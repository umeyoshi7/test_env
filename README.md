# 実験データ結果収集アプリ

Streamlit を使った実験データの記録・管理・可視化アプリケーション。

## 機能

- **データ入力**: 実験名、日付、条件、パラメータ、結果を登録
- **データ一覧**: フィルタ・検索、CSV/Excel エクスポート、削除
- **可視化**: 時系列推移、カテゴリ別比較、成功率、分布のグラフ表示

## セットアップ

```bash
pip install -r requirements.txt
```

## 起動

```bash
streamlit run app.py
```

## プロジェクト構成

```
├── app.py                  # メインページ
├── pages/
│   ├── 01_データ入力.py     # データ入力フォーム
│   ├── 02_データ一覧.py     # データ閲覧・エクスポート
│   └── 03_可視化.py         # グラフ・統計
├── utils/
│   ├── database.py         # SQLite データベース操作
│   └── export.py           # CSV/Excel エクスポート
└── requirements.txt
```

## データ保存

SQLite (`experiments.db`) にローカル保存されます。`.gitignore` で DB ファイルは除外済みです。

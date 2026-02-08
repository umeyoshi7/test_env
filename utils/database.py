import sqlite3
import os
from datetime import datetime
from contextlib import contextmanager

import pandas as pd

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "experiments.db")


@contextmanager
def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS experiments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                experiment_name TEXT NOT NULL,
                experiment_date TEXT NOT NULL,
                researcher TEXT NOT NULL,
                category TEXT,
                condition_desc TEXT,
                parameters TEXT,
                result_value REAL,
                result_unit TEXT,
                result_text TEXT,
                success INTEGER DEFAULT 0,
                notes TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        conn.commit()


def insert_experiment(data: dict) -> int:
    now = datetime.now().isoformat()
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO experiments (
                experiment_name, experiment_date, researcher, category,
                condition_desc, parameters, result_value, result_unit,
                result_text, success, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                data["experiment_name"],
                data["experiment_date"],
                data["researcher"],
                data.get("category", ""),
                data.get("condition_desc", ""),
                data.get("parameters", ""),
                data.get("result_value"),
                data.get("result_unit", ""),
                data.get("result_text", ""),
                int(data.get("success", False)),
                data.get("notes", ""),
                now,
                now,
            ),
        )
        conn.commit()
        return cursor.lastrowid


def update_experiment(exp_id: int, data: dict):
    now = datetime.now().isoformat()
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE experiments SET
                experiment_name = ?, experiment_date = ?, researcher = ?,
                category = ?, condition_desc = ?, parameters = ?,
                result_value = ?, result_unit = ?, result_text = ?,
                success = ?, notes = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                data["experiment_name"],
                data["experiment_date"],
                data["researcher"],
                data.get("category", ""),
                data.get("condition_desc", ""),
                data.get("parameters", ""),
                data.get("result_value"),
                data.get("result_unit", ""),
                data.get("result_text", ""),
                int(data.get("success", False)),
                data.get("notes", ""),
                now,
                exp_id,
            ),
        )
        conn.commit()


def delete_experiment(exp_id: int):
    with get_connection() as conn:
        conn.execute("DELETE FROM experiments WHERE id = ?", (exp_id,))
        conn.commit()


def get_all_experiments() -> pd.DataFrame:
    with get_connection() as conn:
        df = pd.read_sql_query(
            "SELECT * FROM experiments ORDER BY experiment_date DESC, id DESC", conn
        )
    if not df.empty:
        df["success"] = df["success"].astype(bool)
    return df


def get_experiment_by_id(exp_id: int) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM experiments WHERE id = ?", (exp_id,)
        ).fetchone()
        if row:
            return dict(row)
    return None


def get_categories() -> list[str]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT DISTINCT category FROM experiments WHERE category != '' ORDER BY category"
        ).fetchall()
        return [row["category"] for row in rows]


def get_researchers() -> list[str]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT DISTINCT researcher FROM experiments WHERE researcher != '' ORDER BY researcher"
        ).fetchall()
        return [row["researcher"] for row in rows]

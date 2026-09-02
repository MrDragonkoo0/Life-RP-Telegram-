# -*- coding: utf-8 -*-
"""
Шар роботи з базою даних (SQLite). Простий синхронний доступ під локом —
достатньо для навантаження одного RP Telegram-бота.
"""
import sqlite3
import threading
from contextlib import contextmanager
from typing import Optional

DB_PATH = "lifeplus.db"

_lock = threading.Lock()
_conn = sqlite3.connect(DB_PATH, check_same_thread=False)
_conn.row_factory = sqlite3.Row


@contextmanager
def db_cursor():
    with _lock:
        cur = _conn.cursor()
        try:
            yield cur
            _conn.commit()
        finally:
            cur.close()


def init_db() -> None:
    with db_cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id       INTEGER PRIMARY KEY,
                full_name     TEXT,
                level         INTEGER NOT NULL DEFAULT 0,
                exp           INTEGER NOT NULL DEFAULT 0,
                money         INTEGER NOT NULL DEFAULT 0,
                coins         INTEGER NOT NULL DEFAULT 0,
                job_id        INTEGER,
                faction_id    INTEGER,
                faction_rank  INTEGER NOT NULL DEFAULT 0,
                house_id      INTEGER,
                house_locked  INTEGER NOT NULL DEFAULT 0,
                inside_house  INTEGER NOT NULL DEFAULT 0,
                business_ids  TEXT NOT NULL DEFAULT '',
                registered_at TEXT
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS owned_businesses (
                business_id INTEGER PRIMARY KEY,
                owner_id    INTEGER NOT NULL
            )
        """)


# ---------------------------------------------------------------------------
# Користувачі
# ---------------------------------------------------------------------------
def get_user(user_id: int) -> Optional[sqlite3.Row]:
    with db_cursor() as cur:
        cur.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
        return cur.fetchone()


def is_registered(user_id: int) -> bool:
    return get_user(user_id) is not None


def create_user(user_id: int, full_name: str) -> None:
    with db_cursor() as cur:
        cur.execute(
            """INSERT INTO users (user_id, full_name, registered_at)
               VALUES (?, ?, datetime('now'))""",
            (user_id, full_name),
        )


def update_user(user_id: int, **fields) -> None:
    if not fields:
        return
    cols = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [user_id]
    with db_cursor() as cur:
        cur.execute(f"UPDATE users SET {cols} WHERE user_id = ?", values)


def add_money(user_id: int, amount: int) -> None:
    with db_cursor() as cur:
        cur.execute("UPDATE users SET money = money + ? WHERE user_id = ?", (amount, user_id))


def add_exp(user_id: int, amount: int) -> None:
    with db_cursor() as cur:
        cur.execute("UPDATE users SET exp = exp + ? WHERE user_id = ?", (amount, user_id))


def find_user_by_name(full_name: str) -> Optional[sqlite3.Row]:
    with db_cursor() as cur:
        cur.execute("SELECT * FROM users WHERE full_name = ? COLLATE NOCASE", (full_name,))
        return cur.fetchone()


# ---------------------------------------------------------------------------
# Фракції
# ---------------------------------------------------------------------------
def get_faction_members(faction_id: int):
    with db_cursor() as cur:
        cur.execute(
            "SELECT * FROM users WHERE faction_id = ? ORDER BY faction_rank DESC",
            (faction_id,),
        )
        return cur.fetchall()


def count_faction_members(faction_id: int) -> int:
    with db_cursor() as cur:
        cur.execute("SELECT COUNT(*) AS c FROM users WHERE faction_id = ?", (faction_id,))
        return cur.fetchone()["c"]


# ---------------------------------------------------------------------------
# Бізнеси
# ---------------------------------------------------------------------------
def get_business_owner(business_id: int) -> Optional[int]:
    with db_cursor() as cur:
        cur.execute("SELECT owner_id FROM owned_businesses WHERE business_id = ?", (business_id,))
        row = cur.fetchone()
        return row["owner_id"] if row else None


def buy_business(business_id: int, owner_id: int) -> None:
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO owned_businesses (business_id, owner_id) VALUES (?, ?)",
            (business_id, owner_id),
        )


def sell_business(business_id: int) -> None:
    with db_cursor() as cur:
        cur.execute("DELETE FROM owned_businesses WHERE business_id = ?", (business_id,))


def get_owned_businesses(owner_id: int):
    with db_cursor() as cur:
        cur.execute("SELECT business_id FROM owned_businesses WHERE owner_id = ?", (owner_id,))
        return [row["business_id"] for row in cur.fetchall()]

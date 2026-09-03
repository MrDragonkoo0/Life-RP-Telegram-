# -*- coding: utf-8 -*-
"""
Конфігурація бота.

BOT_TOKEN  — токен від @BotFather.
ADMIN_IDS  — список Telegram user_id, яким дозволені адмін-команди
             (/setmoney, /givemoney, /setjob і т.д.). Свій ID можна
             дізнатись, написавши боту @userinfobot.
"""
import os

BOT_TOKEN = os.environ.get("BOT_TOKEN", "ВСТАВ_СЮДИ_ТОКЕН_ВІД_BOTFATHER")

if not BOT_TOKEN or BOT_TOKEN == "ВСТАВ_СЮДИ_ТОКЕН_ВІД_BOTFATHER":
    print(
        "⚠️  BOT_TOKEN не встановлено. "
        "Встанови змінну середовища BOT_TOKEN або впиши токен напряму в config.py"
    )

# Варіант 1: через змінну середовища ADMIN_IDS="111111111,222222222"
# Варіант 2: впиши напряму список нижче, напр. ADMIN_IDS = [111111111, 222222222]
_admin_ids_env = os.environ.get("ADMIN_IDS", "")
ADMIN_IDS = [
    int(uid.strip()) for uid in _admin_ids_env.split(",") if uid.strip().isdigit()
]

if not ADMIN_IDS:
    print(
        "⚠️  ADMIN_IDS порожній — жодна адмін-команда не спрацює. "
        "Додай свій Telegram ID у змінну середовища ADMIN_IDS або напряму в config.py"
    )

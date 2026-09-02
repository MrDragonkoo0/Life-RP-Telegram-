# -*- coding: utf-8 -*-
"""
Конфігурація бота. Токен береться зі змінної середовища BOT_TOKEN.
Якщо зручніше — просто впиши токен рядком нижче замість os.environ.get(...).
"""
import os

BOT_TOKEN = os.environ.get("BOT_TOKEN", "ВСТАВ_СЮДИ_ТОКЕН_ВІД_BOTFATHER")

if not BOT_TOKEN or BOT_TOKEN == "ВСТАВ_СЮДИ_ТОКЕН_ВІД_BOTFATHER":
    print(
        "⚠️  BOT_TOKEN не встановлено. "
        "Встанови змінну середовища BOT_TOKEN або впиши токен напряму в config.py"
    )

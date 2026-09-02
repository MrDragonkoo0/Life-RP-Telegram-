# -*- coding: utf-8 -*-
"""
Конфігурація бота. Токен береться зі змінної середовища BOT_TOKEN.
Якщо зручніше — просто впиши токен рядком нижче замість os.environ.get(...).
"""
import os

BOT_TOKEN = os.environ.get("8578006162:AAEVE9rS8KTVNDQRXkhQGpY4ztB8r-KRdXE", "8578006162:AAEVE9rS8KTVNDQRXkhQGpY4ztB8r-KRdXE")

if not BOT_TOKEN or BOT_TOKEN == "8578006162:AAEVE9rS8KTVNDQRXkhQGpY4ztB8r-KRdXE":
    print(
        "⚠️  BOT_TOKEN не встановлено. "
        "Встанови змінну середовища BOT_TOKEN або впиши токен напряму в config.py"
    )

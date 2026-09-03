# -*- coding: utf-8 -*-
"""
Life+ RP Telegram Bot
======================
Повна робоча реалізація бота на python-telegram-bot (async, v21+) з
SQLite-базою. Реалізовано: реєстрацію, статистику, роботи з таймером
(автозавершення), рівні/досвід, фракції, нерухомість, бізнеси,
адмін-команди.

Запуск:
    pip install -r requirements.txt
    export BOT_TOKEN="12345:AA...."
    export ADMIN_IDS="111111111,222222222"
    python bot.py
"""
import logging
import random
import re
import time

from telegram import Update
from telegram.ext import (
    Application,
    ApplicationBuilder,
    CommandHandler,
    ContextTypes,
    ConversationHandler,
    MessageHandler,
    filters,
)

import database as db
import texts
from data import (
    JOBS, JOBS_BY_CODE, FACTIONS, HOUSES, BUSINESSES, FACTION_RANKS,
    exp_needed_for_level,
)
from config import BOT_TOKEN, ADMIN_IDS

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
log = logging.getLogger("lifeplus_bot")

ASK_NAME = 1
NAME_RE = re.compile(r"^[A-Za-zА-Яа-яЇїІіЄєҐґ'’-]+_[A-Za-zА-Яа-яЇїІіЄєҐґ'’-]+$")


# ---------------------------------------------------------------------------
# Допоміжне
# ---------------------------------------------------------------------------
def require_registered(func):
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = update.effective_user.id
        if not db.is_registered(user_id):
            await update.message.reply_text("⚠️ Спочатку зареєструйся командою /start.")
            return
        return await func(update, context)
    return wrapper


def is_admin(user_id: int) -> bool:
    return user_id in ADMIN_IDS


def require_admin(func):
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE):
        if not is_admin(update.effective_user.id):
            await update.message.reply_text("⛔ У тебе немає прав для цієї команди.")
            return
        return await func(update, context)
    return wrapper


def parse_int_arg(context: ContextTypes.DEFAULT_TYPE, index: int):
    try:
        return int(context.args[index])
    except (ValueError, IndexError, TypeError):
        return None


# ---------------------------------------------------------------------------
# Досвід / рівні
# ---------------------------------------------------------------------------
def apply_xp_and_levelup(user_id: int, xp_gain: int) -> None:
    user = db.get_user(user_id)
    if not user:
        return
    level = user["level"]
    exp = user["exp"] + xp_gain
    needed = exp_needed_for_level(level)
    while exp >= needed:
        exp -= needed
        level += 1
        needed = exp_needed_for_level(level)
    db.update_user(user_id, level=level, exp=exp)


def set_xp_absolute(user_id: int, xp_value: int) -> None:
    """Встановлює XP на поточному рівні напряму (адмін-команда), з перевіркою левелапу."""
    user = db.get_user(user_id)
    if not user:
        return
    db.update_user(user_id, exp=max(0, xp_value))
    apply_xp_and_levelup(user_id, 0)


# ---------------------------------------------------------------------------
# Робота: старт / завершення
# ---------------------------------------------------------------------------
def finalize_work(user_id: int):
    """Завершує активну роботу гравця (якщо час вийшов) і повертає (job, earned, balance)."""
    user = db.get_user(user_id)
    if not user or not user["working_job"] or not user["work_end_ts"]:
        return None
    job = JOBS_BY_CODE.get(user["working_job"])
    db.update_user(user_id, working_job=None, work_end_ts=None)
    if not job:
        return None
    earned = random.randint(job["salary_min"], job["salary_max"])
    new_money = user["money"] + earned
    db.update_user(user_id, money=new_money)
    apply_xp_and_levelup(user_id, job["xp"])
    return job, earned, new_money


def resolve_pending_work(user_id: int) -> None:
    """Якщо час роботи вже минув (напр. бот перезапускався і не встиг сповістити),
    тихо завершує її, щоб дані в базі не залишались 'завислими'."""
    user = db.get_user(user_id)
    if user and user["working_job"] and user["work_end_ts"]:
        if time.time() >= user["work_end_ts"]:
            finalize_work(user_id)


async def work_complete_callback(context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = context.job.data
    result = finalize_work(user_id)
    if not result:
        return
    job, earned, balance = result
    try:
        await context.bot.send_message(
            chat_id=user_id,
            text=texts.work_complete_text(job, earned, balance),
        )
    except Exception as e:
        log.warning("Не вдалось надіслати повідомлення про завершення роботи %s: %s", user_id, e)


# ---------------------------------------------------------------------------
# Реєстрація: /start
# ---------------------------------------------------------------------------
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    user = db.get_user(user_id)
    if user:
        resolve_pending_work(user_id)
        user = db.get_user(user_id)
        await update.message.reply_text(texts.status_text(user))
        return ConversationHandler.END

    await update.message.reply_text(texts.welcome_registration_text())
    return ASK_NAME


async def receive_name(update: Update, context: ContextTypes.DEFAULT_TYPE):
    full_name = update.message.text.strip()
    if not NAME_RE.match(full_name):
        await update.message.reply_text(texts.registration_format_error_text())
        return ASK_NAME

    if db.find_user_by_name(full_name):
        await update.message.reply_text("⚠️ Це ім'я вже зайняте. Введи інше у форматі David_Bondarenko")
        return ASK_NAME

    user_id = update.effective_user.id
    db.create_user(user_id, full_name)
    user = db.get_user(user_id)
    await update.message.reply_text(f"✅ Реєстрація успішна, {full_name}!")
    await update.message.reply_text(texts.status_text(user))
    return ConversationHandler.END


async def cancel_registration(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Реєстрацію скасовано. Напиши /start щоб почати знову.")
    return ConversationHandler.END


# ---------------------------------------------------------------------------
# Стандартні
# ---------------------------------------------------------------------------
async def commands_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = texts.commands_text()
    if is_admin(update.effective_user.id):
        text += "\n\n" + texts.admin_commands_text()
    await update.message.reply_text(text)


@require_registered
async def status_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    resolve_pending_work(user_id)
    user = db.get_user(user_id)
    remaining = None
    if user["working_job"] and user["work_end_ts"]:
        remaining = int(user["work_end_ts"] - time.time())
    await update.message.reply_text(texts.status_text(user, remaining_seconds=remaining))


# ---------------------------------------------------------------------------
# Робота (з таймером)
# ---------------------------------------------------------------------------
@require_registered
async def work_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    resolve_pending_work(user_id)

    if not context.args:
        await update.message.reply_text(texts.jobs_list_text())
        return

    code = context.args[0].strip().lower()
    job = JOBS_BY_CODE.get(code)
    if not job:
        await update.message.reply_text(texts.work_unknown_code_text())
        return

    user = db.get_user(user_id)

    if user["working_job"]:
        if user["work_end_ts"]:
            remaining = max(0, int(user["work_end_ts"] - time.time()))
            current_job = JOBS_BY_CODE.get(user["working_job"])
            if current_job:
                await update.message.reply_text(texts.work_busy_text(current_job, remaining))
                return
        else:
            await update.message.reply_text(texts.work_assigned_no_timer_text())
            return

    end_ts = int(time.time()) + job["duration"]
    db.update_user(user_id, working_job=code, work_end_ts=end_ts)
    await update.message.reply_text(texts.work_start_text(job))

    if context.job_queue is not None:
        context.job_queue.run_once(
            work_complete_callback,
            when=job["duration"],
            data=user_id,
            name=f"work_{user_id}",
        )
    else:
        log.warning(
            "JobQueue недоступний — авто-сповіщення про завершення роботи не спрацює. "
            "Встанови залежність: pip install \"python-telegram-bot[job-queue]\""
        )


# ---------------------------------------------------------------------------
# Фракції
# ---------------------------------------------------------------------------
async def factions_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(texts.factions_list_text())


@require_registered
async def faction_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = db.get_user(update.effective_user.id)
    if not user["faction_id"]:
        await update.message.reply_text("Ти ще не у фракції. Переглянь /factions.")
        return
    count = db.count_faction_members(user["faction_id"])
    await update.message.reply_text(texts.faction_info_text(user["faction_id"], count))


@require_registered
async def joinfaction_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    faction_id = parse_int_arg(context, 0)
    if faction_id is None or faction_id not in FACTIONS:
        await update.message.reply_text("Використання: /joinfaction [id] — див. /factions")
        return
    user = db.get_user(update.effective_user.id)
    if user["faction_id"]:
        await update.message.reply_text("Ти вже у фракції. Спочатку /leavefaction.")
        return
    db.update_user(update.effective_user.id, faction_id=faction_id, faction_rank=0)
    f = FACTIONS[faction_id]
    await update.message.reply_text(f"✅ Ти вступив до фракції {f['emoji']} {f['name']}.")


@require_registered
async def leavefaction_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = db.get_user(update.effective_user.id)
    if not user["faction_id"]:
        await update.message.reply_text("Ти не у фракції.")
        return
    db.update_user(update.effective_user.id, faction_id=None, faction_rank=0)
    await update.message.reply_text("✅ Ти вийшов з фракції.")


@require_registered
async def faction_chat_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = db.get_user(update.effective_user.id)
    if not user["faction_id"]:
        await update.message.reply_text("Ти не у фракції.")
        return
    text = " ".join(context.args)
    if not text:
        await update.message.reply_text("Використання: /f [текст]")
        return
    f = FACTIONS[user["faction_id"]]
    members = db.get_faction_members(user["faction_id"])
    payload = f"{f['emoji']} [Фракція] {user['full_name']}: {text}"
    sent = 0
    for m in members:
        if m["user_id"] == user["user_id"]:
            continue
        try:
            await context.bot.send_message(chat_id=m["user_id"], text=payload)
            sent += 1
        except Exception as e:
            log.warning("Не вдалось надіслати повідомлення %s: %s", m["user_id"], e)
    await update.message.reply_text(f"✅ Надіслано {sent} учасникам фракції.")


@require_registered
async def members_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = db.get_user(update.effective_user.id)
    if not user["faction_id"]:
        await update.message.reply_text("Ти не у фракції.")
        return
    members = db.get_faction_members(user["faction_id"])
    lines = [texts.HEADER, "Учасники фракції", texts.DIVIDER]
    for m in members:
        rank_name = FACTION_RANKS[min(m["faction_rank"], len(FACTION_RANKS) - 1)]
        lines.append(f"• {m['full_name']} — {rank_name}")
    lines.append(texts.DIVIDER)
    await update.message.reply_text("\n".join(lines))


@require_registered
async def rank_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = db.get_user(update.effective_user.id)
    if not user["faction_id"]:
        await update.message.reply_text("Ти не у фракції.")
        return
    rank_name = FACTION_RANKS[min(user["faction_rank"], len(FACTION_RANKS) - 1)]
    await update.message.reply_text(f"Твій ранг: {rank_name}")


async def ranks_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(texts.ranks_list_text())


def _target_from_args_or_reply(update: Update, context: ContextTypes.DEFAULT_TYPE, arg_index: int = 0):
    if update.message.reply_to_message:
        return update.message.reply_to_message.from_user.id
    return parse_int_arg(context, arg_index)


@require_registered
async def invite_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = db.get_user(update.effective_user.id)
    if not user["faction_id"]:
        await update.message.reply_text("Ти не у фракції.")
        return
    if user["faction_rank"] < len(FACTION_RANKS) - 2:
        await update.message.reply_text("⚠️ Недостатньо прав, щоб запрошувати.")
        return
    target_id = _target_from_args_or_reply(update, context)
    if not target_id:
        await update.message.reply_text("Використання: /invite [id гравця] (або реплай на повідомлення)")
        return
    target = db.get_user(target_id)
    if not target:
        await update.message.reply_text("Гравця не знайдено (не зареєстрований).")
        return
    if target["faction_id"]:
        await update.message.reply_text("Цей гравець вже у фракції.")
        return
    db.update_user(target_id, faction_id=user["faction_id"], faction_rank=0)
    await update.message.reply_text(f"✅ {target['full_name']} запрошено до фракції.")


@require_registered
async def uninvite_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = db.get_user(update.effective_user.id)
    if not user["faction_id"]:
        await update.message.reply_text("Ти не у фракції.")
        return
    if user["faction_rank"] < len(FACTION_RANKS) - 2:
        await update.message.reply_text("⚠️ Недостатньо прав, щоб звільняти.")
        return
    target_id = _target_from_args_or_reply(update, context)
    if not target_id:
        await update.message.reply_text("Використання: /uninvite [id гравця] (або реплай на повідомлення)")
        return
    target = db.get_user(target_id)
    if not target or target["faction_id"] != user["faction_id"]:
        await update.message.reply_text("Цей гравець не у твоїй фракції.")
        return
    db.update_user(target_id, faction_id=None, faction_rank=0)
    await update.message.reply_text(f"✅ {target['full_name']} звільнено з фракції.")


async def _change_rank(update: Update, context: ContextTypes.DEFAULT_TYPE, delta: int, verb: str):
    user = db.get_user(update.effective_user.id)
    if not user["faction_id"]:
        await update.message.reply_text("Ти не у фракції.")
        return
    if user["faction_rank"] < len(FACTION_RANKS) - 2:
        await update.message.reply_text(f"⚠️ Недостатньо прав, щоб {verb}.")
        return
    target_id = _target_from_args_or_reply(update, context)
    if not target_id:
        await update.message.reply_text(f"Використання: /{'promote' if delta > 0 else 'demote'} [id гравця]")
        return
    target = db.get_user(target_id)
    if not target or target["faction_id"] != user["faction_id"]:
        await update.message.reply_text("Цей гравець не у твоїй фракції.")
        return
    new_rank = max(0, min(len(FACTION_RANKS) - 2, target["faction_rank"] + delta))
    db.update_user(target_id, faction_rank=new_rank)
    rank_name = FACTION_RANKS[new_rank]
    await update.message.reply_text(f"✅ {target['full_name']} тепер має ранг: {rank_name}")


@require_registered
async def promote_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await _change_rank(update, context, +1, "підвищувати")


@require_registered
async def demote_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await _change_rank(update, context, -1, "понижувати")


# ---------------------------------------------------------------------------
# Нерухомість
# ---------------------------------------------------------------------------
async def houses_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(texts.houses_list_text())


async def houseinfo_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    house_id = parse_int_arg(context, 0)
    if house_id is None:
        await update.message.reply_text("Використання: /houseinfo [id]")
        return
    await update.message.reply_text(texts.house_info_text(house_id))


@require_registered
async def house_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = db.get_user(update.effective_user.id)
    await update.message.reply_text(texts.own_house_text(user))


@require_registered
async def buyhouse_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    house_id = parse_int_arg(context, 0)
    if house_id is None or house_id not in HOUSES:
        await update.message.reply_text("Використання: /buyhouse [id] — див. /houses")
        return
    user = db.get_user(update.effective_user.id)
    if user["house_id"]:
        await update.message.reply_text("У тебе вже є нерухомість. Спочатку /sellhouse або /unrent.")
        return
    house = HOUSES[house_id]
    if user["money"] < house["price"]:
        await update.message.reply_text(f"⚠️ Недостатньо коштів. Потрібно {texts.fmt(house['price'])}₴.")
        return
    db.update_user(update.effective_user.id, money=user["money"] - house["price"], house_id=house_id)
    await update.message.reply_text(f"✅ Вітаємо з покупкою: {house['name']}!")


@require_registered
async def sellhouse_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = db.get_user(update.effective_user.id)
    if not user["house_id"]:
        await update.message.reply_text("У тебе немає нерухомості.")
        return
    house = HOUSES[user["house_id"]]
    refund = house["price"] // 2
    db.update_user(
        update.effective_user.id,
        house_id=None, house_locked=0, inside_house=0,
        money=user["money"] + refund,
    )
    await update.message.reply_text(f"✅ Будинок продано. Отримано {texts.fmt(refund)}₴.")


@require_registered
async def unrent_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = db.get_user(update.effective_user.id)
    if not user["house_id"]:
        await update.message.reply_text("Ти зараз нічого не орендуєш.")
        return
    house = HOUSES[user["house_id"]]
    if not house["rentable"]:
        await update.message.reply_text("Ця нерухомість не є орендованою — використай /sellhouse.")
        return
    db.update_user(update.effective_user.id, house_id=None, house_locked=0, inside_house=0)
    await update.message.reply_text("✅ Ти виселився з квартири.")


@require_registered
async def enter_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = db.get_user(update.effective_user.id)
    if not user["house_id"]:
        await update.message.reply_text("У тебе немає будинку, куди заходити.")
        return
    if user["house_locked"]:
        await update.message.reply_text("🔒 Будинок замкнено.")
        return
    db.update_user(update.effective_user.id, inside_house=1)
    await update.message.reply_text("🚪 Ти зайшов у будинок.")


@require_registered
async def exit_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = db.get_user(update.effective_user.id)
    if not user["inside_house"]:
        await update.message.reply_text("Ти зараз не в будинку.")
        return
    db.update_user(update.effective_user.id, inside_house=0)
    await update.message.reply_text("🚪 Ти вийшов.")


@require_registered
async def lock_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = db.get_user(update.effective_user.id)
    if not user["house_id"]:
        await update.message.reply_text("У тебе немає будинку.")
        return
    new_state = 0 if user["house_locked"] else 1
    db.update_user(update.effective_user.id, house_locked=new_state)
    await update.message.reply_text("🔒 Замкнено." if new_state else "🔓 Відімкнено.")


# ---------------------------------------------------------------------------
# Бізнеси
# ---------------------------------------------------------------------------
async def businesses_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    owned = {bid: db.get_business_owner(bid) for bid in BUSINESSES}
    await update.message.reply_text(texts.businesses_list_text(owned))


@require_registered
async def business_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    owned_ids = db.get_owned_businesses(update.effective_user.id)
    if not owned_ids:
        await update.message.reply_text("У тебе немає бізнесів. Переглянь /businesses.")
        return
    lines = [texts.HEADER, "Твої бізнеси", texts.DIVIDER]
    for bid in owned_ids:
        b = BUSINESSES[bid]
        lines.append(f"[{bid:03d}] {b['emoji']} {b['name']}")
    lines.append(texts.DIVIDER)
    await update.message.reply_text("\n".join(lines))


@require_registered
async def buybusiness_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    business_id = parse_int_arg(context, 0)
    if business_id is None or business_id not in BUSINESSES:
        await update.message.reply_text("Використання: /buybusiness [id] — див. /businesses")
        return
    if db.get_business_owner(business_id):
        await update.message.reply_text("Цей бізнес вже проданий.")
        return
    user = db.get_user(update.effective_user.id)
    b = BUSINESSES[business_id]
    if user["money"] < b["price"]:
        await update.message.reply_text(f"⚠️ Недостатньо коштів. Потрібно {texts.fmt(b['price'])}₴.")
        return
    db.update_user(update.effective_user.id, money=user["money"] - b["price"])
    db.buy_business(business_id, update.effective_user.id)
    await update.message.reply_text(f"✅ Вітаємо з покупкою: {b['emoji']} {b['name']}!")


@require_registered
async def sellbusiness_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    business_id = parse_int_arg(context, 0)
    if business_id is None or business_id not in BUSINESSES:
        await update.message.reply_text("Використання: /sellbusiness [id]")
        return
    owner = db.get_business_owner(business_id)
    if owner != update.effective_user.id:
        await update.message.reply_text("Це не твій бізнес.")
        return
    b = BUSINESSES[business_id]
    refund = b["price"] // 2
    db.sell_business(business_id)
    user = db.get_user(update.effective_user.id)
    db.update_user(update.effective_user.id, money=user["money"] + refund)
    await update.message.reply_text(f"✅ Бізнес продано. Отримано {texts.fmt(refund)}₴.")


# ---------------------------------------------------------------------------
# Адмін-команди
# ---------------------------------------------------------------------------
def _admin_usage(cmd: str, args_hint: str) -> str:
    return f"Використання: /{cmd} {args_hint}"


@require_admin
async def setmoney_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    target_id = parse_int_arg(context, 0)
    amount = parse_int_arg(context, 1)
    if target_id is None or amount is None:
        await update.message.reply_text(_admin_usage("setmoney", "[ID] [сума]"))
        return
    if not db.get_user(target_id):
        await update.message.reply_text("Гравця не знайдено.")
        return
    db.update_user(target_id, money=max(0, amount))
    await update.message.reply_text(f"✅ Гроші гравця {target_id} встановлено: {texts.fmt(max(0, amount))}₴")


@require_admin
async def givemoney_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    target_id = parse_int_arg(context, 0)
    amount = parse_int_arg(context, 1)
    if target_id is None or amount is None:
        await update.message.reply_text(_admin_usage("givemoney", "[ID] [сума]"))
        return
    target = db.get_user(target_id)
    if not target:
        await update.message.reply_text("Гравця не знайдено.")
        return
    new_money = target["money"] + amount
    db.update_user(target_id, money=max(0, new_money))
    await update.message.reply_text(f"✅ Видано {texts.fmt(amount)}₴ гравцю {target_id}. Баланс: {texts.fmt(max(0, new_money))}₴")


@require_admin
async def takemoney_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    target_id = parse_int_arg(context, 0)
    amount = parse_int_arg(context, 1)
    if target_id is None or amount is None:
        await update.message.reply_text(_admin_usage("takemoney", "[ID] [сума]"))
        return
    target = db.get_user(target_id)
    if not target:
        await update.message.reply_text("Гравця не знайдено.")
        return
    new_money = max(0, target["money"] - amount)
    db.update_user(target_id, money=new_money)
    await update.message.reply_text(f"✅ Забрано {texts.fmt(amount)}₴ у гравця {target_id}. Баланс: {texts.fmt(new_money)}₴")


@require_admin
async def setbank_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    target_id = parse_int_arg(context, 0)
    amount = parse_int_arg(context, 1)
    if target_id is None or amount is None:
        await update.message.reply_text(_admin_usage("setbank", "[ID] [сума]"))
        return
    if not db.get_user(target_id):
        await update.message.reply_text("Гравця не знайдено.")
        return
    db.update_user(target_id, bank=max(0, amount))
    await update.message.reply_text(f"✅ Банк гравця {target_id} встановлено: {texts.fmt(max(0, amount))}₴")


@require_admin
async def setlevel_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    target_id = parse_int_arg(context, 0)
    level = parse_int_arg(context, 1)
    if target_id is None or level is None or level < 0:
        await update.message.reply_text(_admin_usage("setlevel", "[ID] [рівень]"))
        return
    if not db.get_user(target_id):
        await update.message.reply_text("Гравця не знайдено.")
        return
    db.update_user(target_id, level=level, exp=0)
    await update.message.reply_text(f"✅ Рівень гравця {target_id} встановлено: {level}")


@require_admin
async def setxp_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    target_id = parse_int_arg(context, 0)
    xp = parse_int_arg(context, 1)
    if target_id is None or xp is None or xp < 0:
        await update.message.reply_text(_admin_usage("setxp", "[ID] [XP]"))
        return
    if not db.get_user(target_id):
        await update.message.reply_text("Гравця не знайдено.")
        return
    set_xp_absolute(target_id, xp)
    updated = db.get_user(target_id)
    await update.message.reply_text(
        f"✅ XP гравця {target_id} встановлено. Тепер рівень {updated['level']}, XP {updated['exp']}."
    )


@require_admin
async def setjob_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    target_id = parse_int_arg(context, 0)
    if target_id is None or len(context.args) < 2:
        await update.message.reply_text(_admin_usage("setjob", "[ID] [код роботи]"))
        return
    code = context.args[1].strip().lower()
    job = JOBS_BY_CODE.get(code)
    if not job:
        await update.message.reply_text("⚠️ Невідома робота. Доступні коди дивись у /work.")
        return
    if not db.get_user(target_id):
        await update.message.reply_text("Гравця не знайдено.")
        return
    db.update_user(target_id, working_job=code, work_end_ts=None)
    await update.message.reply_text(f"✅ Гравцю {target_id} видано роботу: {job['emoji']} {job['name']}")


@require_admin
async def fireplayer_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    target_id = parse_int_arg(context, 0)
    if target_id is None:
        await update.message.reply_text(_admin_usage("fireplayer", "[ID]"))
        return
    if not db.get_user(target_id):
        await update.message.reply_text("Гравця не знайдено.")
        return
    db.update_user(target_id, working_job=None, work_end_ts=None)
    await update.message.reply_text(f"✅ Гравця {target_id} звільнено з роботи.")


@require_admin
async def setfamily_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    target_id = parse_int_arg(context, 0)
    if target_id is None or len(context.args) < 2:
        await update.message.reply_text(_admin_usage("setfamily", "[ID] [сім'я]"))
        return
    family_name = " ".join(context.args[1:]).strip()
    if not db.get_user(target_id):
        await update.message.reply_text("Гравця не знайдено.")
        return
    db.update_user(target_id, family=family_name)
    await update.message.reply_text(f"✅ Гравця {target_id} додано в сім'ю: {family_name}")


@require_admin
async def kickfamily_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    target_id = parse_int_arg(context, 0)
    if target_id is None:
        await update.message.reply_text(_admin_usage("kickfamily", "[ID]"))
        return
    if not db.get_user(target_id):
        await update.message.reply_text("Гравця не знайдено.")
        return
    db.update_user(target_id, family="")
    await update.message.reply_text(f"✅ Гравця {target_id} вигнано із сім'ї.")


# ---------------------------------------------------------------------------
# Обробка помилок
# ---------------------------------------------------------------------------
async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE):
    log.error("Помилка під час обробки апдейту:", exc_info=context.error)
    if isinstance(update, Update) and update.effective_message:
        try:
            await update.effective_message.reply_text(
                "⚠️ Сталася помилка. Спробуй ще раз або звернись до адміністрації."
            )
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Точка входу
# ---------------------------------------------------------------------------
def build_app() -> Application:
    app = ApplicationBuilder().token(BOT_TOKEN).build()

    reg_handler = ConversationHandler(
        entry_points=[CommandHandler("start", start)],
        states={ASK_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, receive_name)]},
        fallbacks=[CommandHandler("cancel", cancel_registration)],
        name="registration",
        persistent=False,
    )
    app.add_handler(reg_handler)

    # Стандартні
    app.add_handler(CommandHandler(["commands", "Commands"], commands_cmd))
    app.add_handler(CommandHandler(["status", "Status"], status_cmd))

    # Робота
    app.add_handler(CommandHandler(["work", "Work"], work_cmd))

    # Фракції
    app.add_handler(CommandHandler("factions", factions_cmd))
    app.add_handler(CommandHandler("faction", faction_cmd))
    app.add_handler(CommandHandler("joinfaction", joinfaction_cmd))
    app.add_handler(CommandHandler("leavefaction", leavefaction_cmd))
    app.add_handler(CommandHandler("f", faction_chat_cmd))
    app.add_handler(CommandHandler("members", members_cmd))
    app.add_handler(CommandHandler("rank", rank_cmd))
    app.add_handler(CommandHandler("ranks", ranks_cmd))
    app.add_handler(CommandHandler("invite", invite_cmd))
    app.add_handler(CommandHandler("uninvite", uninvite_cmd))
    app.add_handler(CommandHandler("promote", promote_cmd))
    app.add_handler(CommandHandler("demote", demote_cmd))

    # Нерухомість
    app.add_handler(CommandHandler("house", house_cmd))
    app.add_handler(CommandHandler("houses", houses_cmd))
    app.add_handler(CommandHandler("buyhouse", buyhouse_cmd))
    app.add_handler(CommandHandler("sellhouse", sellhouse_cmd))
    app.add_handler(CommandHandler("unrent", unrent_cmd))
    app.add_handler(CommandHandler("enter", enter_cmd))
    app.add_handler(CommandHandler("exit", exit_cmd))
    app.add_handler(CommandHandler("lock", lock_cmd))
    app.add_handler(CommandHandler("houseinfo", houseinfo_cmd))

    # Бізнеси
    app.add_handler(CommandHandler("businesses", businesses_cmd))
    app.add_handler(CommandHandler("business", business_cmd))
    app.add_handler(CommandHandler("buybusiness", buybusiness_cmd))
    app.add_handler(CommandHandler("sellbusiness", sellbusiness_cmd))

    # Адмін
    app.add_handler(CommandHandler("setmoney", setmoney_cmd))
    app.add_handler(CommandHandler("givemoney", givemoney_cmd))
    app.add_handler(CommandHandler("takemoney", takemoney_cmd))
    app.add_handler(CommandHandler("setbank", setbank_cmd))
    app.add_handler(CommandHandler("setlevel", setlevel_cmd))
    app.add_handler(CommandHandler("setxp", setxp_cmd))
    app.add_handler(CommandHandler("setjob", setjob_cmd))
    app.add_handler(CommandHandler("fireplayer", fireplayer_cmd))
    app.add_handler(CommandHandler("setfamily", setfamily_cmd))
    app.add_handler(CommandHandler("kickfamily", kickfamily_cmd))

    app.add_error_handler(error_handler)
    return app


def main():
    db.init_db()
    app = build_app()
    log.info("Бот запускається...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()

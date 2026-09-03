# -*- coding: utf-8 -*-
"""
Шаблони повідомлень.
"""
from data import (
    JOBS, JOBS_BY_CODE, FACTIONS, BUSINESSES, HOUSES, FACTION_RANKS,
    exp_needed_for_level, format_duration,
)

HEADER = "🟩Life+ RP Telegram🟩\n—————————————"
DIVIDER = "—————————————"


def fmt(n: int) -> str:
    """Форматує число з пробілом як роздільником тисяч: 2847 -> '2 847'."""
    return f"{n:,}".replace(",", " ")


def welcome_registration_text() -> str:
    return (
        f"{HEADER}\n"
        "Ласкаво просимо до\n"
        "нашого 🏙️міста. Але щоб почати, треба спочатку зареєструватися!\n"
        f"{DIVIDER}\n"
        "Ваше Прізвище та ім'я(David_Bondarenko)"
    )


def registration_format_error_text() -> str:
    return (
        "⚠️ Невірний формат.\n"
        "Введіть Прізвище_Ім'я у форматі: David_Bondarenko"
    )


def status_text(user, remaining_seconds: int = None) -> str:
    needed = exp_needed_for_level(user["level"])

    job_line = "—"
    if user["working_job"]:
        job = JOBS_BY_CODE.get(user["working_job"])
        if job:
            if remaining_seconds is not None and remaining_seconds > 0:
                job_line = f"{job['emoji']} {job['name']} (залишилось {format_duration(remaining_seconds)})"
            else:
                job_line = f"{job['emoji']} {job['name']}"

    family_line = user["family"] if user["family"] else "—"
    name_line = user["full_name"] if user["full_name"] else "(Ім'я_Прізвище)"

    return (
        f"{HEADER}\n"
        f"👤 {name_line}\n"
        f"🆔 ID. {user['user_id']}\n"
        f"⭐ Рівень. {user['level']} ({user['exp']}/{needed})\n"
        f"💵 Гроші. {fmt(user['money'])} ₴\n"
        f"🪙 Монета. {fmt(user['coins'])}\n"
        f"⚒️ Робота: {job_line}\n"
        f"👥 Сім'я: {family_line}\n"
        f"{DIVIDER}"
    )


def commands_text() -> str:
    return (
        "-------------------------------------------------\n"
        "Команди:\n\n"
        "Стандартні:\n\n"
        "/start - початок\n"
        "/commands - показує всі команди\n"
        "/status - показує статистику гравця\n\n"
        "Робота:\n\n"
        "/work - показує список робіт\n"
        "/workinfo [id] - інформація про роботу\n"
        "/emjoy [id] - влаштуватися на роботу\n"
        "/fire - звільнитися\n\n"
        "Фракції:\n\n"
        "/factions — список усіх фракцій\n"
        "/faction — інформація про свою фракцію\n"
        "/joinfaction [id] — вступити до фракції\n"
        "/leavefaction — вийти з фракції\n"
        "/f [текст] — чат фракції\n"
        "/members — список членів фракції\n"
        "/rank — свій ранг\n"
        "/ranks — список рангів\n"
        "/invite [id] — запросити гравця\n"
        "/uninvite [id] — звільнити гравця\n"
        "/promote [id] — підвищити ранг\n"
        "/demote [id] — понизити ранг\n\n"
        "Доми/Квартири/Вілли:\n\n"
        "/house — інформація про будинок\n"
        "/houses — список будинків\n"
        "/buyhouse [id] — купити будинок\n"
        "/sellhouse — продати будинок\n"
        "/unrent — виселитися з квартири\n"
        "/enter — зайти в будинок/квартиру\n"
        "/exit — вийти\n"
        "/lock — замкнути/відімкнути\n"
        "/houseinfo [id] — інформація про нерухомість\n\n"
        "Бізнеси:\n\n"
        "/businesses — список бізнесів\n"
        "/business — інформація про свій бізнес\n"
        "/buybusiness [id] — купити бізнес\n"
        "/sellbusiness [id] — продати бізнес\n"
        "----------------------------------------"
    )


def admin_commands_text() -> str:
    return (
        "Адмін команди:\n\n"
        "/setmoney [ID] [сума] — Встановити гроші\n"
        "/givemoney [ID] [сума] — Видати гроші\n"
        "/takemoney [ID] [сума] — Забрати гроші\n"
        "/setbank [ID] [сума] — Встановити гроші в банку\n"
        "/setlevel [ID] [рівень] — Встановити рівень\n"
        "/setxp [ID] [XP] — Встановити досвід\n"
        "/setjob [ID] [робота] — Видати роботу\n"
        "/fireplayer [ID] — Звільнити з роботи\n"
        "/setfamily [ID] [сім'я] — Додати в сім'ю\n"
        "/kickfamily [ID] — Вигнати із сім'ї"
    )


# ---------------------------------------------------------------------------
# Робота
# ---------------------------------------------------------------------------
def jobs_list_text() -> str:
    lines = [HEADER, "Ось повний список", DIVIDER]
    for jid, job in JOBS.items():
        lines.append(f"[{jid:02d}] {job['emoji']} {job['name']} ({job['level_required']} рівень)")
    lines.append(DIVIDER)
    return "\n".join(lines)


def job_info_text(job_id: int) -> str:
    job = JOBS.get(job_id)
    if not job:
        return "⚠️ Роботу з таким ID не знайдено. Переглянь /work."
    return (
        f"{HEADER}\n"
        f"[{job_id:02d}] {job['emoji']} {job['name']}\n"
        f"{DIVIDER}\n"
        f"Команда: /emjoy {job_id:02d}\n"
        f"⭐ Потрібен рівень: {job['level_required']}\n"
        f"⏱ Час роботи: {format_duration(job['duration'])}\n"
        f"💰 Зарплата: {job['salary_min']}–{job['salary_max']} ₴\n"
        f"{DIVIDER}"
    )


def work_start_text(job: dict) -> str:
    duration_str = format_duration(job["duration"])
    return (
        f"{job['emoji']} {job['name']}\n"
        f"Ви почали працювати {job['label']}.\n"
        f"⏳ Час роботи: {duration_str}\n"
        f"💰 Орієнтовна зарплата: {job['salary_min']}–{job['salary_max']} ₴\n"
        f"🔄 Поверніться через {duration_str}."
    )


def work_busy_text(job: dict, remaining_seconds: int) -> str:
    return (
        f"⏳ Ти вже працюєш ({job['emoji']} {job['name']}).\n"
        f"Залишилось: {format_duration(remaining_seconds)}"
    )


def work_assigned_no_timer_text() -> str:
    return "⚠️ Тобі призначена робота адміністрацією. Спершу /fire, щоб почати нову зміну."


def work_complete_text(job: dict, earned: int, balance: int) -> str:
    return (
        "✅ Роботу завершено!\n"
        f"{job['emoji']} {job['complete_desc']}\n"
        f"💰 Зароблено: {fmt(earned)} ₴\n"
        f"💳 Баланс: {fmt(balance)} ₴\n"
        "🔄 Наступна робота доступна!"
    )


def work_unknown_id_text() -> str:
    return "⚠️ Невідома робота. Переглянь /work, щоб побачити список і ID."


def work_level_too_low_text(job: dict, current_level: int) -> str:
    return (
        f"⚠️ Потрібен {job['level_required']} рівень для роботи "
        f"{job['emoji']} {job['name']}, у тебе {current_level}."
    )


def fire_success_text(job: dict) -> str:
    return f"🚪 Ти звільнився з роботи {job['emoji']} {job['name']} достроково. Зарплата за цю зміну не нарахована."


def fire_not_working_text() -> str:
    return "Ти зараз ніде не працюєш."



# ---------------------------------------------------------------------------
# Фракції
# ---------------------------------------------------------------------------
def factions_list_text() -> str:
    lines = [HEADER, "Ось повний список", DIVIDER]
    for fid, f in FACTIONS.items():
        lines.append(f"[{fid:02d}] {f['emoji']} {f['name']}")
    lines.append(DIVIDER)
    return "\n".join(lines)


def faction_info_text(faction_id: int, member_count: int) -> str:
    f = FACTIONS.get(faction_id)
    if not f:
        return "⚠️ Фракцію не знайдено."
    return (
        f"{HEADER}\n"
        f"{f['emoji']} {f['name']}\n"
        f"{DIVIDER}\n"
        f"👥 Учасників: {member_count}\n"
        f"{DIVIDER}"
    )


def ranks_list_text() -> str:
    lines = [HEADER, "Ранги фракції", DIVIDER]
    for i, name in enumerate(FACTION_RANKS):
        lines.append(f"[{i}] {name}")
    lines.append(DIVIDER)
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Нерухомість
# ---------------------------------------------------------------------------
def houses_list_text() -> str:
    lines = [HEADER, "Ось повний список", DIVIDER]
    for hid, h in HOUSES.items():
        kind = "оренда/купівля" if h["rentable"] else "купівля"
        lines.append(f"[{hid:02d}] 🏠 {h['name']} [{fmt(h['price'])}₴] ({kind})")
    lines.append(DIVIDER)
    return "\n".join(lines)


def house_info_text(house_id: int) -> str:
    h = HOUSES.get(house_id)
    if not h:
        return "⚠️ Будинок з таким ID не знайдено."
    interior_lines = "\n".join(f"{emoji} {qty}× {name}" for emoji, qty, name in h["interior"])
    return (
        f"{HEADER}\n"
        f"🏠 {h['name']}\n"
        f"{DIVIDER}\n"
        "Інтер'єр:\n"
        f"{interior_lines}\n"
        f"{DIVIDER}\n"
        f"💰 Вартість: {fmt(h['price'])}₴\n"
        f"{DIVIDER}"
    )


def own_house_text(user) -> str:
    house_id = user["house_id"]
    if not house_id:
        return (
            f"{HEADER}\n"
            "🏠 У тебе ще немає будинку.\n"
            "Скористайся /houses, щоб переглянути список.\n"
            f"{DIVIDER}"
        )
    h = HOUSES.get(house_id)
    interior_lines = "\n".join(f"{emoji} {qty}× {name}" for emoji, qty, name in h["interior"])
    lock_state = "🔒 Замкнено" if user["house_locked"] else "🔓 Відкрито"
    return (
        f"{HEADER}\n"
        f"🏠 Ось твій дім — {h['name']}\n"
        f"{DIVIDER}\n"
        "Інтер'єр:\n"
        f"{interior_lines}\n"
        f"{DIVIDER}\n"
        f"{lock_state}\n"
        "💰 Вартість: —\n"
        f"{DIVIDER}"
    )


# ---------------------------------------------------------------------------
# Бізнеси
# ---------------------------------------------------------------------------
def businesses_list_text(owned_ids: dict) -> str:
    lines = [HEADER, "Ось повний список", DIVIDER]
    for bid, b in BUSINESSES.items():
        owner = owned_ids.get(bid)
        mark = " ✅ (продано)" if owner else ""
        lines.append(f"[{bid:03d}]{b['emoji']}{b['name']} [{fmt(b['price'])}₴]{mark}")
    lines.append(DIVIDER)
    return "\n".join(lines)

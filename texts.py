# -*- coding: utf-8 -*-
"""
Шаблони повідомлень — відтворюють формат, заданий у ТЗ.
"""
from data import JOBS, FACTIONS, BUSINESSES, HOUSES, FACTION_RANKS, exp_needed_for_level

HEADER = "🟩Life+ RP Telegram🟩\n—————————————"
DIVIDER = "—————————————"


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


def status_text(user) -> str:
    needed = exp_needed_for_level(user["level"])
    return (
        f"{HEADER}\n"
        f"🆔 ID. {user['user_id']}\n"
        f"⭐ Рівень. {user['level']} ({user['exp']}/{needed})\n"
        f"💵 Гроші. {user['money']} ₴\n"
        f"🪙 Монета. {user['coins']}\n"
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
        "/work - показує які є роботи.\n"
        "/fire - звільнитися.\n"
        "/workinfo [id] - інформація про роботу.\n"
        "/emjoy [id] - влаштуватися на роботу\n\n"
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


def jobs_list_text() -> str:
    lines = [HEADER, "Ось повний список", DIVIDER]
    for job_id, job in JOBS.items():
        lines.append(f"[{job_id:02d}] {job['emoji']} {job['name']} ({job['level_required']} рівень)")
    lines.append(DIVIDER)
    return "\n".join(lines)


def job_info_text(job_id: int) -> str:
    job = JOBS.get(job_id)
    if not job:
        return "⚠️ Роботу з таким ID не знайдено."
    return (
        f"{HEADER}\n"
        f"{job['emoji']} {job['name']}\n"
        f"{DIVIDER}\n"
        f"🆔 ID: {job_id:02d}\n"
        f"⭐ Потрібен рівень: {job['level_required']}\n"
        f"💵 Зарплата: {job['salary']} ₴ за зміну\n"
        f"{DIVIDER}"
    )


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


def houses_list_text() -> str:
    lines = [HEADER, "Ось повний список", DIVIDER]
    for hid, h in HOUSES.items():
        kind = "оренда/купівля" if h["rentable"] else "купівля"
        lines.append(f"[{hid:02d}] 🏠 {h['name']} [{h['price']:,}₴] ({kind})".replace(",", "."))
    lines.append(DIVIDER)
    return "\n".join(lines)


def house_info_text(house_id: int) -> str:
    h = HOUSES.get(house_id)
    if not h:
        return "⚠️ Будинок з таким ID не знайдено."
    interior_lines = "\n".join(f"{emoji} {qty}× {name}" for emoji, qty, name in h["interior"])
    price = f"{h['price']:,}".replace(",", ".")
    return (
        f"{HEADER}\n"
        f"🏠 {h['name']}\n"
        f"{DIVIDER}\n"
        "Інтер'єр:\n"
        f"{interior_lines}\n"
        f"{DIVIDER}\n"
        f"💰 Вартість: {price}₴\n"
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
        f"💰 Вартість: —\n"
        f"{DIVIDER}"
    )


def businesses_list_text(owned_ids: dict) -> str:
    """owned_ids: {business_id: owner_id or None}"""
    lines = [HEADER, "Ось повний список", DIVIDER]
    for bid, b in BUSINESSES.items():
        price = f"{b['price']:,}".replace(",", ".")
        owner = owned_ids.get(bid)
        mark = " ✅ (продано)" if owner else ""
        lines.append(f"[{bid:03d}]{b['emoji']}{b['name']} [{price}₴]{mark}")
    lines.append(DIVIDER)
    return "\n".join(lines)

# -*- coding: utf-8 -*-
"""
Статичні дані гри Life+ RP: роботи (з таймером), фракції, будинки,
бізнеси, ранги, таблиця рівнів.
"""

# ---------------------------------------------------------------------------
# РОБОТИ
# id -> {code, name, emoji, duration (сек), salary_min, salary_max, xp, label, complete_desc}
# code — це те, що пишеться після /work, напр. /work mine
# ---------------------------------------------------------------------------
JOBS = {
    1: {
        "code": "wood", "name": "Лісопилка", "emoji": "🪵",
        "duration": 120, "salary_min": 180, "salary_max": 250, "xp": 3,
        "label": "лісорубом",
        "complete_desc": "Ви нарубали дерева та здали його на склад.",
    },
    2: {
        "code": "mine", "name": "Шахта", "emoji": "🪨",
        "duration": 180, "salary_min": 280, "salary_max": 380, "xp": 4,
        "label": "шахтарем",
        "complete_desc": "Ви добули руду та здали її на склад.",
    },
    3: {
        "code": "farm", "name": "Ферма", "emoji": "🚜",
        "duration": 150, "salary_min": 220, "salary_max": 320, "xp": 3,
        "label": "фермером",
        "complete_desc": "Ви зібрали врожай та здали його на склад.",
    },
    4: {
        "code": "loader", "name": "Вантажник", "emoji": "📦",
        "duration": 90, "salary_min": 130, "salary_max": 200, "xp": 2,
        "label": "вантажником",
        "complete_desc": "Ви розвантажили фуру та отримали оплату.",
    },
    5: {
        "code": "delivery", "name": "Доставка їжі", "emoji": "🛵",
        "duration": 120, "salary_min": 180, "salary_max": 280, "xp": 3,
        "label": "кур'єром",
        "complete_desc": "Ви доставили замовлення клієнту.",
    },
    6: {
        "code": "cleaner", "name": "Прибиральник", "emoji": "🧹",
        "duration": 60, "salary_min": 80, "salary_max": 140, "xp": 1,
        "label": "прибиральником",
        "complete_desc": "Ви прибрали територію та здали зміну.",
    },
    7: {
        "code": "factory", "name": "Завод", "emoji": "🏭",
        "duration": 180, "salary_min": 350, "salary_max": 500, "xp": 5,
        "label": "робітником заводу",
        "complete_desc": "Ви виготовили партію продукції на заводі.",
    },
    8: {
        "code": "electrician", "name": "Електрик", "emoji": "⚡",
        "duration": 240, "salary_min": 500, "salary_max": 700, "xp": 6,
        "label": "електриком",
        "complete_desc": "Ви усунули несправність проводки.",
    },
}

# code -> job dict (з доданим полем "id")
JOBS_BY_CODE = {job["code"]: {**job, "id": jid} for jid, job in JOBS.items()}


def format_duration(seconds: int) -> str:
    seconds = max(0, int(seconds))
    m, s = divmod(seconds, 60)
    parts = []
    if m:
        parts.append(f"{m} хв")
    if s:
        parts.append(f"{s} с")
    return " ".join(parts) if parts else "0 с"


# ---------------------------------------------------------------------------
# ФРАКЦІЇ
# ---------------------------------------------------------------------------
FACTIONS = {
    1: {"name": "НПУ",  "emoji": "🚔"},
    2: {"name": "ДСНС", "emoji": "🚒"},
    3: {"name": "СБУ",  "emoji": "🚓"},
    4: {"name": "ЗСУ",  "emoji": "🚓"},
    5: {"name": "ЕМД",  "emoji": "🚑"},
}

FACTION_RANKS = [
    "Рекрут",
    "Боєць",
    "Молодший сержант",
    "Сержант",
    "Заступник",
    "Лідер",
]

# ---------------------------------------------------------------------------
# БІЗНЕСИ
# ---------------------------------------------------------------------------
BUSINESSES = {
    1:  {"name": "АТБ №1", "emoji": "🏪", "price": 250_000},
    2:  {"name": "АТБ №2", "emoji": "🏪", "price": 250_000},
    3:  {"name": "АТБ №3", "emoji": "🏪", "price": 250_000},
    4:  {"name": "АТБ №4", "emoji": "🏪", "price": 250_000},
    5:  {"name": "АТБ №5", "emoji": "🏪", "price": 250_000},
    6:  {"name": "АТБ №6", "emoji": "🏪", "price": 250_000},
    7:  {"name": "АТБ №7", "emoji": "🏪", "price": 250_000},
    8:  {"name": "АТБ №8", "emoji": "🏪", "price": 250_000},
    9:  {"name": "АТБ №9", "emoji": "🏪", "price": 250_000},
    10: {"name": "АТБ №10", "emoji": "🏪", "price": 250_000},
    11: {"name": "АТБ №11", "emoji": "🏪", "price": 250_000},
    12: {"name": "АТБ №12", "emoji": "🏪", "price": 250_000},
    13: {"name": "Автосалон економ",  "emoji": "🚙", "price": 10_000_000},
    14: {"name": "Автосалон середній", "emoji": "🚗", "price": 25_000_000},
    15: {"name": "Автосалон преміум", "emoji": "🚗", "price": 60_000_000},
    16: {"name": "Автосалон люкс",    "emoji": "🏎️", "price": 150_000_000},
    17: {"name": "Мотосалон",         "emoji": "🏍️", "price": 15_000_000},
    18: {"name": "Магазин одягу",     "emoji": "👕", "price": 4_000_000},
    19: {"name": "Магазин одягу",     "emoji": "👕", "price": 4_000_000},
}

# ---------------------------------------------------------------------------
# НЕРУХОМІСТЬ
# ---------------------------------------------------------------------------
DEFAULT_INTERIOR = [
    ("🛏️", 1, "Ліжко"),
    ("🧊", 1, "Холодильник"),
    ("🪑", 1, "Стіл"),
    ("🪑", 2, "Стільчики"),
    ("🚪", 1, "Шафа"),
]

HOUSES = {
    1: {"name": "Квартира-студія", "price": 80_000,    "rentable": True,  "interior": DEFAULT_INTERIOR},
    2: {"name": "1-кімнатна квартира", "price": 150_000, "rentable": True,  "interior": DEFAULT_INTERIOR},
    3: {"name": "2-кімнатна квартира", "price": 300_000, "rentable": True,  "interior": DEFAULT_INTERIOR},
    4: {"name": "Приватний будинок", "price": 750_000,  "rentable": False, "interior": DEFAULT_INTERIOR},
    5: {"name": "Вілла",            "price": 2_500_000, "rentable": False, "interior": DEFAULT_INTERIOR},
}

# ---------------------------------------------------------------------------
# ТАБЛИЦЯ РІВНІВ
# Скільки XP потрібно набрати НА поточному рівні, щоб перейти на наступний.
# Рівні 12+ рахуються за формулою: 270 + 50 * (рівень - 12)
# ---------------------------------------------------------------------------
LEVEL_XP_TABLE = {
    0: 10, 1: 14, 2: 20, 3: 30, 4: 45, 5: 60, 6: 80,
    7: 105, 8: 130, 9: 155, 10: 185, 11: 220, 12: 270,
}
LEVEL_FORMULA_BASE = 12       # з якого рівня починає діяти формула
LEVEL_FORMULA_BASE_XP = 270   # XP на LEVEL_FORMULA_BASE
LEVEL_FORMULA_STEP = 50       # +50 XP за кожен наступний рівень


def exp_needed_for_level(level: int) -> int:
    if level in LEVEL_XP_TABLE:
        return LEVEL_XP_TABLE[level]
    if level > LEVEL_FORMULA_BASE:
        return LEVEL_FORMULA_BASE_XP + LEVEL_FORMULA_STEP * (level - LEVEL_FORMULA_BASE)
    return LEVEL_FORMULA_BASE_XP

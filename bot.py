"""
Life+ RP Telegram Bot
Версія: v0.1.0
Зміни: реєстрація, підтвердження імені, профіль, базова команда адміністратора.
Файли: bot.py, requirements.txt, README.md
"""

import asyncio
import os
import re

import asyncpg
from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
)

BOT_TOKEN = ("8578006162:AAEVE9rS8KTVNDQRXkhQGpY4ztB8r-KRdXE")
DATABASE_URL = os.getenv("DATABASE_URL")
ADMIN_ID = 1752219373

bot = Bot(token=BOT_TOKEN) if BOT_TOKEN else None
dp = Dispatcher(storage=MemoryStorage())
db_pool: asyncpg.Pool | None = None


class Registration(StatesGroup):
    nickname = State()
    confirmation = State()


def registration_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(
                text="✅ Підтвердити",
                callback_data="reg:confirm",
            )],
            [InlineKeyboardButton(
                text="✏️ Змінити ім'я",
                callback_data="reg:change",
            )],
        ]
    )


def profile_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(
                text="👤 Мій профіль",
                callback_data="profile:show",
            )]
        ]
    )


async def init_db() -> None:
    """Створює таблицю гравців у PostgreSQL."""
    global db_pool
    if not DATABASE_URL:
        raise RuntimeError(
            "Не задано DATABASE_URL. Додай у Railway змінну "
            "DATABASE_URL від сервісу PostgreSQL."
        )

    db_pool = await asyncpg.create_pool(DATABASE_URL)
    async with db_pool.acquire() as conn:
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS players (
                user_id BIGINT PRIMARY KEY,
                nickname VARCHAR(46) UNIQUE NOT NULL,
                level INTEGER NOT NULL DEFAULT 1,
                xp INTEGER NOT NULL DEFAULT 0,
                money BIGINT NOT NULL DEFAULT 1000,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )


async def get_player(user_id: int):
    assert db_pool is not None
    async with db_pool.acquire() as conn:
        return await conn.fetchrow(
            """
            SELECT user_id, nickname, level, xp, money
            FROM players
            WHERE user_id = $1
            """,
            user_id,
        )


async def build_profile(user_id: int) -> str:
    player = await get_player(user_id)
    if not player:
        return "❌ Профіль не знайдено. Натисни /start."

    return (
        "👤 ПРОФІЛЬ LIFE+ RP\n\n"
        f"🪪 Ім'я: {player['nickname']}\n"
        f"⭐ Рівень: {player['level']}\n"
        f"✨ Досвід: {player['xp']}\n"
        f"💰 Гроші: ₴{player['money']}"
    )


@dp.message(CommandStart())
async def start(message: Message, state: FSMContext) -> None:
    await state.clear()
    player = await get_player(message.from_user.id)

    if player:
        await message.answer(
            "З поверненням до Life+ RP! 😅\n\n"
            + await build_profile(message.from_user.id),
            reply_markup=profile_keyboard(),
        )
        return

    await state.set_state(Registration.nickname)
    await message.answer(
        "🏙️ Вітаємо у Life+ RP!\n\n"
        "Для реєстрації введи ім'я та прізвище латиницею "
        "через нижнє підкреслення.\n\n"
        "Приклад: Dragon_Bondarenko"
    )


@dp.message(Registration.nickname)
async def enter_nickname(message: Message, state: FSMContext) -> None:
    nickname = (message.text or "").strip()

    if not re.fullmatch(r"[A-Za-z]{2,20}_[A-Za-z]{2,25}", nickname):
        await message.answer(
            "❌ Неправильний формат.\n"
            "Використовуй латинські літери й одне нижнє "
            "підкреслення. Приклад: Dragon_Bondarenko"
        )
        return

    assert db_pool is not None
    async with db_pool.acquire() as conn:
        existing_name = await conn.fetchval(
            "SELECT 1 FROM players WHERE LOWER(nickname) = LOWER($1)",
            nickname,
        )

    if existing_name:
        await message.answer("❌ Це ім'я вже зайняте. Введи інше.")
        return

    await state.update_data(nickname=nickname)
    await state.set_state(Registration.confirmation)
    await message.answer(
        f"Перевір свої дані:\n\n🪪 Ім'я: {nickname}\n\n"
        "Підтверджуєш реєстрацію?",
        reply_markup=registration_keyboard(),
    )


@dp.callback_query(F.data == "reg:change")
async def change_nickname(
    callback: CallbackQuery,
    state: FSMContext,
) -> None:
    if await state.get_state() != Registration.confirmation.state:
        await callback.answer("Ця дія вже недоступна.", show_alert=True)
        return

    await state.set_state(Registration.nickname)
    if callback.message:
        await callback.message.edit_text(
            "Введи ім'я та прізвище у форматі Dragon_Bondarenko."
        )
    await callback.answer()


@dp.callback_query(F.data == "reg:confirm")
async def confirm_registration(
    callback: CallbackQuery,
    state: FSMContext,
) -> None:
    if await state.get_state() != Registration.confirmation.state:
        await callback.answer("Ця дія вже недоступна.", show_alert=True)
        return

    data = await state.get_data()
    nickname = data.get("nickname")
    if not nickname:
        await state.clear()
        await callback.answer("Почни реєстрацію командою /start.", show_alert=True)
        return

    assert db_pool is not None
    try:
        async with db_pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO players (user_id, nickname)
                VALUES ($1, $2)
                """,
                callback.from_user.id,
                nickname,
            )
    except asyncpg.UniqueViolationError:
        await callback.answer(
            "Ім'я вже зайняте або профіль уже створений.",
            show_alert=True,
        )
        await state.clear()
        return

    await state.clear()
    if callback.message:
        await callback.message.edit_text(
            "🎉 Реєстрацію завершено!\n\n"
            + await build_profile(callback.from_user.id)
        )
        await callback.message.answer(
            "Твій профіль готовий! 😅",
            reply_markup=profile_keyboard(),
        )
    await callback.answer("Готово!")


@dp.callback_query(F.data == "profile:show")
async def show_profile(callback: CallbackQuery) -> None:
    if callback.message:
        await callback.message.answer(
            await build_profile(callback.from_user.id),
            reply_markup=profile_keyboard(),
        )
    await callback.answer()


@dp.message(Command("profile"))
async def profile_command(message: Message) -> None:
    await message.answer(
        await build_profile(message.from_user.id),
        reply_markup=profile_keyboard(),
    )


@dp.message(Command("admin"))
async def admin_command(message: Message) -> None:
    if message.from_user.id != ADMIN_ID:
        await message.answer("⛔ Немає доступу.")
        return

    assert db_pool is not None
    async with db_pool.acquire() as conn:
        count = await conn.fetchval("SELECT COUNT(*) FROM players")

    await message.answer(
        "🛠️ ПАНЕЛЬ АДМІНІСТРАТОРА\n\n"
        f"👥 Зареєстровано гравців: {count}"
    )


async def main() -> None:
    if not BOT_TOKEN:
        raise RuntimeError(
            "Не задано BOT_TOKEN. Додай токен у Variables на Railway."
        )

    await init_db()
    assert bot is not None
    try:
        await dp.start_polling(bot)
    finally:
        if db_pool is not None:
            await db_pool.close()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())

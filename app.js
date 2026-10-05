const STORAGE_KEY = 'lifePlusDemoProfile';
const STARTING_BALANCE = 1000;
const STARTING_LEVEL = 1;

const telegram = window.Telegram?.WebApp ?? null;

if (telegram) {
    telegram.ready();
    telegram.expand();
}

const elements = {
    registration: document.getElementById('registration'),
    profile: document.getElementById('profile'),
    form: document.getElementById('registerForm'),
    error: document.getElementById('error'),
    welcome: document.getElementById('welcome'),
    balance: document.getElementById('balance'),
    level: document.getElementById('level'),
    profileNickname: document.getElementById('profileNickname'),
};

function getTelegramId() {
    return telegram?.initDataUnsafe?.user?.id ?? null;
}

function showError(message) {
    elements.error.textContent = message;
}

function clearError() {
    elements.error.textContent = '';
}

function getFormData() {
    return {
        nickname: document.getElementById('nickname').value.trim(),
        gender: document.getElementById('gender').value,
        password: document.getElementById('password').value,
        passwordConfirm: document.getElementById('passwordConfirm').value
    };
}

function validateForm(data) {
    if (data.nickname.length < 5) {
        return 'Нікнейм має містити мінімум 5 символів.';
    }

    if (!/^[A-Za-zА-Яа-яІіЇїЄєҐґ']+_[A-Za-zА-Яа-яІіЇїЄєҐґ']+$/.test(data.nickname)) {
        return "Використовуйте формат Ім'я_Прізвище, наприклад Петро_Олексієвич.";
    }

    if (!data.gender) {
        return 'Оберіть стать персонажа.';
    }

    if (data.password.length < 6) {
        return 'Пароль має містити мінімум 6 символів.';
    }

    if (data.password !== data.passwordConfirm) {
        return 'Паролі не збігаються.';
    }

    return null;
}

function createProfile(data) {
    return {
        nickname: data.nickname,
        gender: data.gender,
        telegramId: getTelegramId(),
        balance: STARTING_BALANCE,
        level: STARTING_LEVEL
    };
}

function saveProfile(profile) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

function showProfile(profile) {
    elements.registration.classList.add('hidden');
    elements.profile.classList.remove('hidden');

    elements.welcome.textContent =
        `Вітаємо, ${profile.nickname}! Ласкаво просимо до Life+ RP.`;

    elements.balance.textContent = `₴${profile.balance.toLocaleString('uk-UA')}`;
    elements.level.textContent = profile.level;
    elements.profileNickname.textContent = profile.nickname;
}

function loadSavedProfile() {
    const savedProfile = localStorage.getItem(STORAGE_KEY);

    if (!savedProfile) {
        return;
    }

    try {
        const profile = JSON.parse(savedProfile);

        if (profile?.nickname) {
            showProfile(profile);
        }
    } catch {
        localStorage.removeItem(STORAGE_KEY);
    }
}

elements.form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearError();

    const formData = getFormData();
    const validationError = validateForm(formData);

    if (validationError) {
        showError(validationError);
        return;
    }

    const profile = createProfile(formData);
    saveProfile(profile);
    showProfile(profile);
});

loadSavedProfile();

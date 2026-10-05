const STORAGE_KEY = "lifePlusDemoProfile";
const STARTING_BALANCE = 1000;
const STARTING_LEVEL = 1;
const telegram = window.Telegram?.WebApp ?? null;
if (telegram) { telegram.ready(); telegram.expand(); }

const $ = (id) => document.getElementById(id);
const screens = { registration: $("registration"), game: $("game"), subscreen: $("subscreen") };

const menuItems = [
  { id:"profile", icon:"👤", title:"Профіль", desc:"Інформація про персонажа", color:"blue", content:["👤 Особисті дані", "⭐ Рівень та досвід", "💰 Баланс", "🚻 Стать"] },
  { id:"jobs", icon:"💼", title:"Роботи", desc:"Заробляй гроші та розвивай навички", color:"orange", content:["🚕 Таксист", "📦 Кур'єр", "🏗️ Будівельник", "🚛 Водій", "🧹 Прибиральник"] },
  { id:"businesses", icon:"🏢", title:"Бізнеси", desc:"Купуй, розвивай та керуй бізнесами", color:"green", content:["🏪 Магазини", "🍔 Ресторани", "⛽ АЗС", "🔧 СТО", "📊 Мої бізнеси"] },
  { id:"transport", icon:"🚗", title:"Транспорт", desc:"Твої автомобілі та мотоцикли", color:"red", content:["🚙 Мої автомобілі", "🏍️ Мої мотоцикли", "🛒 Купити транспорт"] },
  { id:"property", icon:"🏠", title:"Майно", desc:"Будинки, квартири та інше", color:"purple", content:["🏡 Мій будинок", "🏢 Мої об'єкти", "🛒 Купити майно"] },
  { id:"factions", icon:"🛡️", title:"Фракції", desc:"Державні та кримінальні організації", color:"indigo", content:["👮 Державні фракції", "🔫 Кримінальні фракції", "📋 Моя фракція"] },
  { id:"families", icon:"👨‍👩‍👧‍👦", title:"Сім'ї", desc:"Створюй сім'ю та грай разом", color:"pink", content:["👨‍👩‍👧 Моя сім'я", "➕ Створити сім'ю", "🔎 Знайти сім'ю"] },
  { id:"donate", icon:"💎", title:"Донат", desc:"Підтримай проєкт та отримай бонуси", color:"gold", content:["💎 Донатні набори", "⭐ Преміум", "🎁 Бонуси"] },
  { id:"players", icon:"👥", title:"Гравці", desc:"Інші гравці, топи, пошук", color:"cyan", content:["🟢 Гравці онлайн", "🏆 Топ гравців", "🔎 Пошук гравця"] }
];

function renderMenu() {
  $("mainMenu").innerHTML = menuItems.map(item => `<button class="menu-button ${item.color}" data-id="${item.id}"><span class="menu-icon">${item.icon}</span><span class="menu-text"><strong>${item.title}</strong><small>${item.desc}</small></span><span class="arrow">›</span></button>`).join("");
  document.querySelectorAll(".menu-button").forEach(button => button.addEventListener("click", () => openSection(button.dataset.id)));
}

function showScreen(name) { Object.values(screens).forEach(s => s.classList.add("hidden")); screens[name].classList.remove("hidden"); window.scrollTo(0,0); }
function getTelegramId() { return telegram?.initDataUnsafe?.user?.id ?? null; }
function showError(message) { $("error").textContent = message; }

function validate(data) {
  if (!/^[A-Za-zА-Яа-яІіЇїЄєҐґ'ʼ]+_[A-Za-zА-Яа-яІіЇїЄєҐґ'ʼ]+$/.test(data.nickname)) return "Використовуйте формат Ім'я_Прізвище, наприклад Петро_Олексієвич.";
  if (!data.gender) return "Оберіть стать персонажа.";
  if (data.password.length < 6) return "Пароль має містити мінімум 6 символів.";
  if (data.password !== data.passwordConfirm) return "Паролі не збігаються.";
  return null;
}
function createProfile(data) { return { nickname:data.nickname, gender:data.gender, telegramId:getTelegramId(), balance:STARTING_BALANCE, level:STARTING_LEVEL }; }
function saveProfile(profile) { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); }
function showGame(profile) { $("playerNickname").textContent=profile.nickname; $("playerLevel").textContent=profile.level; $("playerBalance").textContent=`₴${profile.balance.toLocaleString("uk-UA")}`; renderMenu(); showScreen("game"); }
function loadSavedProfile() { const raw=localStorage.getItem(STORAGE_KEY); if (!raw) return; try { const profile=JSON.parse(raw); if(profile?.nickname) showGame(profile); } catch { localStorage.removeItem(STORAGE_KEY); } }

function openSection(id) {
  const item=menuItems.find(x=>x.id===id); if(!item) return;
  $("sectionIcon").textContent=item.icon; $("sectionTitle").textContent=item.title; $("sectionSubtitle").textContent=item.title; $("sectionDescription").textContent=item.desc;
  $("sectionContent").innerHTML=item.content.map(text=>`<button class="content-row">${text}<span>›</span></button>`).join("");
  showScreen("subscreen");
}
$("backButton").addEventListener("click",()=>showScreen("game"));
$("registerForm").addEventListener("submit", e=>{ e.preventDefault(); const data={nickname:$("nickname").value.trim(),gender:$("gender").value,password:$("password").value,passwordConfirm:$("passwordConfirm").value}; const error=validate(data); if(error){showError(error);return;} const profile=createProfile(data); saveProfile(profile); showGame(profile); });
loadSavedProfile();

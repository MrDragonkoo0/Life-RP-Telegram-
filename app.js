const STORAGE_KEY = "lifePlusProfile_v011";
const STARTING_BALANCE = 1000;
const STARTING_LEVEL = 1;
const STARTING_HP = 100;
const telegram = window.Telegram?.WebApp ?? null;
if (telegram) { telegram.ready(); telegram.expand(); document.documentElement.classList.add("telegram-webapp"); }
const $ = (id) => document.getElementById(id);
const screens = { registration: $("registration"), game: $("game"), subscreen: $("subscreen") };

const menuItems = [
 {id:"profile",icon:"👤",title:"Профіль",desc:"Персонаж, рівень, XP та HP",color:"blue"},
 {id:"jobs",icon:"💼",title:"Роботи",desc:"Працюй та прокачуй професію до 12 рівня",color:"orange"},
 {id:"businesses",icon:"🏢",title:"Бізнеси",desc:"30 видів бізнесу: купуй, продавай і заробляй",color:"green"},
 {id:"transport",icon:"🚗",title:"Транспорт",desc:"Купуй та зберігай власні автомобілі",color:"red"},
 {id:"property",icon:"🏠",title:"Майно",desc:"Купуй та продавай майно",color:"purple"},
 {id:"factions",icon:"🛡️",title:"Фракції",desc:"Організації та спільна гра",color:"indigo"},
 {id:"families",icon:"👨‍👩‍👧‍👦",title:"Сім'ї",desc:"Створюй сім'ю та грай разом",color:"pink"},
 {id:"donate",icon:"💎",title:"Донат",desc:"Додаткові можливості проєкту",color:"gold"},
 {id:"players",icon:"👥",title:"Гравці",desc:"Пошук, онлайн та взаємодія",color:"cyan"}
];

const jobNames = ["Таксист","Кур'єр","Продавець","Кухар","Прибиральник","Будівельник","Механік","Водій вантажівки","Рієлтор","Програміст","Медик","Поліцейський","Пожежник","Журналіст","Залізничник"];
const jobPay = [250,320,380,450,520,600,700,820,950,1100,1250,1450];
const businesses = [
 ["Економ-автосалон","🚗","Економ",500000,18000], ["Стандарт-автосалон","🚘","Стандарт",1200000,42000], ["Преміум-автосалон","🏎️","Преміум",5000000,125000], ["Люкс-автосалон","💎","Люкс",15000000,300000],
 ["СТО","🔧","Авто",700000,28000],["Шиномонтаж","🛞","Авто",350000,13000],["АЗС","⛽","Авто",2200000,65000],["Автомийка","🚿","Авто",450000,16000],
 ["Фастфуд","🍔","Харчування",300000,12000],["Піцерія","🍕","Харчування",450000,18000],["Ресторан","🍽️","Харчування",1800000,55000],["Кав'ярня","☕","Харчування",250000,10000],["Бар","🍺","Харчування",900000,30000],
 ["Продуктовий магазин","🏪","Торгівля",650000,24000],["Магазин одягу","👕","Торгівля",500000,18000],["Магазин техніки","📱","Торгівля",1400000,45000],["Ювелірний магазин","💍","Торгівля",3500000,90000],["Супермаркет","🛒","Торгівля",2800000,85000],
 ["Перукарня","💇","Послуги",250000,9000],["Фітнес-клуб","🏋️","Послуги",1200000,35000],["Готель","🏨","Послуги",6500000,150000],["Хімчистка","🧺","Послуги",400000,14000],["Пункт доставки","📦","Послуги",300000,11000],
 ["Банк","🏦","Фінанси",12000000,260000],["Будівельна компанія","🏗️","Компанії",4500000,110000],["Транспортна компанія","🚚","Компанії",3800000,95000],["Логістична компанія","📦","Компанії",5200000,125000],["Агентство нерухомості","🏢","Компанії",2200000,60000],
 ["Ігровий клуб","🎮","Розваги",800000,26000],["Кінотеатр","🎬","Розваги",3500000,85000],["Боулінг","🎳","Розваги",1300000,38000],["Парк розваг","🎡","Розваги",9000000,210000],["Медіакомпанія","📺","Медіа",3000000,70000]
].map((b,i)=>({id:i+1,name:b[0],icon:b[1],className:b[2],price:b[3],daily:b[4],level:1,owner:null,balance:0,sales:0}));
const carsByClass = {
 "Економ":[["Daewoo Lanos",50000],["Renault Logan",90000],["Skoda Fabia",120000]],
 "Стандарт":[["Toyota Corolla",250000],["Volkswagen Passat",320000],["Skoda Octavia",360000]],
 "Преміум":[["BMW 5 Series",900000],["Mercedes E-Class",1100000],["Audi A6",1000000]],
 "Люкс":[["Mercedes S-Class",3000000],["BMW 7 Series",3500000],["Porsche Panamera",4200000]]
};

function defaultProfile(nickname,gender){ return {nickname,gender,telegramId:telegram?.initDataUnsafe?.user?.id??null,balance:STARTING_BALANCE,level:1,xp:0,hp:100,maxHp:100,job:null,jobLevel:1,businesses:[],cars:[],logs:[]}; }
function getProfile(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||null}catch{return null}}
function saveProfile(){localStorage.setItem(STORAGE_KEY,JSON.stringify(profile));}
let profile = getProfile();
function fmt(n){return `₴${Math.round(n).toLocaleString("uk-UA")}`}
function showScreen(name){Object.values(screens).forEach(s=>s.classList.add("hidden"));screens[name].classList.remove("hidden");window.scrollTo(0,0)}
function addXP(amount){ profile.xp += amount; while(profile.xp >= profile.level*100){profile.xp-=profile.level*100;profile.level++;profile.maxHp=100+profile.level*5;profile.hp=profile.maxHp;} }
function updatePlayerCard(){ $("playerNickname").textContent=profile.nickname;$("playerLevel").textContent=profile.level;$("playerBalance").textContent=fmt(profile.balance);$("playerHp").textContent=`${profile.hp}/${profile.maxHp}`;const need=profile.level*100;$("xpText").textContent=`${profile.xp} / ${need} XP`;$("xpFill").style.width=`${Math.min(100,profile.xp/need*100)}%`; }
function renderMenu(){ $("mainMenu").innerHTML=menuItems.map(i=>`<button class="menu-button ${i.color}" data-id="${i.id}"><span class="menu-icon">${i.icon}</span><span class="menu-text"><strong>${i.title}</strong><small>${i.desc}</small></span><span class="arrow">›</span></button>`).join("");document.querySelectorAll(".menu-button").forEach(b=>b.onclick=()=>openSection(b.dataset.id)); }
function showGame(){updatePlayerCard();renderMenu();showScreen("game")}

function row(label,action=""){return `<button class="content-row" ${action?`data-action="${action}"`:""}>${label}<span>›</span></button>`}
function openSection(id){
 const item=menuItems.find(x=>x.id===id); if(!item)return; $("sectionIcon").textContent=item.icon;$("sectionTitle").textContent=item.title;$("sectionSubtitle").textContent=item.title;$("sectionDescription").textContent=item.desc;
 const c=$("sectionContent");
 if(id==="profile") renderProfile(c);
 else if(id==="jobs") renderJobs(c);
 else if(id==="businesses") renderBusinesses(c);
 else if(id==="transport") renderTransport(c);
 else if(id==="property") renderSimple(c,["🏠 Квартири","🏡 Будинки","🏢 Комерційне майно"],"Ринок майна буде розширюватися.");
 else if(id==="factions") renderSimple(c,["👮 Державні фракції","🛡️ Моя фракція","📋 Вступити до фракції"],"Фракційна система підготовлена під майбутню онлайн-взаємодію.");
 else if(id==="families") renderSimple(c,["👨‍👩‍👧 Моя сім'я","➕ Створити сім'ю","🔎 Знайти сім'ю"],"Сімейна система працюватиме між реальними акаунтами після підключення сервера.");
 else if(id==="donate") renderSimple(c,["💎 Преміум","🎁 Донатні набори","⭐ Бонуси"],"Оплати поки не підключені.");
 else if(id==="players") renderPlayers(c);
 showScreen("subscreen");
}
function renderProfile(c){c.innerHTML=`<div class="info-grid"><div>⭐ Рівень<br><b>${profile.level}</b></div><div>❤️ HP<br><b>${profile.hp}/${profile.maxHp}</b></div><div>⚡ XP<br><b>${profile.xp}/${profile.level*100}</b></div><div>💰 Баланс<br><b>${fmt(profile.balance)}</b></div></div><div class="detail-card">👤 <b>${profile.nickname}</b><br>🚻 ${profile.gender==="male"?"Чоловік":"Жінка"}<br>💼 Робота: ${profile.job?`${profile.job} · ${profile.jobLevel} рівень`:"Не обрана"}<br>🏢 Бізнесів: ${profile.businesses.length}<br>🚗 Авто: ${profile.cars.length}</div>`}
function renderJobs(c){c.innerHTML=`<div class="notice">💼 Обери професію. Кожна робота має <b>12 рівнів</b>. За виконання роботи ти отримуєш гроші та XP.</div>`+jobNames.map((j,i)=>row(`💼 ${j}<small class="row-right">Рівень ${profile.job===j?profile.jobLevel:1} · ${fmt(jobPay[profile.job===j?profile.jobLevel-1:0])}</small>`,`job:${i}`)).join(""); c.querySelectorAll("[data-action]").forEach(b=>b.onclick=()=>{const [a,v]=b.dataset.action.split(":");if(a==="job") chooseJob(jobNames[+v]);});}
function chooseJob(job){profile.job=job;profile.jobLevel=Math.max(1,profile.jobLevel||1);saveProfile();addXP(10);saveProfile();alert(`✅ Роботу обрано: ${job}.\nРівень роботи: ${profile.jobLevel}/12`);renderJobs($("sectionContent"));updatePlayerCard();}
function doWork(){const idx=Math.min(11,profile.jobLevel-1);const pay=jobPay[idx];profile.balance+=pay;addXP(35+profile.jobLevel*5);saveProfile();updatePlayerCard();alert(`💼 Зміна завершена!\n+${fmt(pay)}\n+XP`);}
function renderBusinesses(c){
 const owned=businesses.filter(b=>profile.businesses.includes(b.id));
 c.innerHTML=`<div class="notice">🏢 У грі <b>33 бізнеси</b>. Їх можна купувати, розвивати, продавати та забирати накопичений прибуток.</div><div class="section-actions"><button class="mini-button" id="collectAll">💰 Забрати весь прибуток</button><button class="mini-button" id="businessMine">🏢 Мої бізнеси (${owned.length})</button></div>`+businesses.map(b=>{
  const owner=profile.businesses.includes(b.id);const carClass=["Економ","Стандарт","Преміум","Люкс"].includes(b.className);
  return `<div class="business-card"><div class="business-head"><span class="business-emoji">${b.icon}</span><div><b>${b.name}</b><small>${b.className}</small></div></div><div class="business-stats"><span>💰 ${fmt(b.price)}</span><span>📈 ${fmt(b.daily)}/день</span><span>⭐ Рівень ${b.level}</span></div>${carClass?`<div class="cars-preview">🚘 Клас: ${b.className}</div>`:""}<button class="business-action" data-bid="${b.id}" data-owned="${owner}">${owner?"⚙️ Керувати бізнесом":"🛒 Купити бізнес"}</button></div>`
 }).join("");
 $("collectAll").onclick=()=>collectAll();$("businessMine").onclick=()=>renderMyBusinesses(c);c.querySelectorAll(".business-action").forEach(b=>b.onclick=()=>businessAction(+b.dataset.bid,b.dataset.owned==="true"));
}
function businessAction(id,owned){const b=businesses.find(x=>x.id===id);if(!b)return;if(owned){manageBusiness(b);return}if(profile.balance<b.price){alert(`❌ Недостатньо коштів.\nПотрібно: ${fmt(b.price)}\nУ вас: ${fmt(profile.balance)}`);return;}profile.balance-=b.price;b.owner=profile.nickname;profile.businesses.push(b.id);b.balance=0;b.sales=0;addXP(100);saveProfile();updatePlayerCard();alert(`🏢 Ви придбали «${b.name}» за ${fmt(b.price)}.`);renderBusinesses($("sectionContent"));}
function manageBusiness(b){
 const earned=b.balance;const isAuto=["Економ","Стандарт","Преміум","Люкс"].includes(b.className);let msg=`🏢 ${b.name}\n\n👤 Власник: ${profile.nickname}\n⭐ Рівень: ${b.level}\n💰 Баланс бізнесу: ${fmt(earned)}\n📈 Базовий прибуток: ${fmt(b.daily)}/день\n🛒 Продажів: ${b.sales}`;
 if(isAuto)msg+=`\n🚗 Клас автосалону: ${b.className}`;
 const action=prompt(msg+"\n\nВведіть: 1 — забрати прибуток, 2 — продати бізнес, 3 — відкрити асортимент","");
 if(action==="1"){profile.balance+=b.balance;b.balance=0;addXP(20);saveProfile();updatePlayerCard();alert("💰 Прибуток забрано!");}
 else if(action==="2"){const sell=Math.floor(b.price*(0.8+b.level*0.05));profile.balance+=sell;profile.businesses=profile.businesses.filter(x=>x!==b.id);b.owner=null;b.balance=0;saveProfile();updatePlayerCard();alert(`🏷️ Бізнес продано за ${fmt(sell)}.`);renderBusinesses($("sectionContent"));}
 else if(action==="3"&&isAuto)renderDealership(b);
}
function renderMyBusinesses(c){const owned=businesses.filter(b=>profile.businesses.includes(b.id));c.innerHTML=owned.length?owned.map(b=>`<div class="business-card"><b>${b.icon} ${b.name}</b><p>Баланс: ${fmt(b.balance)} · Продажів: ${b.sales}</p><button class="business-action" data-bid="${b.id}">⚙️ Керувати</button></div>`).join(""):"<div class='notice'>У вас ще немає бізнесів.</div>";c.querySelectorAll("[data-bid]").forEach(x=>x.onclick=()=>manageBusiness(businesses.find(b=>b.id===+x.dataset.bid)));}
function renderDealership(b){const cars=carsByClass[b.className]||[];$("sectionTitle").textContent=b.name;$("sectionIcon").textContent="🚗";$("sectionDescription").textContent=`Клас: ${b.className}. Купівля авто приносить гроші власнику автосалону.`;$("sectionContent").innerHTML=`<div class="notice">🏢 Баланс: <b>${fmt(b.balance)}</b><br>Кожна покупка авто додає всю суму до балансу цього бізнесу.</div>`+cars.map((c,i)=>`<div class="car-card"><b>🚗 ${c[0]}</b><span>${fmt(c[1])}</span><button class="business-action" data-car="${i}">Купити</button></div>`).join("");$("sectionContent").querySelectorAll("[data-car]").forEach(x=>x.onclick=()=>buyCar(b,cars[+x.dataset.car]));}
function buyCar(b,car){if(profile.balance<car[1]){alert(`❌ Недостатньо коштів. Потрібно ${fmt(car[1])}.`);return;}profile.balance-=car[1];b.balance+=car[1];b.sales++;profile.cars.push({name:car[0],price:car[1]});addXP(50);profile.logs.unshift(`Куплено ${car[0]} за ${fmt(car[1])} у ${b.name}`);saveProfile();updatePlayerCard();alert(`🚗 Ви придбали ${car[0]} за ${fmt(car[1])}.\n🏢 Власнику ${b.name} нараховано ${fmt(car[1])}.`);renderDealership(b);}
function collectAll(){let sum=0;businesses.filter(b=>profile.businesses.includes(b.id)).forEach(b=>{sum+=b.balance;b.balance=0});if(sum){profile.balance+=sum;addXP(30);saveProfile();updatePlayerCard();alert(`💰 Забрано ${fmt(sum)} прибутку.`)}else alert("💰 Накопиченого прибутку поки немає.");}
function renderTransport(c){c.innerHTML=`<div class="notice">🚗 Ваш транспорт</div>`+(profile.cars.length?profile.cars.map(x=>`<div class="detail-card">🚗 <b>${x.name}</b><br>Ціна покупки: ${fmt(x.price)}</div>`).join(""):"<div class='notice'>У вас ще немає автомобілів. Купити авто можна в автосалоні.</div>");}
function renderPlayers(c){const players=[profile.nickname,"Іван_Петров","Олексій_Коваль","Андрій_Шевченко","Максим_Бондар"];c.innerHTML=`<div class="notice">👥 Демо-список. Після підключення БД тут будуть реальні гравці онлайн.</div>`+players.map((p,i)=>`<div class="player-row"><span>🟢</span><b>${p}</b><small>⭐ Рівень ${i===0?profile.level:Math.max(1,8-i)}</small></div>`).join("");}
function renderSimple(c,items,note){c.innerHTML=`<div class="notice">${note}</div>`+items.map(x=>row(x)).join("");}

$("backButton").onclick=()=>showScreen("game");
$("registerForm").onsubmit=(e)=>{e.preventDefault();const nickname=$("nickname").value.trim(),gender=$("gender").value,password=$("password").value,passwordConfirm=$("passwordConfirm").value;let error="";if(!/^[A-Za-zА-Яа-яІіЇїЄєҐґ'ʼ]+_[A-Za-zА-Яа-яІіЇїЄєҐґ'ʼ]+$/.test(nickname))error="Використовуйте формат Ім'я_Прізвище, наприклад Петро_Олексієвич.";else if(!gender)error="Оберіть стать персонажа.";else if(password.length<6)error="Пароль має містити мінімум 6 символів.";else if(password!==passwordConfirm)error="Паролі не збігаються.";if(error){$("error").textContent=error;return;}profile=defaultProfile(nickname,gender);saveProfile();showGame();};
if(profile?.nickname)showGame();

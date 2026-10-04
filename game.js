const GAME_W = 1280;
const GAME_H = 720;
const WORLD_W = 6144;
const WORLD_H = 4096;

class LifePlusScene extends Phaser.Scene {
  constructor() {
    super("LifePlusScene");
    this.moveVector = { x: 0, y: 0 };
    this.joystickPointer = null;
    this.runHeld = false;
    this.profile = LifePlusAuth.getProfile();
    this.nearStation = false;
    this.playerDirection = "";
    this.lastSaveAt = 0;
    this.saveInFlight = false;
  }

  preload() {
    this.load.image("male_down", "assets/male_down.png?v=17");
    this.load.image("male_up", "assets/male_up.png?v=17");
    this.load.image("male_left", "assets/male_left.png?v=17");
    this.load.image("male_right", "assets/male_right.png?v=17");
    this.load.image("female", "assets/female.png");
    this.load.image("joystick_idle", "assets/joystick_idle.png");
    this.load.image("joystick_up", "assets/joystick_up.png");
    this.load.image("joystick_down", "assets/joystick_down.png");
    this.load.image("joystick_left", "assets/joystick_left.png");
    this.load.image("joystick_right", "assets/joystick_right.png");
    this.load.image("world_map", "assets/world_map.png");
    this.load.image("run_icon", "assets/біг.png");
    this.load.image("money_icon", "assets/гроші.png");
    this.load.image("settings_icon", "assets/налаштування.png");
  }

  create() {
    this.profile = LifePlusAuth.getProfile();
    this.updateProfileHint();
    this.createHud();
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.createWorldMap();
    this.createPlayer();
    this.createMapColliders();
    this.createControls();
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.cameras.main.setZoom(1);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D,SHIFT,E");
    this.updateHint("");
    this.syncProfileToServer(true);
    this.scale.on("resize", () => this.layoutControls());
  }

  createWorldMap() {
    // Велика карта Life+ RP: місто + села + природа + море + гори.
    // Співвідношення 6144×4096 відповідає вихідній карті 1536×1024.
    this.worldMap = this.add.image(WORLD_W / 2, WORLD_H / 2, "world_map")
      .setOrigin(0.5)
      .setDisplaySize(WORLD_W, WORLD_H)
      .setDepth(0);

    // Гра не повинна обрізати краї карти.
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    // Точка старту — район центрального вокзалу в нижній частині міста.
    this.stationPoint = { x: 2800, y: 2750 };
    this.add.circle(this.stationPoint.x, this.stationPoint.y, 18, 0x4da3ff, 0.0)
      .setStrokeStyle(3, 0x4da3ff, 0.85)
      .setDepth(3);
  }

  createPlayer() {
    const saved = localStorage.getItem("lifeplus_gender") || "male";
    const key = saved === "female" ? "female" : "male_down";
    const startX = Number.isFinite(Number(this.profile?.posX)) ? Number(this.profile.posX) : this.stationPoint.x;
    const startY = Number.isFinite(Number(this.profile?.posY)) ? Number(this.profile.posY) : this.stationPoint.y;
    this.player = this.physics.add.sprite(startX, startY, key);
    this.player.setDisplaySize(48, 84);
    this.player.setDepth(10);
    this.player.setScale(1);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(18, 28);
    this.player.body.setOffset(15, 51);

    // Чотири напрямки нового чоловічого персонажа.
    if (saved !== "female") {
      this.setMaleDirection("down");
    }
    this.player.setDrag(900, 900);
    this.player.setMaxVelocity(230, 230);
    this.player.setDepth(this.player.y);
  }

  setMaleDirection(direction) {
    if (!this.player || localStorage.getItem("lifeplus_gender") === "female") return;
    const textureKey = {
      down: "male_down",
      up: "male_up",
      left: "male_left",
      right: "male_right"
    }[direction] || "male_down";

    if (this.playerDirection === direction && this.player.texture && this.player.texture.key === textureKey) return;
    this.playerDirection = direction;
    if (!this.textures.exists(textureKey)) {
      console.error("Life+ RP: texture not loaded:", textureKey);
      return;
    }
    this.player.setTexture(textureKey);

    // Усі 4 напрямки мають однаковий кадр 48×84 px та однаковий
    // візуальний габарит персонажа, щоб він не виглядав завеликим на вулицях, тому масштаб не стрибає.
    this.player.setDisplaySize(48, 84);
    this.player.body.setSize(18, 28);
    this.player.body.setOffset(15, 51);
  }

  createMapColliders() {
    // Колізії для декоративної карти. Координати нижче задані у вихідному
    // розмірі карти 1536×1024 і масштабуються у світ 6144×4096 (×4).
    // Гравець може ходити по дорогах, тротуарах і відкритих площах,
    // але не проходить крізь будинки та великі дерева.
    const S = WORLD_W / 1536;
    this.mapColliders = this.physics.add.staticGroup();

    const addRect = (x, y, w, h, pad = 0) => {
      const body = this.add.rectangle(
        (x + pad) * S + ((w - pad * 2) * S) / 2,
        (y + pad) * S + ((h - pad * 2) * S) / 2,
        Math.max(1, (w - pad * 2) * S),
        Math.max(1, (h - pad * 2) * S),
        0x000000, 0
      );
      body.setVisible(false);
      this.mapColliders.add(body);
    };

    const addTree = (x, y, r = 11) => {
      const body = this.add.circle(x * S, y * S, r * S, 0x000000, 0);
      body.setVisible(false);
      this.physics.add.existing(body, true);
      this.mapColliders.add(body);
    };

    // Будинки та великі споруди. Залишаємо передні тротуари/входи вільними.
    [
      [20, 30, 145, 235], [175, 35, 135, 230], [315, 25, 55, 245],
      [475, 45, 350, 145], [850, 30, 235, 155], [1195, 145, 175, 155],
      [1380, 35, 145, 210], [15, 385, 350, 145],
      [470, 390, 115, 120], [1020, 405, 115, 105], [1160, 400, 155, 105],
      [1370, 405, 150, 145], [20, 650, 335, 105],
      [475, 665, 145, 125], [1040, 665, 115, 120], [1190, 660, 330, 150],
      // Вокзал: основний корпус, але площа перед входом лишається прохідною.
      [510, 615, 505, 175]
    ].forEach(r => addRect(...r, 7));

    // Дрібні будинки/кіоски по краях району.
    [
      [390, 55, 70, 95], [1125, 70, 55, 100], [1430, 275, 75, 80],
      [365, 690, 75, 75], [1110, 675, 65, 75], [1325, 675, 75, 90],
      [1435, 690, 80, 95]
    ].forEach(r => addRect(...r, 5));

    // Основні дерева/кущі, які стоять на газонах і в парку.
    const trees = [
      // верхній лівий житловий район
      [25,20],[70,22],[120,18],[165,25],[215,20],[265,22],[320,18],[350,70],
      [35,150],[150,165],[300,170],[355,220],[45,275],[145,285],[285,285],[350,300],
      // район мерії/парку зверху
      [515,210],[560,195],[620,205],[700,195],[770,210],[820,225],
      [870,25],[930,20],[1000,22],[1060,25],[1080,190],[1030,220],
      // біля лікарні
      [1165,40],[1220,35],[1280,45],[1365,35],[1430,20],[1490,25],
      [1165,280],[1240,300],[1340,285],[1410,275],[1490,300],
      // центральний парк
      [500,385],[545,375],[595,390],[660,380],[720,390],[790,375],[850,390],
      [495,540],[550,550],[620,540],[690,555],[770,545],[830,535],[890,545],
      [580,430],[820,440],
      // нижні райони
      [30,600],[90,620],[160,610],[250,600],[330,615],[370,650],
      [1060,600],[1120,610],[1180,600],[1280,610],[1360,600],[1470,610],
      [30,790],[110,805],[210,790],[320,805],[420,800],[1080,805],[1160,800],[1260,810],[1380,800],[1490,805],
      // навколо вокзалу
      [470,790],[530,810],[610,805],[690,815],[780,805],[870,810],[960,800],[1010,810]
    ];
    trees.forEach(([x,y]) => addTree(x, y, 10));

    // Колізія гравця з усіма статичними об'єктами.
    this.physics.add.collider(this.player, this.mapColliders);
  }

  createHud() {
    this.hud = this.add.container(0, 0).setScrollFactor(0).setDepth(150);

    const panel = this.add.rectangle(18, 16, 360, 72, 0x101820, 0.88)
      .setOrigin(0).setStrokeStyle(2, 0x33495a, 0.9);
    const nick = this.add.text(34, 25, this.profile?.nickname || "Гравець", {
      fontFamily: "Arial", fontSize: "20px", fontStyle: "bold", color: "#ffffff"
    });
    const level = this.add.text(34, 52, `⭐ Lv.${Number(this.profile?.level || 1)}  XP ${Number(this.profile?.xp || 0)}/100`, {
      fontFamily: "Arial", fontSize: "13px", color: "#dbe7f0"
    });
    this.moneyIcon = this.add.image(185, 40, "money_icon").setDisplaySize(34, 29);
    this.moneyText = this.add.text(207, 31, `₴ ${Number(this.profile?.cash || 0).toLocaleString("uk-UA")}`, {
      fontFamily: "Arial", fontSize: "17px", fontStyle: "bold", color: "#ffffff"
    });
    this.settingsButton = this.add.image(GAME_W - 38, 24, "settings_icon")
      .setDisplaySize(52, 53).setInteractive({ useHandCursor: false });
    this.settingsButton.on("pointerdown", () => this.updateHint("Налаштування будуть доступні у наступному етапі."));
    this.hud.add([panel, nick, level, this.moneyIcon, this.moneyText, this.settingsButton]);
  }

  createControls() {
    this.joy = this.add.image(112, GAME_H - 112, "joystick_idle")
      .setScrollFactor(0).setDepth(100).setAlpha(0.94).setScale(0.86);
    this.joy.setInteractive({ useHandCursor: false });
    this.runButton = this.add.image(GAME_W - 105, GAME_H - 110, "run_icon")
      .setScrollFactor(0).setDepth(101).setDisplaySize(82, 84).setInteractive({ useHandCursor: false });
    this.runButton.on("pointerdown", () => { this.runHeld = true; });
    this.runButton.on("pointerup", () => { this.runHeld = false; });
    this.runButton.on("pointerout", () => { this.runHeld = false; });
    this.layoutControls();

    this.input.on("pointerdown", pointer => {
      const p = pointer.position;
      const bounds = this.joy.getBounds();
      if (Phaser.Geom.Rectangle.Contains(bounds, p.x, p.y)) {
        this.joystickPointer = pointer.id;
        this.readJoystick(pointer);
      }
    });
    this.input.on("pointermove", pointer => {
      if (this.joystickPointer === pointer.id && pointer.isDown) this.readJoystick(pointer);
    });
    this.input.on("pointerup", pointer => {
      if (this.joystickPointer === pointer.id) {
        this.joystickPointer = null;
        this.moveVector.x = 0; this.moveVector.y = 0;
        this.joy.setTexture("joystick_idle");
      }
    });
  }

  makeButton(x, y, radius, label, color) {
    const c = this.add.container(x, y).setScrollFactor(0).setDepth(101);
    const bg = this.add.circle(0, 0, radius/2, color, 0.88)
      .setStrokeStyle(3, 0xcbd6e0, 0.85);
    const txt = this.add.text(0, 0, label, {
      fontFamily: "Arial", fontSize: label.length > 5 ? "12px" : "16px",
      fontStyle: "bold", color: "#ffffff", align: "center"
    }).setOrigin(0.5);
    c.add([bg, txt]);
    c.setSize(radius, radius);
    c.setInteractive(new Phaser.Geom.Circle(0, 0, radius/2), Phaser.Geom.Circle.Contains);
    return c;
  }

  layoutControls() {
    const scaleX = this.scale.width / GAME_W;
    const scaleY = this.scale.height / GAME_H;
    const s = Math.min(scaleX, scaleY);
    this.joy.setPosition(112, GAME_H - 112).setScale(0.86);
    this.runButton.setPosition(GAME_W - 105, GAME_H - 105).setDisplaySize(82, 84);
    if (this.settingsButton) this.settingsButton.setPosition(GAME_W - 38, 24).setDisplaySize(52, 53);
  }

  readJoystick(pointer) {
    const bounds = this.joy.getBounds();
    const cx = bounds.centerX, cy = bounds.centerY;
    let dx = pointer.x - cx, dy = pointer.y - cy;
    const max = Math.min(bounds.width, bounds.height) * 0.34;
    const len = Math.hypot(dx, dy);
    if (len > max) { dx *= max / len; dy *= max / len; }
    this.moveVector.x = dx / max;
    this.moveVector.y = dy / max;

    if (Math.abs(this.moveVector.x) < 0.12 && Math.abs(this.moveVector.y) < 0.12) {
      this.joy.setTexture("joystick_idle");
    } else if (Math.abs(this.moveVector.x) > Math.abs(this.moveVector.y)) {
      this.joy.setTexture(this.moveVector.x < 0 ? "joystick_left" : "joystick_right");
    } else {
      this.joy.setTexture(this.moveVector.y < 0 ? "joystick_up" : "joystick_down");
    }
  }

  updateProfileHint() {
    const p = this.profile || LifePlusAuth.getProfile();
    const el = document.getElementById("hint");
    if (el) el.textContent = "";
    if (this.moneyText && p) this.moneyText.setText(`₴ ${Number(p.cash || 0).toLocaleString("uk-UA")}`);
  }

  updateHint(message) {
    const el = document.getElementById("hint");
    if (el) el.textContent = message;
  }

  update() {
    const kbX = (this.keys.D.isDown || this.cursors.right.isDown ? 1 : 0) -
                (this.keys.A.isDown || this.cursors.left.isDown ? 1 : 0);
    const kbY = (this.keys.S.isDown || this.cursors.down.isDown ? 1 : 0) -
                (this.keys.W.isDown || this.cursors.up.isDown ? 1 : 0);
    let dx = this.moveVector.x || kbX;
    let dy = this.moveVector.y || kbY;
    const mag = Math.hypot(dx, dy);
    if (mag > 1) { dx /= mag; dy /= mag; }

    const running = this.runHeld || this.keys.SHIFT.isDown;
    const speed = running ? 315 : 190;
    this.player.setVelocity(dx * speed, dy * speed);

    // Для чоловічого персонажа використовуємо 4 надані сторони.
    if (localStorage.getItem("lifeplus_gender") !== "female" && (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1)) {
      if (Math.abs(dx) > Math.abs(dy)) {
        this.setMaleDirection(dx < 0 ? "left" : "right");
      } else {
        this.setMaleDirection(dy < 0 ? "up" : "down");
      }
    }

    this.nearStation = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.stationPoint.x, this.stationPoint.y) < 115;
    if (this.nearStation) this.updateHint("Вокзал поруч · натисни «ВЗАЄМОДІЯ»");
    this.player.setDepth(this.player.y + 20);

    if (this.time.now - this.lastSaveAt > 5000) {
      this.syncProfileToServer();
    }
  }

  async syncProfileToServer(force = false) {
    if (!this.player || this.saveInFlight) return;
    if (!force && this.time && this.time.now - this.lastSaveAt < 5000) return;
    this.saveInFlight = true;
    try {
      const gender = localStorage.getItem("lifeplus_gender") === "female" ? "female" : "male";
      this.profile = await LifePlusAuth.updateProfile({
        gender,
        posX: this.player.x,
        posY: this.player.y
      });
      this.updateProfileHint();
      this.lastSaveAt = this.time ? this.time.now : 0;
    } catch (err) {
      console.warn("Life+ RP: не вдалося зберегти прогрес", err);
    } finally {
      this.saveInFlight = false;
    }
  }
}

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: GAME_W,
  height: GAME_H,
  backgroundColor: "#5d8057",
  pixelArt: true,
  roundPixels: true,
  physics: { default: "arcade", arcade: { debug: false } },
  scale: { mode: Phaser.Scale.ENVELOP, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [LifePlusScene]
};
new Phaser.Game(config);


// Повноекранний режим та спроба автоматично зафіксувати альбомну орієнтацію.
(() => {
  const fullscreenButtons = [
    document.getElementById("fullscreen-btn"),
    document.getElementById("rotate-fullscreen-btn")
  ].filter(Boolean);
  const root = document.getElementById("game-root");
  const mainButton = document.getElementById("fullscreen-btn");

  function isFullscreen() {
    return Boolean(document.fullscreenElement || document.webkitFullscreenElement ||
      (window.Telegram && Telegram.WebApp && Telegram.WebApp.isFullscreen));
  }

  function updateFullscreenButton() {
    if (mainButton) mainButton.hidden = isFullscreen();
  }

  async function enterGameMode() {
    // Telegram Mini App: розгорнути WebView і запросити повноекранний режим.
    // У fullscreen Telegram прибирає верхню та нижню панелі Mini App.
    try {
      const tg = window.Telegram && window.Telegram.WebApp;
      if (tg) {
        tg.ready();
        tg.expand();
        if (typeof tg.setHeaderColor === "function") tg.setHeaderColor("#101820");
        if (typeof tg.requestFullscreen === "function") tg.requestFullscreen();
        if (typeof tg.disableVerticalSwipes === "function") tg.disableVerticalSwipes();
      }
    } catch (_) {}

    // Звичайний браузер: fullscreen запитується лише після натискання користувача.
    try {
      if (!document.fullscreenElement && root && root.requestFullscreen) {
        await root.requestFullscreen();
      } else if (!document.fullscreenElement && root && root.webkitRequestFullscreen) {
        root.webkitRequestFullscreen();
      }
    } catch (_) {}

    // Браузер може відмовити в блокуванні орієнтації — тоді лишається підказка повернути телефон.
    try {
      if (screen.orientation && typeof screen.orientation.lock === "function") {
        await screen.orientation.lock("landscape");
      }
    } catch (_) {}
    updateFullscreenButton();
  }

  fullscreenButtons.forEach(button => button.addEventListener("click", enterGameMode));

  // Telegram може дозволити fullscreen після взаємодії користувача.
  // Тому на першому дотику до гри одразу просимо fullscreen.
  let firstInteractionHandled = false;
  function requestFullscreenOnFirstInteraction() {
    if (firstInteractionHandled) return;
    firstInteractionHandled = true;
    enterGameMode();
    root.removeEventListener("pointerdown", requestFullscreenOnFirstInteraction, true);
    root.removeEventListener("touchstart", requestFullscreenOnFirstInteraction, true);
  }
  root.addEventListener("pointerdown", requestFullscreenOnFirstInteraction, true);
  root.addEventListener("touchstart", requestFullscreenOnFirstInteraction, true);

  document.addEventListener("fullscreenchange", updateFullscreenButton);
  document.addEventListener("webkitfullscreenchange", updateFullscreenButton);
  window.addEventListener("orientationchange", () => setTimeout(updateFullscreenButton, 250));
  window.addEventListener("resize", updateFullscreenButton);

  // Для гри одразу просимо fullscreen у Telegram, щоб верхня панель
  // із «Закрити» та «⋮» не займала місце над ігровою областю.
  setTimeout(() => {
    try {
      const tg = window.Telegram && Telegram.WebApp;
      if (tg) {
        tg.ready();
        tg.expand();
        if (typeof tg.setHeaderColor === "function") tg.setHeaderColor("#101820");
        if (typeof tg.requestFullscreen === "function") tg.requestFullscreen();
        if (typeof tg.disableVerticalSwipes === "function") tg.disableVerticalSwipes();
      }
    } catch (_) {}
    updateFullscreenButton();
  }, 250);

  updateFullscreenButton();
})();

// Авторизація запускається до завантаження гри.
(async () => {
  const screen = document.getElementById('auth-screen');
  const form = document.getElementById('auth-form');
  const nick = document.getElementById('nickname');
  const pass = document.getElementById('password');
  const pass2 = document.getElementById('password2');
  const subtitle = document.getElementById('auth-subtitle');
  const submit = document.getElementById('auth-submit');
  const switchBtn = document.getElementById('auth-switch');
  const error = document.getElementById('auth-error');
  if (!screen || !form) return;

  let mode = LifePlusAuth.hasProfile() ? 'login' : 'register';
  const setMode = () => {
    const login = mode === 'login';
    subtitle.textContent = login ? 'Введи пароль для продовження' : 'Створи свій профіль';
    nick.parentElement.hidden = login;
    pass2.parentElement.hidden = login;
    submit.textContent = login ? 'Увійти' : 'Зареєструватися';
    switchBtn.hidden = !LifePlusAuth.hasProfile();
    switchBtn.textContent = login ? 'Створити новий профіль' : 'Увійти в існуючий профіль';
    pass.autocomplete = login ? 'current-password' : 'new-password';
    pass2.autocomplete = 'new-password';
    error.textContent = '';
  };
  setMode();

  if (LifePlusAuth.isLoggedIn()) {
    try {
      await LifePlusAuth.refreshProfile();
      screen.hidden = true;
      if (window.Telegram?.WebApp) window.Telegram.WebApp.ready();
      window.dispatchEvent(new Event('lifeplus-auth-ready'));
      return;
    } catch (_) {
      await LifePlusAuth.logout();
      mode = 'register';
      setMode();
    }
  }

  switchBtn.addEventListener('click', () => {
    mode = mode === 'login' ? 'register' : 'login';
    setMode();
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    error.textContent = '';
    submit.disabled = true;
    try {
      if (mode === 'register') {
        if (pass.value !== pass2.value) throw new Error('Паролі не збігаються.');
        await LifePlusAuth.register(nick.value.trim(), pass.value);
      } else {
        await LifePlusAuth.login(pass.value);
      }
      screen.hidden = true;
      if (window.Telegram?.WebApp) window.Telegram.WebApp.ready();
      window.dispatchEvent(new Event('lifeplus-auth-ready'));
    } catch (err) {
      error.textContent = err.message || 'Помилка авторизації.';
    } finally {
      submit.disabled = false;
    }
  });

})();

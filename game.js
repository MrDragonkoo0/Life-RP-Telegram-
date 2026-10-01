const GAME_W = 1280;
const GAME_H = 720;
const WORLD_W = 2560;
const WORLD_H = 1920;

class LifePlusScene extends Phaser.Scene {
  constructor() {
    super("LifePlusScene");
    this.moveVector = { x: 0, y: 0 };
    this.joystickPointer = null;
    this.runHeld = false;
    this.nearStation = false;
    this.playerDirection = "down";
  }

  preload() {
    this.load.image("male_down", "assets/male_down.png");
    this.load.image("male_up", "assets/male_up.png");
    this.load.image("male_left", "assets/male_left.png");
    this.load.image("male_right", "assets/male_right.png");
    this.load.image("female", "assets/female.png");
    this.load.image("joystick", "assets/joystick.png");
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.drawCity();
    this.createPlayer();
    this.createControls();
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.cameras.main.setZoom(1);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D,SHIFT,E");
    this.buildingColliders = this.physics.add.staticGroup();
    this.addBuildingColliders();
    this.physics.add.collider(this.player, this.buildingColliders);
    this.updateHint("Ти біля вокзалу. Досліджуй місто!");
    this.scale.on("resize", () => this.layoutControls());
  }

  drawCity() {
    const g = this.add.graphics();
    // Grass / ground base
    g.fillStyle(0x5d8057, 1);
    g.fillRect(0, 0, WORLD_W, WORLD_H);

    // City blocks and roads
    const roadColor = 0x343b43;
    const sidewalkColor = 0xb7b4a7;
    const roadXs = [360, 960, 1560, 2160];
    const roadYs = [330, 850, 1370];
    roadXs.forEach(x => {
      g.fillStyle(sidewalkColor, 1); g.fillRect(x - 24, 0, 168, WORLD_H);
      g.fillStyle(roadColor, 1); g.fillRect(x, 0, 120, WORLD_H);
      g.lineStyle(3, 0xd6cfae, 0.8);
      for (let y = 0; y < WORLD_H; y += 72) {
        g.lineBetween(x + 60, y + 10, x + 60, y + 42);
      }
    });
    roadYs.forEach(y => {
      g.fillStyle(sidewalkColor, 1); g.fillRect(0, y - 24, WORLD_W, 168);
      g.fillStyle(roadColor, 1); g.fillRect(0, y, WORLD_W, 120);
      g.lineStyle(3, 0xd6cfae, 0.8);
      for (let x = 0; x < WORLD_W; x += 72) {
        g.lineBetween(x + 10, y + 60, x + 42, y + 60);
      }
    });

    // Decorative green patches
    for (let x = 90; x < WORLD_W; x += 300) {
      for (let y = 80; y < WORLD_H; y += 270) {
        if (this.isRoadArea(x, y)) continue;
        g.fillStyle(0x6e9662, 0.7);
        g.fillRoundedRect(x, y, 145, 110, 12);
      }
    }

    this.buildingRects = [];
    const colors = [0xc6b49a, 0xb8c4c8, 0xc6a18e, 0xd2c7ae, 0xa9b8a0, 0xc0b7cc];
    let bi = 0;
    for (let x = 75; x < WORLD_W - 180; x += 300) {
      for (let y = 65; y < WORLD_H - 150; y += 270) {
        if (this.isRoadArea(x + 100, y + 80)) continue;
        const bx = x + ((bi % 2) * 22);
        const by = y + ((bi % 3) * 12);
        const bw = 150 + (bi % 2) * 28;
        const bh = 125 + (bi % 3) * 10;
        const col = colors[bi % colors.length];

        // Building shadow, wall, roof and windows
        g.fillStyle(0x25332b, 0.45); g.fillRoundedRect(bx + 10, by + 12, bw, bh, 8);
        g.fillStyle(0x8b8b80, 1); g.fillRect(bx - 8, by - 8, bw + 16, bh + 16);
        g.fillStyle(col, 1); g.fillRoundedRect(bx, by, bw, bh, 5);
        g.fillStyle(0x625f5b, 1); g.fillRect(bx + 12, by + 12, bw - 24, 14);
        g.fillStyle(0x6d9da9, 1);
        for (let wx = bx + 20; wx < bx + bw - 15; wx += 38) {
          g.fillRect(wx, by + 42, 20, 25);
          g.lineStyle(2, 0xe4d9c7, 1);
          g.lineBetween(wx + 10, by + 42, wx + 10, by + 67);
        }
        g.fillStyle(0x725d4b, 1); g.fillRect(bx + bw/2 - 12, by + bh - 35, 24, 35);
        this.buildingRects.push({ x: bx, y: by, w: bw, h: bh });
        bi++;
      }
    }

    // Trees in parks
    for (let x = 150; x < WORLD_W; x += 300) {
      for (let y = 180; y < WORLD_H; y += 270) {
        if (this.isRoadArea(x, y)) continue;
        this.drawTree(g, x, y);
      }
    }

    // Station area / sign
    g.fillStyle(0xeee4cb, 1); g.fillRoundedRect(105, 455, 190, 85, 8);
    g.fillStyle(0x5a6b72, 1); g.fillRoundedRect(116, 466, 168, 62, 5);
    g.fillStyle(0xffffff, 1);
    g.fillRect(134, 484, 12, 26); g.fillRect(154, 484, 12, 26);
    g.fillRect(174, 484, 12, 26); g.fillRect(194, 484, 12, 26);
    g.fillStyle(0x263a46, 1); g.fillRect(215, 478, 48, 38);
    this.add.text(200, 444, "ВОКЗАЛ", {
      fontFamily: "Arial", fontSize: "22px", color: "#ffffff",
      stroke: "#18252c", strokeThickness: 4
    }).setOrigin(0.5).setDepth(4);

    // Subtle map grid
    g.lineStyle(1, 0x263e30, 0.16);
    for (let x = 0; x <= WORLD_W; x += 64) g.lineBetween(x, 0, x, WORLD_H);
    for (let y = 0; y <= WORLD_H; y += 64) g.lineBetween(0, y, WORLD_W, y);
  }

  isRoadArea(x, y) {
    const inV = [360, 960, 1560, 2160].some(rx => x >= rx - 35 && x <= rx + 155);
    const inH = [330, 850, 1370].some(ry => y >= ry - 35 && y <= ry + 155);
    return inV || inH;
  }

  drawTree(g, x, y) {
    g.fillStyle(0x4a392b, 1); g.fillRect(x - 5, y + 8, 10, 22);
    g.fillStyle(0x2f593b, 1); g.fillCircle(x, y, 22);
    g.fillStyle(0x47794a, 1); g.fillCircle(x - 7, y - 7, 14);
    g.fillStyle(0x65965a, 1); g.fillCircle(x + 6, y - 8, 10);
  }

  createPlayer() {
    const saved = localStorage.getItem("lifeplus_gender") || "male";
    const key = saved === "female" ? "female" : "male_down";
    this.player = this.physics.add.sprite(200, 600, key);
    this.player.setDepth(10);
    this.player.setScale(1.35);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(24, 38);
    this.player.body.setOffset(10, 36);

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

    this.playerDirection = direction;
    this.player.setTexture(textureKey);

    // Зберігаємо приблизно однакову висоту персонажа для всіх напрямків.
    const targetHeight = 108;
    const source = this.textures.get(textureKey).getSourceImage();
    const ratio = source.width / source.height;
    this.player.setDisplaySize(targetHeight * ratio, targetHeight);
    this.player.body.setSize(24, 38);
    this.player.body.setOffset(
      Math.max(0, (this.player.displayWidth - 24) / 2),
      Math.max(0, this.player.displayHeight - 48)
    );
  }

  addBuildingColliders() {
    // Invisible static bodies follow the decorative buildings.
    // Keep the initial spawn area near the station clear.
    this.buildingRects.forEach(b => {
      const spawnZone = b.x < 320 && b.y > 430 && b.y < 720;
      if (spawnZone) return;
      const body = this.add.rectangle(
        b.x + b.w / 2, b.y + b.h / 2, b.w, b.h, 0x000000, 0
      );
      this.physics.add.existing(body, true);
      this.buildingColliders.add(body);
      body.setVisible(false);
    });
  }

  createControls() {
    this.joy = this.add.image(112, GAME_H - 112, "joystick")
      .setScrollFactor(0).setDepth(100).setAlpha(0.94).setScale(0.86);
    this.joy.setInteractive({ useHandCursor: false });
    this.runButton = this.makeButton(GAME_W - 95, GAME_H - 110, 76, "БІГ", 0x2365a8);
    this.interactButton = this.makeButton(GAME_W - 100, GAME_H - 215, 90, "ВЗАЄМОДІЯ", 0x3b515b);
    this.runButton.on("pointerdown", () => { this.runHeld = true; });
    this.runButton.on("pointerup", () => { this.runHeld = false; });
    this.runButton.on("pointerout", () => { this.runHeld = false; });
    this.interactButton.on("pointerdown", () => {
      this.updateHint(this.nearStation ? "Вокзал: тут згодом будуть NPC та завдання." : "Поруч поки немає об'єктів для взаємодії.");
    });
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
    this.runButton.setPosition(GAME_W - 95, GAME_H - 100);
    this.interactButton.setPosition(GAME_W - 105, GAME_H - 205);
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

    this.nearStation = Phaser.Math.Distance.Between(this.player.x, this.player.y, 200, 520) < 115;
    if (this.nearStation) this.updateHint("Вокзал поруч · натисни «ВЗАЄМОДІЯ»");
    this.player.setDepth(this.player.y + 20);
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
    // Telegram Mini App: розгорнути WebView, якщо API доступний.
    try {
      const tg = window.Telegram && window.Telegram.WebApp;
      if (tg) {
        tg.ready();
        tg.expand();
        if (typeof tg.requestFullscreen === "function") tg.requestFullscreen();
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
  document.addEventListener("fullscreenchange", updateFullscreenButton);
  document.addEventListener("webkitfullscreenchange", updateFullscreenButton);
  window.addEventListener("orientationchange", () => setTimeout(updateFullscreenButton, 250));
  window.addEventListener("resize", updateFullscreenButton);
  updateFullscreenButton();
})();

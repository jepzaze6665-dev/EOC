'use strict';

// ---------- Canvas setup ----------
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ---------- World / Map ----------
const WORLD = {
  width: 3000,
  height: 3000,
  tileSize: 100
};

// ---------- Player ----------
const player = {
  x: WORLD.width / 2,
  y: WORLD.height / 2,
  size: 32,
  speed: 260, // px per second
  color: '#4da3ff',

  className: 'Aegis Guardian',
  maxHp: 120,
  hp: 120,
  attackDamage: 15,
  attackRange: 55,
  attackCooldownTime: 0.5, // seconds between basic attacks
  attackTimer: 0,
  hitFlashTimer: 0, // >0 while flashing red from a recent hit
  facing: { x: 0, y: -1 } // used to aim abilities; updated while moving
};

// ---------- Abilities (Aegis Guardian) ----------
const abilities = {
  shieldBash: {
    key: 'q',
    cooldown: 4,
    timer: 0,
    damage: 30,
    range: 70,
    knockback: 90
  },
  ironWall: {
    key: 'e',
    cooldown: 12,
    timer: 0,
    duration: 3,
    damageReduction: 0.6, // 60% less damage taken while active
    active: false,
    activeTimer: 0
  }
};

// ---------- Camera ----------
const camera = {
  x: 0,
  y: 0
};

function updateCamera() {
  // Center camera on player
  camera.x = player.x - canvas.width / 2;
  camera.y = player.y - canvas.height / 2;

  // Clamp camera to world bounds so it never shows outside the map
  camera.x = Math.max(0, Math.min(camera.x, WORLD.width - canvas.width));
  camera.y = Math.max(0, Math.min(camera.y, WORLD.height - canvas.height));

  // If the world is smaller than the screen, center it instead
  if (WORLD.width < canvas.width) {
    camera.x = -(canvas.width - WORLD.width) / 2;
  }
  if (WORLD.height < canvas.height) {
    camera.y = -(canvas.height - WORLD.height) / 2;
  }
}

// ---------- Input ----------
const keys = {
  w: false, a: false, s: false, d: false
};

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (key in keys) keys[key] = true;

  // Action keys fire once per press, not continuously while held.
  // e.repeat is true when the browser auto-repeats a held key, so we ignore that.
  if (e.repeat) return;
  if (key === ' ') tryBasicAttack();
  if (key === abilities.shieldBash.key) tryShieldBash();
  if (key === abilities.ironWall.key) tryIronWall();
});

window.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  if (key in keys) keys[key] = false;
});

// ---------- Combat: helpers ----------
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function spawnFloatingText(x, y, text, color) {
  floatingTexts.push({ x, y, text, color, timer: 0.8, vy: -40 });
}

// ---------- Combat: monsters ----------
const MONSTER_RESPAWN_DELAY = 5; // seconds before a killed monster respawns

function createMonster(x, y) {
  return {
    x, y,
    spawnX: x, spawnY: y,
    size: 28,
    maxHp: 60,
    hp: 60,
    damage: 10,
    speed: 120,
    detectionRange: 300,
    attackRange: 44,
    attackCooldownTime: 1.2,
    attackTimer: 0,
    hitFlashTimer: 0,
    color: '#8b2fc9',
    alive: true
  };
}

const monsters = [
  createMonster(WORLD.width / 2 + 300, WORLD.height / 2),
  createMonster(WORLD.width / 2 - 300, WORLD.height / 2 + 150),
  createMonster(WORLD.width / 2, WORLD.height / 2 + 350),
  createMonster(WORLD.width / 2 + 150, WORLD.height / 2 - 300),
  createMonster(WORLD.width / 2 - 400, WORLD.height / 2 - 200)
];

const respawnQueue = []; // { x, y, timer }
const floatingTexts = []; // { x, y, text, color, timer, vy }

function killMonster(monster) {
  monster.alive = false;
  respawnQueue.push({ x: monster.spawnX, y: monster.spawnY, timer: MONSTER_RESPAWN_DELAY });

  const index = monsters.indexOf(monster);
  if (index !== -1) monsters.splice(index, 1);
}

function damageMonster(monster, amount) {
  monster.hp = Math.max(0, monster.hp - amount);
  monster.hitFlashTimer = 0.15;
  spawnFloatingText(monster.x, monster.y - monster.size, `-${amount}`, '#ffdd55');
  if (monster.hp <= 0) killMonster(monster);
}

function damagePlayer(amount) {
  const reduction = abilities.ironWall.active ? abilities.ironWall.damageReduction : 0;
  const finalDamage = Math.round(amount * (1 - reduction));
  player.hp = Math.max(0, player.hp - finalDamage);
  player.hitFlashTimer = 0.15;
  spawnFloatingText(player.x, player.y - player.size, `-${finalDamage}`, '#ff5555');

  if (player.hp <= 0) {
    // Simple respawn: full heal and return to the center of the map
    player.hp = player.maxHp;
    player.x = WORLD.width / 2;
    player.y = WORLD.height / 2;
  }
}

function findNearestMonsterInRange(range) {
  let nearest = null;
  let nearestDist = Infinity;
  for (const monster of monsters) {
    if (!monster.alive) continue;
    const d = distance(player, monster);
    if (d <= range && d < nearestDist) {
      nearest = monster;
      nearestDist = d;
    }
  }
  return nearest;
}

// ---------- Combat: player actions ----------
function tryBasicAttack() {
  if (player.attackTimer > 0) return;
  player.attackTimer = player.attackCooldownTime;

  const target = findNearestMonsterInRange(player.attackRange);
  if (target) damageMonster(target, player.attackDamage);
}

function tryShieldBash() {
  const ability = abilities.shieldBash;
  if (ability.timer > 0) return;
  ability.timer = ability.cooldown;

  const target = findNearestMonsterInRange(ability.range);
  if (!target) return;

  damageMonster(target, ability.damage);

  // Knock the target away from the player
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const len = Math.hypot(dx, dy) || 1;
  target.x += (dx / len) * ability.knockback;
  target.y += (dy / len) * ability.knockback;

  const half = target.size / 2;
  target.x = Math.max(half, Math.min(target.x, WORLD.width - half));
  target.y = Math.max(half, Math.min(target.y, WORLD.height - half));
}

function tryIronWall() {
  const ability = abilities.ironWall;
  if (ability.timer > 0) return;
  ability.timer = ability.cooldown;
  ability.active = true;
  ability.activeTimer = ability.duration;
}

// ---------- Update ----------
function updatePlayer(dt) {
  let dx = 0;
  let dy = 0;

  if (keys.w) dy -= 1;
  if (keys.s) dy += 1;
  if (keys.a) dx -= 1;
  if (keys.d) dx += 1;

  // Normalize diagonal movement so it isn't faster than straight movement
  if (dx !== 0 && dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
  }

  if (dx !== 0 || dy !== 0) {
    player.facing.x = dx;
    player.facing.y = dy;
  }

  player.x += dx * player.speed * dt;
  player.y += dy * player.speed * dt;

  const half = player.size / 2;
  player.x = Math.max(half, Math.min(player.x, WORLD.width - half));
  player.y = Math.max(half, Math.min(player.y, WORLD.height - half));
}

// ---------- Update: combat ----------
function updateMonsters(dt) {
  for (const monster of monsters) {
    if (!monster.alive) continue;

    if (monster.hitFlashTimer > 0) monster.hitFlashTimer -= dt;
    if (monster.attackTimer > 0) monster.attackTimer -= dt;

    const d = distance(monster, player);

    if (d <= monster.attackRange) {
      // Close enough to attack
      if (monster.attackTimer <= 0) {
        damagePlayer(monster.damage);
        monster.attackTimer = monster.attackCooldownTime;
      }
    } else if (d <= monster.detectionRange) {
      // Chase the player
      const dx = (player.x - monster.x) / d;
      const dy = (player.y - monster.y) / d;
      monster.x += dx * monster.speed * dt;
      monster.y += dy * monster.speed * dt;
    }
  }
}

function updateRespawns(dt) {
  for (let i = respawnQueue.length - 1; i >= 0; i--) {
    const entry = respawnQueue[i];
    entry.timer -= dt;
    if (entry.timer <= 0) {
      const monster = createMonster(entry.x, entry.y);
      monsters.push(monster);
      respawnQueue.splice(i, 1);
    }
  }
}

function updateFloatingTexts(dt) {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const text = floatingTexts[i];
    text.timer -= dt;
    text.y += text.vy * dt;
    if (text.timer <= 0) floatingTexts.splice(i, 1);
  }
}

function updateCombat(dt) {
  if (player.attackTimer > 0) player.attackTimer -= dt;
  if (player.hitFlashTimer > 0) player.hitFlashTimer -= dt;

  if (abilities.shieldBash.timer > 0) abilities.shieldBash.timer -= dt;
  if (abilities.ironWall.timer > 0) abilities.ironWall.timer -= dt;

  if (abilities.ironWall.active) {
    abilities.ironWall.activeTimer -= dt;
    if (abilities.ironWall.activeTimer <= 0) abilities.ironWall.active = false;
  }

  updateMonsters(dt);
  updateRespawns(dt);
  updateFloatingTexts(dt);
}

// ---------- Draw ----------
function drawGrid() {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;

  const startX = Math.floor(camera.x / WORLD.tileSize) * WORLD.tileSize;
  const startY = Math.floor(camera.y / WORLD.tileSize) * WORLD.tileSize;

  for (let x = startX; x < camera.x + canvas.width; x += WORLD.tileSize) {
    ctx.beginPath();
    ctx.moveTo(x - camera.x, 0);
    ctx.lineTo(x - camera.x, canvas.height);
    ctx.stroke();
  }

  for (let y = startY; y < camera.y + canvas.height; y += WORLD.tileSize) {
    ctx.beginPath();
    ctx.moveTo(0, y - camera.y);
    ctx.lineTo(canvas.width, y - camera.y);
    ctx.stroke();
  }
}

function drawWorldBorder() {
  ctx.strokeStyle = '#ff4d4d';
  ctx.lineWidth = 4;
  ctx.strokeRect(-camera.x, -camera.y, WORLD.width, WORLD.height);
}

function drawPlayer() {
  const screenX = player.x - camera.x;
  const screenY = player.y - camera.y;
  const half = player.size / 2;

  ctx.fillStyle = player.hitFlashTimer > 0 ? '#ff8080' : player.color;
  ctx.fillRect(screenX - half, screenY - half, player.size, player.size);

  // Facing indicator (small line pointing toward the last movement direction)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(screenX, screenY);
  ctx.lineTo(screenX + player.facing.x * (half + 8), screenY + player.facing.y * (half + 8));
  ctx.stroke();

  // Iron Wall shield ring while active
  if (abilities.ironWall.active) {
    ctx.strokeStyle = 'rgba(120, 200, 255, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(screenX, screenY, half + 10, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawHealthBar(screenX, screenY - half - 14, player.size + 10, player.hp, player.maxHp, '#4dff88');
}

function drawHealthBar(centerX, y, width, hp, maxHp, fillColor) {
  const height = 6;
  const x = centerX - width / 2;
  const pct = Math.max(0, hp / maxHp);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = fillColor;
  ctx.fillRect(x, y, width * pct, height);
}

function drawMonsters() {
  for (const monster of monsters) {
    if (!monster.alive) continue;

    const screenX = monster.x - camera.x;
    const screenY = monster.y - camera.y;
    const half = monster.size / 2;

    ctx.fillStyle = monster.hitFlashTimer > 0 ? '#ffffff' : monster.color;
    ctx.beginPath();
    ctx.arc(screenX, screenY, half, 0, Math.PI * 2);
    ctx.fill();

    drawHealthBar(screenX, screenY - half - 12, monster.size + 10, monster.hp, monster.maxHp, '#ff5555');
  }
}

function drawFloatingTexts() {
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  for (const text of floatingTexts) {
    const screenX = text.x - camera.x;
    const screenY = text.y - camera.y;
    ctx.globalAlpha = Math.max(0, text.timer / 0.8);
    ctx.fillStyle = text.color;
    ctx.fillText(text.text, screenX, screenY);
  }
  ctx.globalAlpha = 1;
}

function draw() {
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid();
  drawWorldBorder();
  drawMonsters();
  drawPlayer();
  drawFloatingTexts();
}

// ---------- HUD ----------
const fpsEl = document.getElementById('fps');
const posEl = document.getElementById('pos');
const hpFillEl = document.getElementById('hp-bar-fill');
const hpTextEl = document.getElementById('hp-text');
const monsterCountEl = document.getElementById('monster-count');
const shieldBashEl = document.getElementById('ability-shieldbash');
const ironWallEl = document.getElementById('ability-ironwall');
let fpsTimer = 0;
let fpsFrames = 0;
let fpsDisplay = 0;

function updateAbilityHUD(el, ability) {
  const label = el.querySelector('.ability-label').dataset.label;
  if (ability.timer > 0) {
    el.classList.add('on-cooldown');
    el.querySelector('.ability-label').textContent = `${label} (${ability.timer.toFixed(1)}s)`;
  } else {
    el.classList.remove('on-cooldown');
    el.querySelector('.ability-label').textContent = `${label} - Ready`;
  }
}

function updateHUD(dt) {
  fpsFrames++;
  fpsTimer += dt;
  if (fpsTimer >= 0.5) {
    fpsDisplay = Math.round(fpsFrames / fpsTimer);
    fpsFrames = 0;
    fpsTimer = 0;
    fpsEl.textContent = `FPS: ${fpsDisplay}`;
  }
  posEl.textContent = `X: ${Math.round(player.x)}, Y: ${Math.round(player.y)}`;

  const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);
  hpFillEl.style.width = `${hpPct}%`;
  hpTextEl.textContent = `${player.hp} / ${player.maxHp}`;

  const aliveCount = monsters.filter((m) => m.alive).length;
  monsterCountEl.textContent = `Monsters: ${aliveCount}`;

  updateAbilityHUD(shieldBashEl, abilities.shieldBash);
  updateAbilityHUD(ironWallEl, abilities.ironWall);
}

// ---------- Game Loop (delta time based) ----------
let lastTime = performance.now();

function gameLoop(currentTime) {
  const dt = Math.min((currentTime - lastTime) / 1000, 0.1); // clamp to avoid big jumps (e.g. tab switch)
  lastTime = currentTime;

  updatePlayer(dt);
  updateCombat(dt);
  updateCamera();
  draw();
  updateHUD(dt);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

// Placeholder pixel art, generated with Canvas at startup.
// Every sprite is baked once into an offscreen canvas and then blitted, which is
// exactly how a real sprite sheet would be used - swapping in real .png assets later
// only means changing the builders in this file.
//
// Scale: the painted maps are drawn at 1:1, where a doorway is ~20px tall.
// Characters are ~19px tall to match. (The old isometric-era sprites are kept
// in legacy/world-phase1-iso/rendering/sprites.js.)

// ---------------------------------------------------------------- helpers

export function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(w));
  canvas.height = Math.max(1, Math.ceil(h));
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  return { canvas, g };
}

function px(g, x, y, w, h, color) {
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let gg = (n >> 8) & 255;
  let b = n & 255;
  const target = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  r = Math.round(r + (target - r) * t);
  gg = Math.round(gg + (target - gg) * t);
  b = Math.round(b + (target - b) * t);
  return `#${((1 << 24) | (r << 16) | (gg << 8) | b).toString(16).slice(1)}`;
}

function poly(g, points, color) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
  g.closePath();
  g.fill();
}

// ---------------------------------------------------------------- small world objects
// Sprites are anchored at their feet (bottom center): (ax, ay) is the point that
// sits on the map at the object's (tx, ty).

const OBJECT_ART = {
  sign: { w: 11, h: 11, draw(g) {
    px(g, 5, 4, 1, 7, '#503826');
    px(g, 1, 1, 9, 5, '#8a6a43');
    px(g, 1, 1, 9, 1, '#a8855a');
    px(g, 2, 3, 5, 1, '#e6dcc0');
  } },
  barrier: { w: 16, h: 10, draw(g) {
    px(g, 1, 2, 2, 8, '#5a4229');
    px(g, 13, 2, 2, 8, '#5a4229');
    px(g, 0, 3, 16, 3, '#7a5c3a');
    for (let x = 1; x < 16; x += 5) px(g, x, 3, 2, 3, '#c9a94a');
    px(g, 0, 7, 16, 1, '#5a4229');
  } },
  herb: { w: 9, h: 9, draw(g) {
    const leaf = '#4e8f57';
    const light = '#6fd08a';
    poly(g, [{ x: 1, y: 9 }, { x: 3, y: 9 }, { x: 0, y: 3 }], leaf);
    poly(g, [{ x: 3, y: 9 }, { x: 5, y: 9 }, { x: 4, y: 1 }], light);
    poly(g, [{ x: 5, y: 9 }, { x: 7, y: 9 }, { x: 9, y: 3 }], leaf);
    px(g, 4, 2, 1, 1, '#e8fff0');
    px(g, 1, 4, 1, 1, '#c8f4d8');
    px(g, 7, 4, 1, 1, '#c8f4d8');
  } },
  ore: { w: 11, h: 9, draw(g) {
    poly(g, [{ x: 0, y: 9 }, { x: 1, y: 3 }, { x: 5, y: 0 }, { x: 10, y: 3 }, { x: 11, y: 9 }], '#5f5f6d');
    poly(g, [{ x: 1, y: 3 }, { x: 5, y: 0 }, { x: 6, y: 4 }, { x: 2, y: 5 }], '#7c7c8a');
    px(g, 0, 8, 11, 1, '#42424e');
    px(g, 3, 5, 2, 1, '#c9a05a');
    px(g, 7, 4, 1, 2, '#c9a05a');
    px(g, 6, 6, 1, 1, '#ecd09a');
  } }
};

const objectSprites = {};

function buildObject(art) {
  const { canvas, g } = makeCanvas(art.w, art.h);
  art.draw(g);
  return { canvas, ax: Math.floor(art.w / 2), ay: art.h };
}

export function getObjectSprite(type) {
  if (!objectSprites[type] && OBJECT_ART[type] && typeof document !== 'undefined') {
    objectSprites[type] = buildObject(OBJECT_ART[type]);
  }
  return objectSprites[type] || null;
}

export function objectTypes() {
  return Object.keys(OBJECT_ART);
}

let worldSpritesBuilt = false;

// Called once by the loading screen so the first frame in the world never stutters.
export function buildWorldSprites() {
  if (worldSpritesBuilt) return;
  worldSpritesBuilt = true;
  for (const type of Object.keys(OBJECT_ART)) getObjectSprite(type);
}

// ---------------------------------------------------------------- characters

export const FRAME_W = 16;
export const FRAME_H = 24;
const FEET_X = 8;
const FEET_Y = 22;
const DIR_ROW = { s: 0, w: 1, e: 2, n: 3 };
export const WALK_FRAMES = 4;

// Height of a standing character above its feet - used for name tags, hit effects ...
export const CHARACTER_HEIGHT = 19;

function drawKit(g, kit, ox, bodyTop, side, accent, cloth) {
  if (kit === 'shield') {
    const x = side > 0 ? ox + 3 : ox - 7;
    px(g, x, bodyTop, 4, 7, shade(accent, -0.4));
    px(g, x + 1, bodyTop + 1, 2, 5, accent);
    px(g, x + 1, bodyTop + 3, 1, 1, shade(cloth, 0.3));
  } else if (kit === 'blade') {
    const x = side > 0 ? ox - 6 : ox + 5;
    px(g, x, bodyTop - 5, 1, 9, '#dfe3ec');
    px(g, x - 1, bodyTop + 4, 3, 1, '#8a7a4a');
    px(g, x, bodyTop + 5, 1, 2, '#5a4429');
  } else if (kit === 'staff') {
    const x = side > 0 ? ox - 6 : ox + 5;
    px(g, x, bodyTop - 5, 1, 12, '#6b4f33');
    px(g, x - 1, bodyTop - 7, 3, 3, shade(accent, 0.35));
    px(g, x, bodyTop - 6, 1, 1, '#ffffff');
  }
}

export function drawCharacterFrame(g, look, dir, frame, ox, oy) {
  const back = dir === 'n';
  const skin = look.skin || '#e7b18b';
  const hair = look.hair || '#2f2118';
  const cloth = look.cloth || '#6b7a8f';
  const accent = look.accent || '#c3cbdd';
  const clothDark = shade(cloth, -0.32);
  const clothLight = shade(cloth, 0.2);
  const pants = '#2e2a36';
  const boots = '#1c1a24';

  const bob = frame === 1 || frame === 3 ? -1 : 0;
  const step = frame === 1 ? 1 : frame === 3 ? -1 : 0;

  // legs
  for (const [lx, off] of [[-3, step], [1, -step]]) {
    const top = oy - 5 + Math.max(0, off);
    const h = 5 - Math.abs(off);
    px(g, ox + lx, top, 2, h, pants);
    px(g, ox + lx, top + h - 1, 2, 1, boots);
  }

  const bodyTop = oy - 12 + bob;
  const headTop = oy - 18 + bob;

  // arms
  px(g, ox - 4, bodyTop + 1, 1, 5, clothDark);
  px(g, ox + 3, bodyTop + 1, 1, 5, clothDark);
  px(g, ox - 4, bodyTop + 5, 1, 1, skin);
  px(g, ox + 3, bodyTop + 5, 1, 1, skin);

  // torso
  px(g, ox - 3, bodyTop, 6, 7, cloth);
  px(g, ox - 3, bodyTop, 6, 1, clothLight);
  px(g, ox - 3, bodyTop + 1, 1, 4, clothDark);
  px(g, ox - 3, bodyTop + 5, 6, 1, accent);

  // head
  px(g, ox - 3, headTop, 6, 6, skin);

  const style = look.hairStyle || 'short';
  if (style === 'bald') {
    px(g, ox - 3, headTop, 6, 1, shade(skin, -0.18));
  } else if (style === 'hood') {
    px(g, ox - 4, headTop - 1, 8, 5, clothDark);
    px(g, ox - 4, headTop + 4, 8, 2, cloth);
    if (!back) px(g, ox - 2, headTop + 2, 4, 3, shade(skin, -0.45));
  } else {
    px(g, ox - 3, headTop - 1, 6, 3, hair);
    px(g, ox - 3, headTop + 2, 1, 1, hair);
    px(g, ox + 2, headTop + 2, 1, 1, hair);
    if (style === 'long') {
      px(g, ox - 4, headTop, 1, 7, hair);
      px(g, ox + 3, headTop, 1, 7, hair);
      if (back) px(g, ox - 3, headTop, 6, 7, hair);
    } else if (style === 'ponytail') {
      px(g, ox + (back ? -1 : 3), headTop + 1, 1, 5, hair);
    } else if (style === 'braid') {
      px(g, ox - 4, headTop + 1, 1, 5, hair);
      px(g, ox + 3, headTop + 1, 1, 5, hair);
      px(g, ox + (back ? 0 : 2), headTop + 5, 1, 3, hair);
    } else if (back) {
      px(g, ox - 3, headTop, 6, 4, hair);
    }
  }

  // face
  if (!back && style !== 'hood') {
    const eye = '#20202c';
    if (dir === 's') {
      px(g, ox - 2, headTop + 3, 1, 1, eye);
      px(g, ox + 1, headTop + 3, 1, 1, eye);
    } else if (dir === 'e') {
      px(g, ox + 1, headTop + 3, 1, 1, eye);
    } else if (dir === 'w') {
      px(g, ox - 2, headTop + 3, 1, 1, eye);
    }
  }

  const shieldSide = dir === 'w' || dir === 'n' ? 1 : -1;
  drawKit(g, look.kit, ox, bodyTop, shieldSide, accent, cloth);
}

export function buildCharacterSheet(look) {
  const dirs = Object.keys(DIR_ROW);
  const { canvas, g } = makeCanvas(FRAME_W * WALK_FRAMES, FRAME_H * dirs.length);
  for (const dir of dirs) {
    for (let frame = 0; frame < WALK_FRAMES; frame++) {
      const ox = frame * FRAME_W + FEET_X;
      const oy = DIR_ROW[dir] * FRAME_H + FEET_Y;
      drawCharacterFrame(g, look, dir, frame, ox, oy);
    }
  }
  return { canvas, frameW: FRAME_W, frameH: FRAME_H, feetX: FEET_X, feetY: FEET_Y };
}

export function drawSheetFrame(g, sheet, dir, frame, x, y) {
  const row = DIR_ROW[dir] ?? 0;
  const fw = sheet.frameW;
  const fh = sheet.frameH;
  g.drawImage(
    sheet.canvas,
    frame * fw, row * fh, fw, fh,
    Math.round(x - sheet.feetX), Math.round(y - sheet.feetY), fw, fh
  );
}

// ---------------------------------------------------------------- monsters

const MONSTER_W = 20;
const MONSTER_H = 22;
const MONSTER_FEET_X = 10;
const MONSTER_FEET_Y = 20;

function drawSlimeFrame(g, colors, dir, frame, ox, oy) {
  // squash and stretch across the 4 frames
  const squash = [0, 1, 2, 1][frame];
  const w = 13 + squash;
  const h = 10 - squash;
  const top = oy - h;

  g.fillStyle = colors.body;
  g.beginPath();
  g.ellipse(ox, top + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = colors.bodyDark;
  g.beginPath();
  g.ellipse(ox, top + h * 0.78, w / 2.4, h / 3.4, 0, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = colors.bodyLight;
  g.beginPath();
  g.ellipse(ox - w * 0.18, top + h * 0.3, w / 5, h / 5, 0, 0, Math.PI * 2);
  g.fill();

  if (dir !== 'n') {
    const shift = dir === 'e' ? 2 : dir === 'w' ? -2 : 0;
    px(g, ox - 3 + shift, top + Math.round(h * 0.38), 1, 2, colors.eye);
    px(g, ox + 2 + shift, top + Math.round(h * 0.38), 1, 2, colors.eye);
  }
}

function drawWraithFrame(g, colors, dir, frame, ox, oy) {
  const bob = [0, -1, 0, 1][frame];
  const top = oy - 18 + bob;

  // tattered lower body
  g.fillStyle = colors.bodyDark;
  g.beginPath();
  g.moveTo(ox - 5, top + 8);
  g.lineTo(ox + 5, top + 8);
  g.lineTo(ox + 4, oy - 1);
  g.lineTo(ox + 1, oy - 3 + (frame % 2));
  g.lineTo(ox - 1, oy - 1);
  g.lineTo(ox - 4, oy - 3 - (frame % 2));
  g.closePath();
  g.fill();

  // hooded torso
  g.fillStyle = colors.body;
  g.beginPath();
  g.moveTo(ox, top - 1);
  g.lineTo(ox + 6, top + 5);
  g.lineTo(ox + 5, top + 11);
  g.lineTo(ox - 5, top + 11);
  g.lineTo(ox - 6, top + 5);
  g.closePath();
  g.fill();

  g.fillStyle = colors.bodyLight;
  g.beginPath();
  g.moveTo(ox, top - 1);
  g.lineTo(ox + 6, top + 5);
  g.lineTo(ox + 3, top + 6);
  g.closePath();
  g.fill();

  if (dir !== 'n') {
    const shift = dir === 'e' ? 1 : dir === 'w' ? -1 : 0;
    px(g, ox - 3 + shift, top + 4, 1, 1, colors.eye);
    px(g, ox + 2 + shift, top + 4, 1, 1, colors.eye);
  }

  // arms
  px(g, ox - 8, top + 6, 2, 4, colors.bodyDark);
  px(g, ox + 6, top + 6, 2, 4, colors.bodyDark);
}

const MONSTER_BODIES = {
  slime: drawSlimeFrame,
  wraith: drawWraithFrame
};

// Height of each body type above its feet (for health bars and name tags).
export const MONSTER_HEIGHT = { slime: 11, wraith: 19 };

export function buildMonsterSheet(def) {
  const dirs = Object.keys(DIR_ROW);
  const { canvas, g } = makeCanvas(MONSTER_W * WALK_FRAMES, MONSTER_H * dirs.length);
  const draw = MONSTER_BODIES[def.body] || MONSTER_BODIES.slime;

  for (const dir of dirs) {
    for (let frame = 0; frame < WALK_FRAMES; frame++) {
      const ox = frame * MONSTER_W + MONSTER_FEET_X;
      const oy = DIR_ROW[dir] * MONSTER_H + MONSTER_FEET_Y;
      draw(g, def.colors, dir, frame, ox, oy);
    }
  }
  return { canvas, frameW: MONSTER_W, frameH: MONSTER_H, feetX: MONSTER_FEET_X, feetY: MONSTER_FEET_Y };
}

export function drawShadow(g, x, y, radius = 4) {
  g.save();
  g.globalAlpha = 0.3;
  g.fillStyle = '#000000';
  g.beginPath();
  g.ellipse(Math.round(x), Math.round(y), radius, radius / 2, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

// ---------------------------------------------------------------- item icons

const ICON_SIZE = 16;
let iconBuffer = null;

const ICON_SHAPES = {
  leaf(g, c) {
    px(g, 7, 9, 2, 6, '#3a6b44');
    poly(g, [{ x: 8, y: 2 }, { x: 13, y: 7 }, { x: 8, y: 11 }, { x: 4, y: 6 }], c);
    poly(g, [{ x: 8, y: 3 }, { x: 11, y: 6 }, { x: 8, y: 8 }], shade(c, 0.3));
  },
  ore(g, c) {
    poly(g, [{ x: 3, y: 12 }, { x: 4, y: 5 }, { x: 9, y: 2 }, { x: 13, y: 7 }, { x: 12, y: 13 }], c);
    poly(g, [{ x: 4, y: 5 }, { x: 9, y: 2 }, { x: 9, y: 7 }, { x: 5, y: 8 }], shade(c, 0.3));
    px(g, 6, 9, 2, 2, '#d8b063');
    px(g, 9, 6, 2, 2, '#d8b063');
  },
  potion(g, c) {
    px(g, 6, 2, 4, 3, '#8a6a4a');
    px(g, 6, 5, 4, 1, shade(c, -0.4));
    poly(g, [{ x: 5, y: 6 }, { x: 11, y: 6 }, { x: 12, y: 13 }, { x: 4, y: 13 }], shade(c, -0.25));
    poly(g, [{ x: 5, y: 8 }, { x: 11, y: 8 }, { x: 11, y: 12 }, { x: 5, y: 12 }], c);
    px(g, 6, 9, 1, 2, shade(c, 0.5));
  },
  sword(g, c) {
    px(g, 7, 2, 2, 9, c);
    px(g, 7, 2, 1, 9, shade(c, 0.4));
    px(g, 4, 11, 8, 1, '#8a7a4a');
    px(g, 7, 12, 2, 3, '#5a4429');
  },
  mace(g, c) {
    px(g, 7, 9, 2, 6, '#5a4429');
    poly(g, [{ x: 8, y: 1 }, { x: 12, y: 5 }, { x: 8, y: 9 }, { x: 4, y: 5 }], c);
    poly(g, [{ x: 8, y: 2 }, { x: 10, y: 4 }, { x: 8, y: 6 }, { x: 6, y: 4 }], shade(c, 0.3));
  },
  staff(g, c) {
    px(g, 7, 5, 2, 10, '#6b4f33');
    poly(g, [{ x: 8, y: 1 }, { x: 12, y: 5 }, { x: 8, y: 8 }, { x: 4, y: 5 }], c);
    px(g, 7, 4, 2, 2, '#ffffff');
  },
  armor(g, c) {
    poly(g, [{ x: 4, y: 3 }, { x: 7, y: 2 }, { x: 9, y: 2 }, { x: 12, y: 3 }, { x: 12, y: 12 }, { x: 4, y: 12 }], c);
    poly(g, [{ x: 4, y: 3 }, { x: 7, y: 2 }, { x: 8, y: 6 }, { x: 5, y: 7 }], shade(c, 0.28));
    px(g, 7, 6, 2, 6, shade(c, -0.35));
  },
  ring(g, c) {
    g.fillStyle = shade(c, -0.1);
    g.beginPath();
    g.arc(8, 10, 5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#0d0d1a';
    g.beginPath();
    g.arc(8, 10, 3, 0, Math.PI * 2);
    g.fill();
    poly(g, [{ x: 8, y: 1 }, { x: 11, y: 4 }, { x: 8, y: 7 }, { x: 5, y: 4 }], shade(c, 0.4));
  },
  relic(g, c) {
    poly(g, [{ x: 8, y: 1 }, { x: 12, y: 8 }, { x: 8, y: 14 }, { x: 4, y: 8 }], c);
    poly(g, [{ x: 8, y: 3 }, { x: 10, y: 8 }, { x: 8, y: 11 }, { x: 6, y: 8 }], shade(c, 0.4));
    px(g, 7, 6, 1, 3, '#ffffff');
  }
};

export function renderItemIcon(canvas, itemDef, scale = 2) {
  if (!iconBuffer) iconBuffer = makeCanvas(ICON_SIZE, ICON_SIZE);
  const { canvas: src, g: sg } = iconBuffer;
  sg.clearRect(0, 0, ICON_SIZE, ICON_SIZE);

  const shape = ICON_SHAPES[itemDef?.icon?.shape] || ICON_SHAPES.relic;
  shape(sg, itemDef?.icon?.color || '#b8b8c8');

  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.drawImage(
    src, 0, 0, ICON_SIZE, ICON_SIZE,
    Math.round((canvas.width - ICON_SIZE * scale) / 2),
    Math.round((canvas.height - ICON_SIZE * scale) / 2),
    ICON_SIZE * scale, ICON_SIZE * scale
  );
}

let portraitBuffer = null;

// Characters got smaller (24px frames instead of 32px), so portraits use one scale
// step more than callers ask for - but never more than fits the canvas.
export function renderCharacterPortrait(canvas, look, { scale = 4, dir = 's', frame = 0 } = {}) {
  const fit = Math.max(1, Math.floor(Math.min(canvas.width / FRAME_W, canvas.height / FRAME_H)));
  scale = Math.min(fit, Math.max(scale, 1) + 1);
  if (!portraitBuffer) portraitBuffer = makeCanvas(FRAME_W, FRAME_H);
  const { canvas: src, g: sg } = portraitBuffer;
  sg.clearRect(0, 0, FRAME_W, FRAME_H);
  drawCharacterFrame(sg, look, dir, frame, FEET_X, FEET_Y);

  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.drawImage(
    src, 0, 0, FRAME_W, FRAME_H,
    Math.round((canvas.width - FRAME_W * scale) / 2),
    Math.round((canvas.height - FRAME_H * scale) / 2),
    FRAME_W * scale, FRAME_H * scale
  );
}

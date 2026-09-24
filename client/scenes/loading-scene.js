import { showScreen } from '../ui/screens.js';
import { drawNightSky } from '../rendering/backdrop.js';
import { buildWorldSprites } from '../rendering/sprites.js';

const TIPS = [
  'กด WASD เพื่อเดิน · กด E เพื่อคุยกับ NPC หรือเก็บของ',
  'หมู่บ้านคือ Safe Zone — มอนสเตอร์อยู่นอกประตูหมู่บ้าน',
  'กด Shift ค้างเพื่อ Guard ลดดาเมจ 65% · กด Q เพื่อหลบ',
  'กด Tab เพื่อล็อกเป้าหมาย · กด 1-3 เพื่อใช้สกิล · กด F ดื่มโพชั่น',
  'NPC บางคนพูดสิ่งที่ไม่มีอยู่ใน Quest Log',
  'ออกจากการต่อสู้สักพักแล้ว HP และ MP จะฟื้นเอง',
  'สังเกตสิ่งรอบตัวให้ดี โลกนี้ไม่ได้บอกทุกอย่างกับเจ้า'
];

const ZONE_NAMES = {
  'lumina-village': 'Lumina Village',
  'whispering-forest': 'Whispering Forest'
};

export class LoadingScene {
  constructor(game) {
    this.game = game;
    this.time = 0;
    this.progress = 0;
    this.params = null;
    this.assetsBuilt = false;
    this.map = null;
    this.error = null;
  }

  enter(params) {
    this.time = 0;
    this.progress = 0;
    this.params = params;
    this.assetsBuilt = false;
    this.map = null;
    this.error = null;

    const mapId = params.mapId || 'lumina-village';

    // The map's JSON + image download in the background while the bar fills.
    this.game.maps.load(mapId)
      .then((map) => {
        this.map = map;
      })
      .catch((err) => {
        this.error = err;
        console.error(err);
      });

    showScreen('screen-loading');
    const zone = ZONE_NAMES[mapId] || 'the world';
    document.querySelector('.loading-title').textContent = `Entering ${zone}…`;
    document.getElementById('loading-tip').textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
    document.getElementById('loading-fill').style.width = '0%';
  }

  update(dt) {
    this.time += dt;

    if (this.error) {
      document.getElementById('loading-tip').textContent = `โหลดแผนที่ไม่สำเร็จ: ${this.error.message}`;
      return;
    }

    // The bar waits at 90% until the map has actually arrived.
    const cap = this.map ? 1 : 0.9;
    this.progress = Math.min(cap, this.progress + dt / 0.9);
    document.getElementById('loading-fill').style.width = `${Math.round(this.progress * 100)}%`;

    // Generate the world sprites once, part-way through the bar.
    if (!this.assetsBuilt && this.progress > 0.3) {
      buildWorldSprites();
      this.assetsBuilt = true;
    }

    if (this.progress >= 1 && this.assetsBuilt && this.map) {
      this.game.scenes.change('world', {
        character: this.params.character,
        map: this.map,
        spawn: this.params.spawn || 'default'
      });
    }
  }

  render(renderer) {
    renderer.beginScreen();
    drawNightSky(renderer, this.time, { eclipse: true, dim: 0.6 });
    renderer.end();
  }
}

// Map Transition - moves the local player from one map to another:
//
//   changeMap('whispering-forest', 'from_village')
//      1. Fade Out   the screen goes black
//      2. Load       the map (already cached most of the time, see MapManager.preloadNeighbors)
//      3. Spawn      the scene puts the player on the named spawn point
//      4. Fade In    the new map appears, with its name shown for a moment
//
// Nothing here is specific to any map: every exit in every map uses the same call.
// While a transition runs, `active` is true and the scene ignores gameplay input.

const FADE_OUT = 0.35;
const FADE_IN = 0.45;
const TITLE_TIME = 2.2;

export class MapTransition {
  // onArrive(map, spawnPoint) is called by the transition while the screen is black.
  // onError(error) is called if the map could not be loaded (the player stays where they were).
  constructor(mapManager, { onArrive, onError = () => {} } = {}) {
    this.maps = mapManager;
    this.onArrive = onArrive;
    this.onError = onError;
    this.state = 'idle';     // idle | out | wait | in
    this.timer = 0;
    this.waitTime = 0;
    this.target = null;
    this.loaded = null;
    this.failed = null;
    this.title = null;
    this.titleTimer = 0;
  }

  get active() {
    return this.state !== 'idle';
  }

  // 0 = fully visible, 1 = black
  get alpha() {
    if (this.state === 'out') return Math.min(1, this.timer / FADE_OUT);
    if (this.state === 'wait') return 1;
    if (this.state === 'in') return Math.max(0, 1 - this.timer / FADE_IN);
    return 0;
  }

  // Shown while a slow map is still downloading behind the black screen.
  get showLoading() {
    return this.state === 'wait' && this.waitTime > 0.3;
  }

  // Returns false if a transition is already running (a second exit touched mid-fade).
  changeMap(mapId, spawnName = 'default') {
    if (this.active) return false;
    this.state = 'out';
    this.timer = 0;
    this.waitTime = 0;
    this.target = { mapId, spawnName };
    this.loaded = null;
    this.failed = null;

    // Loading starts right away, in parallel with the fade.
    this.maps.load(mapId).then(
      (map) => {
        if (this.target && this.target.mapId === mapId) this.loaded = map;
      },
      (err) => {
        if (this.target && this.target.mapId === mapId) this.failed = err;
      }
    );
    return true;
  }

  update(dt) {
    if (this.titleTimer > 0) this.titleTimer -= dt;
    if (this.state === 'idle') return;
    this.timer += dt;

    if (this.state === 'out' && this.timer >= FADE_OUT) {
      this.state = 'wait';
      this.timer = 0;
    }

    if (this.state === 'wait') {
      this.waitTime += dt;
      if (this.failed) {
        const err = this.failed;
        this.finishFadeIn();
        this.onError(err);
      } else if (this.loaded) {
        const map = this.loaded;
        const point = map.getSpawn(this.target.spawnName);
        this.maps.setCurrent(map);
        this.onArrive(map, point);
        this.maps.preloadNeighbors();
        this.title = map.name;
        this.titleTimer = TITLE_TIME;
        this.finishFadeIn();
      }
      return;
    }

    if (this.state === 'in' && this.timer >= FADE_IN) {
      this.state = 'idle';
      this.target = null;
    }
  }

  finishFadeIn() {
    this.state = 'in';
    this.timer = 0;
    this.loaded = null;
    this.failed = null;
  }

  showTitle(name) {
    this.title = name;
    this.titleTimer = TITLE_TIME;
  }

  // Map name banner after arriving: 0..1 opacity.
  get titleAlpha() {
    if (this.titleTimer <= 0) return 0;
    const t = TITLE_TIME - this.titleTimer;
    return Math.min(1, t / 0.4, this.titleTimer / 0.6);
  }
}

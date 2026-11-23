/**
 * Pseudo-3D Curved Road System
 * Implementation based on segmented OutRun projection mathematics.
 */

const THEMES = {
  sunset: {
    name: 'Sunset Highway',
    skyGradient: ['#120826', '#3b124d', '#781d65', '#d43d51', '#f58231', '#ffe600'],
    sunColor: '#ffe066',
    sunGlow: '#ff4b82',
    mountains: '#280c3b',
    horizonDistant: '#461352',
    road: {
      light: { road: '#3b3247', grass: '#1d0e2e', rumble: '#ff2a85', lane: '#ffffff' },
      dark:  { road: '#32293d', grass: '#140822', rumble: '#ffffff', lane: 'transparent' }
    },
    fog: '#120826'
  },
  neon: {
    name: 'Neon Cyber City',
    skyGradient: ['#050212', '#0a0524', '#160d47', '#1c1559', '#0d2259', '#00f0ff'],
    sunColor: '#00f0ff',
    sunGlow: '#9d00ff',
    mountains: '#0c0724',
    horizonDistant: '#110c36',
    road: {
      light: { road: '#151522', grass: '#080512', rumble: '#00f0ff', lane: '#ff2a85' },
      dark:  { road: '#0f0f18', grass: '#05030b', rumble: '#ff2a85', lane: 'transparent' }
    },
    fog: '#070414'
  },
  desert: {
    name: 'Desert Canyon',
    skyGradient: ['#1a2b4c', '#2c5270', '#5b8296', '#d9945b', '#e8a86b', '#fadc8c'],
    sunColor: '#fff1a8',
    sunGlow: '#e8723a',
    mountains: '#70331b',
    horizonDistant: '#8a4325',
    road: {
      light: { road: '#4f4741', grass: '#a86532', rumble: '#ffffff', lane: '#ffffff' },
      dark:  { road: '#443d37', grass: '#915325', rumble: '#c43d23', lane: 'transparent' }
    },
    fog: '#6e4530'
  }
};

class Road {
  constructor() {
    this.segments = [];
    this.segmentLength = 200; // Length of each road slice along Z
    this.rumbleLength = 3;    // Number of segments per rumble strip color cycle
    this.trackLength = 0;
    this.lanes = 3;
    this.roadWidth = 2000;    // Half-width of the road in world units
    this.drawDistance = 300;  // How many segments ahead to render
    this.currentThemeKey = 'sunset';
    this.theme = THEMES[this.currentThemeKey];

    // Build the track segments
    this.buildTrack();
  }

  setTheme(themeKey) {
    if (THEMES[themeKey]) {
      this.currentThemeKey = themeKey;
      this.theme = THEMES[themeKey];
      this.refreshSegmentColors();
    }
  }

  cycleTheme() {
    const keys = Object.keys(THEMES);
    const nextIdx = (keys.indexOf(this.currentThemeKey) + 1) % keys.length;
    this.setTheme(keys[nextIdx]);
    return this.theme.name;
  }

  refreshSegmentColors() {
    for (let n = 0; n < this.segments.length; n++) {
      const isLight = Math.floor(n / this.rumbleLength) % 2 === 0;
      this.segments[n].color = isLight ? this.theme.road.light : this.theme.road.dark;
    }
  }

  addSegment(curve, y) {
    const n = this.segments.length;
    const isLight = Math.floor(n / this.rumbleLength) % 2 === 0;

    this.segments.push({
      index: n,
      p1: { world: { x: 0, y: this.lastY(), z: n * this.segmentLength }, camera: {}, screen: {} },
      p2: { world: { x: 0, y: y, z: (n + 1) * this.segmentLength }, camera: {}, screen: {} },
      curve: curve,
      sprites: [],
      cars: [],
      color: isLight ? this.theme.road.light : this.theme.road.dark,
      isCheckpoint: false
    });
  }

  lastY() {
    return (this.segments.length === 0) ? 0 : this.segments[this.segments.length - 1].p2.world.y;
  }

  addRoad(enter, hold, leave, curve, y) {
    const startY = this.lastY();
    const endY = startY + (y * this.segmentLength);
    const total = enter + hold + leave;

    for (let n = 0; n < enter; n++) {
      this.addSegment(
        this.easeIn(0, curve, n / enter),
        this.easeInOut(startY, endY, n / total)
      );
    }
    for (let n = 0; n < hold; n++) {
      this.addSegment(
        curve,
        this.easeInOut(startY, endY, (enter + n) / total)
      );
    }
    for (let n = 0; n < leave; n++) {
      this.addSegment(
        this.easeInOut(curve, 0, n / leave),
        this.easeInOut(startY, endY, (enter + hold + n) / total)
      );
    }
  }

  easeIn(a, b, percent) {
    return a + (b - a) * Math.pow(percent, 2);
  }

  easeOut(a, b, percent) {
    return a + (b - a) * (1 - Math.pow(1 - percent, 2));
  }

  easeInOut(a, b, percent) {
    return a + (b - a) * ((-Math.cos(percent * Math.PI) / 2) + 0.5);
  }

  buildTrack() {
    this.segments = [];

    // Stage 1: Introductory Highway with gentle warm-up curves
    this.addRoad(50, 50, 50, 0, 0);               // Warmup straight
    this.addRoad(40, 60, 40, 2.5, 10);            // Gentle right sweep over small rise
    this.addRoad(40, 40, 40, -3.0, -15);          // Counter left turn down slope
    this.addRoad(50, 50, 50, 0, 20);              // Big hill climb straight
    this.addRoad(40, 60, 40, 4.0, -25);           // Thrilling downhill right bend

    // Checkpoint 1
    const cp1 = this.segments.length;
    this.addRoad(60, 80, 60, 0, 0);               // Straightaway with Checkpoint
    this.segments[cp1].isCheckpoint = true;

    // Stage 2: Rollercoaster Curves & Hills
    this.addRoad(50, 80, 50, -5.0, 30);           // Steep left climb
    this.addRoad(30, 40, 30, 5.5, -40);           // High-speed crest right drop
    this.addRoad(50, 50, 50, -2.0, 10);           // Gentle S-curve recovery
    this.addRoad(40, 60, 40, 3.5, -10);

    // Checkpoint 2
    const cp2 = this.segments.length;
    this.addRoad(50, 60, 50, 0, 0);
    this.segments[cp2].isCheckpoint = true;

    // Stage 3: Extreme Corkscrew & Neon Canyon
    this.addRoad(60, 90, 60, -6.0, -20);          // Deep left canyon run
    this.addRoad(50, 80, 50, 6.0, 25);            // Sweeping wide right hill
    this.addRoad(40, 50, 40, -4.5, -15);
    this.addRoad(80, 100, 80, 0, 0);              // Grand final sprint straight

    // Final Finish line Checkpoint
    const cpFinal = this.segments.length - 1;
    this.segments[cpFinal].isCheckpoint = true;

    this.trackLength = this.segments.length * this.segmentLength;

    // Populate roadside scenery sprites (Palm trees, Billboards, Streetlights, Cacti)
    this.populateScenery();
  }

  populateScenery() {
    const spriteTypes = ['palm', 'billboard', 'lamppost', 'rock', 'cactus'];

    for (let n = 20; n < this.segments.length; n += 4) {
      // Left side roadside object
      if (Math.random() > 0.3) {
        const type = (n % 40 === 0) ? 'billboard' : (n % 12 === 0) ? 'lamppost' : 'palm';
        this.segments[n].sprites.push({
          type: type,
          offset: -1.4 - (Math.random() * 1.5)
        });
      }

      // Right side roadside object
      if (Math.random() > 0.3) {
        const type = (n % 36 === 0) ? 'billboard' : (n % 10 === 0) ? 'lamppost' : 'palm';
        this.segments[n].sprites.push({
          type: type,
          offset: 1.4 + (Math.random() * 1.5)
        });
      }
    }
  }

  findSegment(z) {
    return this.segments[Math.floor(z / this.segmentLength) % this.segments.length];
  }
}

window.Road = Road;
window.THEMES = THEMES;

# TurboOutrun - 3D Retro Arcade Racer 🏎️💨

> An adrenaline-pumping 80s arcade pseudo-3D highway racing game built with pure modern HTML5, Canvas 2D, and Web Audio API. Inspired by legendary classics like *OutRun* and *Horizon Chase*.

![Version](https://img.shields.io/badge/version-1.0.0-ff2a85.svg)
![License](https://img.shields.io/badge/license-MIT-00f0ff.svg)
![Zero Dependencies](https://img.shields.io/badge/dependencies-none-ffe600.svg)
![Web Audio](https://img.shields.io/badge/audio-procedural%20synth-ff6e27.svg)

---

## 🎮 Live Demo & Play
Play directly in your browser without any installations or external dependencies!
Deployable directly via **GitHub Pages**.

---

## ✨ Features

- **Iconic Pseudo-3D Road Engine**:
  - OutRun segmented road projection algorithm with smooth curves, rolling hills, and elevation changes.
  - Realistic depth scaling and back-to-front rendering with horizon clipping.
  - Dynamic roadside scenery: retro palm trees, illuminated billboards, neon streetlights, and checkpoint arches.

- **100% Procedural Web Audio API Synthesizer**:
  - **Dynamic Engine Roar**: Dual-oscillator FM synth modulating frequency, harmonic distortion, and throttle filters in real-time with RPM.
  - **Tire Screech**: White noise bandpass filter squeal when cornering and drifting at high speeds.
  - **Nitro Boost Whoosh**: Resonant bandpass filter frequency sweep.
  - **Impact Crunch**: Low-end sub-thud + noise blast on collision.
  - **Checkpoint Fanfare**: 4-note arcade arpeggio chord chime.
  - **80s Synthwave Bassline**: Driving retro electronic rhythm.

- **Selectable Machines**:
  - 🏎️ **Veloce Red**: Balanced top speed (290 km/h) & steady grip.
  - ⚡ **Neon Cyber**: Sharper steering, high-drift handling & fast recovery.
  - 💥 **Thunder GT**: High top speed (305 km/h) & 2x Nitro multiplier.

- **Dynamic Multi-Theme Environments**:
  - 🌆 **Sunset Highway**: Miami synthwave pink-purple sky and palm silhouettes.
  - 🌃 **Neon Cyber City**: Dark asphalt, neon cyan/magenta curbs, futuristic towers.
  - 🏜️ **Desert Canyon**: Red rock pillars, cacti, and golden desert sun.
  - *Switch instantly during gameplay with the **[T]** key!*

- **AI Traffic & Score Mechanics**:
  - Multiple vehicle types: sports cars, sedans, trucks, and coupes.
  - Lane changes and varying cruising speeds.
  - **Overtake & Near-Miss Bonuses**: Daring close-passes grant extra points and refill your Nitro tank.
  - **Checkpoint Extension**: Pass checkpoints before time runs out to earn +20 seconds.

- **Retro Synthwave Arcade HUD**:
  - Speedometer & live RPM tachometer bar.
  - Nitro gauge with cooldown & depletion.
  - Checkpoint progress track bar.
  - CRT scanlines and subtle arcade monitor curvature illusion.
  - High score saved automatically in `localStorage`.

- **Responsive & Mobile Ready**:
  - Full keyboard support for desktops.
  - On-screen touch controls for tablets and mobile devices.

---

## 🕹️ Controls

| Action | Keyboard | Touch / Mobile |
| :--- | :--- | :--- |
| **Accelerate** | `↑` or `W` | `GAS` Button |
| **Brake / Reverse** | `↓` or `S` | `BRAKE` Button |
| **Steer Left** | `←` or `A` | `◀` Button |
| **Steer Right** | `→` or `D` | `▶` Button |
| **Nitro Boost** | `Space` or `Shift` | `⚡ NITRO` Button |
| **Mute / Unmute Audio** | `M` | Audio icon top right |
| **Change Theme** | `T` | Theme icon top right |
| **Pause Game** | `P` or `Esc` | Pause icon |

---

## 🚀 Quick Start / Local Play

Because TurboOutrun uses zero external libraries or bundlers, you can run it immediately with any static file server or by opening `index.html`.

### Option 1: Python 3 (Recommended)
```bash
# Clone the repository
git clone https://github.com/naveen9871/car-racing-game.git
cd car-racing-game

# Start local server
python3 -m http.server 8000
```
Then navigate to `http://localhost:8000` in your browser.

### Option 2: Direct Open
Double-click `index.html` in your file explorer to open it in Chrome, Safari, Firefox, or Edge.

---

## 🌐 Deploy to GitHub Pages

1. Push this repository to GitHub:
   ```bash
   git add .
   git commit -m "Initial release of TurboOutrun 3D Arcade Racer"
   git push -u origin main
   ```
2. In your repository on GitHub:
   - Go to **Settings** > **Pages**.
   - Under **Build and deployment** > **Source**, choose **Deploy from a branch**.
   - Select **Branch**: `main`, Folder: `/ (root)`.
   - Click **Save**.
3. Your game will be live at `https://naveen9871.github.io/car-racing-game/`!

---

## 📂 Project Architecture

```
car-racing-game/
├── index.html          # Main HTML structure, HUD, menus, and overlays
├── css/
│   └── style.css       # Retro synthwave design, typography, scanlines, responsive HUD
├── js/
│   ├── audio.js        # Web Audio API synthesizers (Engine, Screech, Nitro, Crash, Music)
│   ├── road.js         # Pseudo-3D road geometry, curves, hills, themes & segments
│   ├── car.js          # Player car physics, drift, nitro, steering & vehicle models
│   ├── traffic.js      # AI traffic vehicles, lane behavior, collision & overtake logic
│   ├── renderer.js     # Canvas 2D projection, parallax skies, roadside sprites & player car
│   └── game.js         # Game loop, state machine, inputs, HUD & score tracking
├── README.md           # Documentation & instructions
└── LICENSE             # MIT License
```

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
Feel free to fork, customize, modify, and build upon it!

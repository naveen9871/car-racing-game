/**
 * TurboOutrun Main Game Engine & Controller
 */

const STATE = {
  MENU: 'menu',
  RACING: 'racing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover'
};

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.state = STATE.MENU;

    // Subsystems
    this.road = new Road();
    this.player = new PlayerCar(this.road);
    this.traffic = new TrafficManager(this.road);
    this.renderer = new Renderer(this.canvas);
    this.audio = window.audioEngine;

    // Game Session Stats
    this.score = 0;
    this.timeLeft = 60.0;
    this.stage = 1;
    this.maxSpeedAchieved = 0;
    this.totalOvertakes = 0;
    this.highScore = parseInt(localStorage.getItem('turbo_racer_highscore') || '0', 10);

    // Timing
    this.lastTime = 0;

    // Inputs
    this.input = {
      gas: false,
      brake: false,
      left: false,
      right: false,
      nitro: false
    };

    // DOM UI elements
    this.initDOMElements();
    this.bindEvents();
    this.traffic.reset();

    // Start Animation Loop
    requestAnimationFrame((t) => this.loop(t));
  }

  initDOMElements() {
    this.ui = {
      hud: document.getElementById('hud'),
      scoreVal: document.getElementById('hud-score-val'),
      timerVal: document.getElementById('hud-timer-val'),
      timerPanel: document.querySelector('.hud-timer'),
      stageVal: document.getElementById('hud-stage-val'),
      speedVal: document.getElementById('hud-speed-val'),
      tachBarFill: document.getElementById('tach-bar-fill'),
      nitroBarFill: document.getElementById('nitro-bar-fill'),
      progressMarker: document.getElementById('player-progress-marker'),
      nitroFlash: document.getElementById('nitro-flash'),
      crashFlash: document.getElementById('crash-flash'),

      screenStart: document.getElementById('screen-start'),
      screenPause: document.getElementById('screen-pause'),
      screenGameOver: document.getElementById('screen-gameover'),
      touchControls: document.getElementById('touch-controls'),

      finalScore: document.getElementById('final-score-val'),
      finalSpeed: document.getElementById('final-speed-val'),
      finalDist: document.getElementById('final-dist-val'),
      finalOvertake: document.getElementById('final-overtake-val'),
      highScoreVal: document.getElementById('high-score-val'),

      btnSound: document.getElementById('btn-sound-toggle'),
      btnTheme: document.getElementById('btn-theme-toggle'),
      btnPause: document.getElementById('btn-pause-toggle')
    };

    // Check if touch device
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      this.ui.touchControls.classList.remove('hidden');
    }
  }

  bindEvents() {
    // Keyboard controls
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));

    // Car Selection in Start Menu
    const carCards = document.querySelectorAll('.car-card');
    carCards.forEach((card) => {
      card.addEventListener('click', () => {
        carCards.forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        const carType = card.dataset.car;
        this.player.setPreset(carType);
      });
    });

    // Start Button
    document.getElementById('btn-start-game').addEventListener('click', () => {
      this.startGame();
    });

    // Pause / Resume Buttons
    document.getElementById('btn-resume').addEventListener('click', () => {
      this.togglePause();
    });
    document.getElementById('btn-restart-from-pause').addEventListener('click', () => {
      this.startGame();
    });
    document.getElementById('btn-play-again').addEventListener('click', () => {
      this.startGame();
    });

    // Top HUD icon buttons
    this.ui.btnSound.addEventListener('click', () => {
      const isMuted = !this.audio.toggleMute();
      this.ui.btnSound.textContent = isMuted ? '🔇' : '🔊';
    });

    this.ui.btnTheme.addEventListener('click', () => {
      this.road.cycleTheme();
    });

    this.ui.btnPause.addEventListener('click', () => {
      this.togglePause();
    });

    // Mobile Touch controls
    this.bindTouchButton('touch-left', 'left');
    this.bindTouchButton('touch-right', 'right');
    this.bindTouchButton('touch-gas', 'gas');
    this.bindTouchButton('touch-brake', 'brake');
    this.bindTouchButton('touch-nitro', 'nitro');
  }

  bindTouchButton(id, action) {
    const btn = document.getElementById(id);
    if (!btn) return;

    const activate = (e) => {
      e.preventDefault();
      this.input[action] = true;
    };
    const deactivate = (e) => {
      e.preventDefault();
      this.input[action] = false;
    };

    btn.addEventListener('touchstart', activate, { passive: false });
    btn.addEventListener('touchend', deactivate, { passive: false });
    btn.addEventListener('touchcancel', deactivate, { passive: false });
    btn.addEventListener('mousedown', activate);
    btn.addEventListener('mouseup', deactivate);
    btn.addEventListener('mouseleave', deactivate);
  }

  handleKeyDown(e) {
    if (this.state === STATE.MENU && (e.code === 'Enter' || e.code === 'Space')) {
      this.startGame();
      return;
    }

    if (e.code === 'KeyP' || e.code === 'Escape') {
      this.togglePause();
      return;
    }

    if (e.code === 'KeyM') {
      const isMuted = !this.audio.toggleMute();
      this.ui.btnSound.textContent = isMuted ? '🔇' : '🔊';
      return;
    }

    if (e.code === 'KeyT') {
      this.road.cycleTheme();
      return;
    }

    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.input.gas = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.input.brake = true;
        this.canvas.dataset.braking = 'true';
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.input.left = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.input.right = true;
        break;
      case 'Space':
      case 'ShiftLeft':
      case 'ShiftRight':
        this.input.nitro = true;
        break;
    }
  }

  handleKeyUp(e) {
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.input.gas = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.input.brake = false;
        this.canvas.dataset.braking = 'false';
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.input.left = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.input.right = false;
        break;
      case 'Space':
      case 'ShiftLeft':
      case 'ShiftRight':
        this.input.nitro = false;
        break;
    }
  }

  startGame() {
    this.audio.ensureRunning();
    this.audio.startMusic();

    this.state = STATE.RACING;
    this.score = 0;
    this.timeLeft = 60.0;
    this.stage = 1;
    this.totalOvertakes = 0;
    this.maxSpeedAchieved = 0;

    this.player.reset();
    this.traffic.reset();

    this.ui.screenStart.classList.remove('active');
    this.ui.screenPause.classList.remove('active');
    this.ui.screenGameOver.classList.remove('active');
    this.ui.hud.classList.remove('hidden');

    this.lastTime = performance.now();
  }

  togglePause() {
    if (this.state === STATE.RACING) {
      this.state = STATE.PAUSED;
      this.audio.stopMusic();
      this.ui.screenPause.classList.add('active');
    } else if (this.state === STATE.PAUSED) {
      this.state = STATE.RACING;
      this.audio.startMusic();
      this.ui.screenPause.classList.remove('active');
      this.lastTime = performance.now();
    }
  }

  gameOver() {
    this.state = STATE.GAMEOVER;
    this.audio.stopAll();

    // Check High Score
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('turbo_racer_highscore', this.highScore.toString());
    }

    // Populate Game Over stats
    this.ui.finalScore.textContent = this.score.toLocaleString();
    this.ui.finalSpeed.textContent = `${this.maxSpeedAchieved} KM/H`;
    this.ui.finalDist.textContent = `${(this.player.z / 1000).toFixed(1)} KM`;
    this.ui.finalOvertake.textContent = this.totalOvertakes.toString();
    this.ui.highScoreVal.textContent = this.highScore.toLocaleString();

    this.ui.hud.classList.add('hidden');
    this.ui.screenGameOver.classList.add('active');
  }

  loop(currentTime) {
    if (!this.lastTime) this.lastTime = currentTime;
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1); // clamp delta
    this.lastTime = currentTime;

    if (this.state === STATE.RACING) {
      this.update(dt);
    }

    // Always render so world is visible during pause or title
    this.renderer.render(this.road, this.player, this.traffic);

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    // 1. Countdown timer
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.gameOver();
      return;
    }

    // 2. Update Player
    const prevZ = this.player.z;
    const wasBoosting = this.player.isBoosting;
    this.player.update(dt, this.input);

    if (!wasBoosting && this.player.isBoosting) {
      this.audio.playNitroBoost();
    }

    // 3. Track max speed
    const currentSpeedKmh = this.player.getSpeedKmh();
    if (currentSpeedKmh > this.maxSpeedAchieved) {
      this.maxSpeedAchieved = currentSpeedKmh;
    }

    // 4. Update AI Traffic & Handle Collisions & Overtakes
    this.traffic.update(
      dt,
      this.player,
      (overtakeBonus, isNearMiss) => {
        this.totalOvertakes++;
        this.score += overtakeBonus;
        // Nitro reward for daring overtakes
        this.player.nitro = Math.min(100, this.player.nitro + (isNearMiss ? 12 : 5));
      },
      (crashedCar) => {
        this.audio.playCrash();
        this.flashScreen(this.ui.crashFlash, 300);
      }
    );

    // 5. Check Checkpoints
    const currentSeg = this.road.findSegment(this.player.z);
    if (currentSeg.isCheckpoint && prevZ < this.player.z) {
      const prevSeg = this.road.findSegment(prevZ);
      if (prevSeg.index !== currentSeg.index) {
        // Passed checkpoint!
        this.stage++;
        this.timeLeft += 20.0; // Bonus time
        this.score += 2500;
        this.audio.playCheckpoint();
      }
    }

    // 6. Natural Score accumulation by distance
    if (this.player.speed > 0) {
      this.score += Math.floor((this.player.speed / 1000) * 1.5);
    }

    // 7. Update Audio Synthesizers
    this.audio.updateEngine(
      this.player.speed / this.player.maxSpeed,
      this.input.gas,
      this.player.isBoosting
    );
    this.audio.setScreech(this.player.isDrifting ? 0.9 : 0.0);

    // 8. Update HUD DOM
    this.updateHUD(currentSpeedKmh);
  }

  updateHUD(speedKmh) {
    this.ui.scoreVal.textContent = this.score.toString().padStart(6, '0');
    this.ui.timerVal.textContent = this.timeLeft.toFixed(1);
    this.ui.stageVal.textContent = this.stage.toString();
    this.ui.speedVal.textContent = speedKmh.toString();

    // Urgency pulse when time is running out (< 10s)
    if (this.timeLeft <= 10.0) {
      this.ui.timerPanel.classList.add('urgent');
    } else {
      this.ui.timerPanel.classList.remove('urgent');
    }

    // Tachometer bar fill (RPM 0 - 8500)
    const rpmPercent = Math.min(100, (this.player.rpm / 8500) * 100);
    this.ui.tachBarFill.style.width = `${rpmPercent}%`;

    // Nitro bar fill
    this.ui.nitroBarFill.style.width = `${this.player.nitro}%`;

    // Nitro visual flash
    if (this.player.isBoosting) {
      this.ui.nitroFlash.classList.add('active');
    } else {
      this.ui.nitroFlash.classList.remove('active');
    }

    // Progress bar marker
    const progressPercent = (this.player.z / this.road.trackLength) * 100;
    this.ui.progressMarker.style.left = `${Math.min(100, Math.max(0, progressPercent))}%`;
  }

  flashScreen(element, durationMs) {
    element.classList.add('active');
    setTimeout(() => {
      element.classList.remove('active');
    }, durationMs);
  }
}

// Bootstrap game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});

/**
 * Player Car Physics & Telemetry Model
 */

const CAR_PRESETS = {
  ferrari: {
    name: 'Veloce Red',
    color: '#ff1a40',
    accentColor: '#ffffff',
    spoilerColor: '#111111',
    maxSpeed: 12000,       // ~290 km/h display
    accel: 3800,
    handling: 3.2,
    nitroMult: 1.35
  },
  cyber: {
    name: 'Neon Cyber',
    color: '#00f0ff',
    accentColor: '#ff2a85',
    spoilerColor: '#0a0a14',
    maxSpeed: 11600,       // ~280 km/h display
    accel: 4200,
    handling: 4.2,         // sharper drift & steering
    nitroMult: 1.3
  },
  thunder: {
    name: 'Thunder GT',
    color: '#ffe600',
    accentColor: '#1a1a1a',
    spoilerColor: '#ff6e27',
    maxSpeed: 12500,       // ~305 km/h display
    accel: 3500,
    handling: 2.8,
    nitroMult: 1.5          // massive nitro kick
  }
};

class PlayerCar {
  constructor(road) {
    this.road = road;
    this.presetKey = 'ferrari';
    this.preset = CAR_PRESETS[this.presetKey];

    // Position & orientation
    this.x = 0;             // -1 to 1 (road width boundaries)
    this.z = 0;             // distance down track
    this.speed = 0;         // current speed
    this.maxSpeed = this.preset.maxSpeed;
    this.accel = this.preset.accel;
    this.breaking = -9000;
    this.decel = -2400;     // natural coasting friction
    this.offRoadDecel = -8500;
    this.offRoadLimit = 0.95;

    // Nitro
    this.nitro = 100;       // percent (0-100)
    this.maxNitro = 100;
    this.isBoosting = false;
    this.nitroDepletionRate = 35; // % per second
    this.nitroRechargeRate = 8;   // % per second when not boosting

    // Dynamics
    this.steer = 0;
    this.steerTilt = 0;
    this.isDrifting = false;
    this.rpm = 0;
    this.centrifugal = 0.3;

    // Crash recovery
    this.crashCooldown = 0;

    // Visual exhaust flame particles
    this.particles = [];
  }

  setPreset(key) {
    if (CAR_PRESETS[key]) {
      this.presetKey = key;
      this.preset = CAR_PRESETS[key];
      this.maxSpeed = this.preset.maxSpeed;
      this.accel = this.preset.accel;
    }
  }

  reset() {
    this.x = 0;
    this.z = 0;
    this.speed = 0;
    this.steer = 0;
    this.steerTilt = 0;
    this.nitro = 100;
    this.isBoosting = false;
    this.crashCooldown = 0;
    this.particles = [];
  }

  update(dt, input) {
    const currentSegment = this.road.findSegment(this.z);
    const speedRatio = this.speed / this.maxSpeed;

    // Handle Crash Stun
    if (this.crashCooldown > 0) {
      this.crashCooldown -= dt;
      this.speed = Math.max(0, this.speed - 12000 * dt);
      this.isBoosting = false;
      this.steerTilt = Math.sin(this.crashCooldown * 30) * 0.4;
      this.z += this.speed * dt;
      if (this.z >= this.road.trackLength) this.z -= this.road.trackLength;
      return;
    }

    // Nitro Boost Activation
    const wantBoost = input.nitro && this.nitro > 5 && this.speed > 2000;
    if (wantBoost) {
      this.isBoosting = true;
      this.nitro = Math.max(0, this.nitro - this.nitroDepletionRate * dt);
    } else {
      this.isBoosting = false;
      this.nitro = Math.min(this.maxNitro, this.nitro + this.nitroRechargeRate * dt);
    }

    // Calculate maximum speed with boost multiplier
    const effectiveMaxSpeed = this.isBoosting 
      ? this.maxSpeed * this.preset.nitroMult 
      : this.maxSpeed;

    // Acceleration & Braking
    if (input.gas) {
      const boostAccel = this.isBoosting ? this.accel * 1.8 : this.accel;
      this.speed += boostAccel * dt;
    } else if (input.brake) {
      this.speed += this.breaking * dt;
    } else {
      this.speed += this.decel * dt;
    }

    // Off-road Penalty (driving in the grass/dirt)
    const isOffRoad = (this.x < -this.offRoadLimit || this.x > this.offRoadLimit);
    if (isOffRoad && this.speed > (this.maxSpeed * 0.28)) {
      this.speed += this.offRoadDecel * dt;
    }

    // Clamp speed
    this.speed = Math.max(0, Math.min(this.speed, effectiveMaxSpeed));

    // Steering & Lateral Movement
    let targetSteer = 0;
    if (input.left) targetSteer -= 1;
    if (input.right) targetSteer += 1;

    // Smooth steer response proportional to speed
    this.steer += (targetSteer - this.steer) * 12 * dt;
    this.steerTilt += (targetSteer - this.steerTilt) * 10 * dt;

    if (this.speed > 0) {
      const steerPower = this.preset.handling * (this.speed / this.maxSpeed);
      this.x += this.steer * steerPower * dt;

      // Centrifugal force pushing player outward on curves
      const curveForce = currentSegment.curve * this.centrifugal * (this.speed / this.maxSpeed);
      this.x -= curveForce * dt;
    }

    // Detect Drift
    this.isDrifting = (Math.abs(this.steer) > 0.6 && this.speed > 6000) || (Math.abs(currentSegment.curve) > 3 && this.speed > 7500);

    // Update Z distance along track
    this.z += this.speed * dt;
    if (this.z >= this.road.trackLength) {
      this.z -= this.road.trackLength;
    }

    // RPM for display & sound
    const gearFraction = (this.speed % (this.maxSpeed / 5)) / (this.maxSpeed / 5);
    this.rpm = Math.min(8500, 1000 + (this.speed / this.maxSpeed) * 5500 + gearFraction * 2000);

    // Nitro flame particles spawn
    if (this.isBoosting && this.speed > 4000) {
      for (let i = 0; i < 3; i++) {
        this.particles.push({
          x: this.x + (Math.random() - 0.5) * 0.1,
          y: (Math.random() - 0.5) * 10,
          life: 0.25,
          maxLife: 0.25,
          color: Math.random() > 0.5 ? '#00f0ff' : '#ff2a85'
        });
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].life -= dt;
      if (this.particles[i].life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  triggerCrash() {
    this.crashCooldown = 1.2; // 1.2s spin & deceleration
    this.speed = Math.min(this.speed, 2000);
  }

  getSpeedKmh() {
    // Convert game speed to realistic display KM/H
    return Math.floor((this.speed / this.maxSpeed) * 295);
  }
}

window.PlayerCar = PlayerCar;
window.CAR_PRESETS = CAR_PRESETS;

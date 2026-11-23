/**
 * AI Traffic Vehicles & Overtake System
 */

const TRAFFIC_MODELS = [
  { type: 'sports', color: '#ffcc00', width: 220, length: 300, speed: 7000 },
  { type: 'sedan',  color: '#3498db', width: 210, length: 290, speed: 5800 },
  { type: 'coupe',  color: '#9b59b6', width: 210, length: 280, speed: 6400 },
  { type: 'truck',  color: '#e74c3c', width: 260, length: 480, speed: 4500 },
  { type: 'police', color: '#ffffff', width: 220, length: 300, speed: 7500 }
];

class TrafficManager {
  constructor(road) {
    this.road = road;
    this.cars = [];
    this.totalCars = 28;
    this.overtakeScore = 200;
  }

  reset() {
    this.cars = [];
    const lanes = [-0.65, -0.2, 0.2, 0.65];

    for (let i = 0; i < this.totalCars; i++) {
      const model = TRAFFIC_MODELS[Math.floor(Math.random() * TRAFFIC_MODELS.length)];
      const lane = lanes[Math.floor(Math.random() * lanes.length)];
      // Spread them evenly along the track, leaving the starting grid clear
      const z = 1200 + (i * (this.road.trackLength / this.totalCars)) + (Math.random() * 500);

      this.cars.push({
        id: i,
        model: model,
        x: lane,
        z: z % this.road.trackLength,
        speed: model.speed * (0.85 + Math.random() * 0.3),
        targetLane: lane,
        laneTimer: Math.random() * 8,
        overtaken: false
      });
    }
  }

  update(dt, player, onOvertake, onCrash) {
    const playerSegment = this.road.findSegment(player.z);

    // Clear cars from road segments
    for (let s = 0; s < this.road.segments.length; s++) {
      this.road.segments[s].cars = [];
    }

    for (let i = 0; i < this.cars.length; i++) {
      const car = this.cars[i];

      // Move AI car along track
      car.z += car.speed * dt;
      if (car.z >= this.road.trackLength) {
        car.z -= this.road.trackLength;
        car.overtaken = false;
      }

      // Occasional gentle lane changes for realism
      car.laneTimer -= dt;
      if (car.laneTimer <= 0) {
        car.laneTimer = 5 + Math.random() * 10;
        const lanes = [-0.65, -0.2, 0.2, 0.65];
        car.targetLane = lanes[Math.floor(Math.random() * lanes.length)];
      }

      // Smooth lane transition
      if (car.x !== car.targetLane) {
        const dir = Math.sign(car.targetLane - car.x);
        car.x += dir * 0.4 * dt;
        if (Math.abs(car.x - car.targetLane) < 0.05) {
          car.x = car.targetLane;
        }
      }

      // Attach car to corresponding road segment for depth rendering
      const seg = this.road.findSegment(car.z);
      seg.cars.push(car);

      // Check Collision with player
      const dz = Math.abs(player.z - car.z);
      const isZOverlap = (dz < 220) || (Math.abs(player.z - (car.z - this.road.trackLength)) < 220);

      if (isZOverlap && player.crashCooldown <= 0) {
        const dx = Math.abs(player.x - car.x);
        // Collision threshold in normalized road units (approx car width)
        if (dx < 0.28) {
          onCrash(car);
          player.triggerCrash();
        }
      }

      // Check Overtake (player passes car from behind at higher speed)
      if (!car.overtaken && player.z > car.z && (player.z - car.z) < 500 && player.speed > car.speed) {
        car.overtaken = true;
        // Near-miss bonus if passing very close!
        const dx = Math.abs(player.x - car.x);
        const bonus = (dx < 0.45) ? 350 : 150;
        onOvertake(bonus, dx < 0.45);
      }
    }
  }
}

window.TrafficManager = TrafficManager;
window.TRAFFIC_MODELS = TRAFFIC_MODELS;

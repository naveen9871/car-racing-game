/**
 * Canvas 2D Pseudo-3D Projection & Retro Graphics Renderer
 */

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 1024;
    this.height = 768;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Camera parameters
    this.cameraHeight = 1000;  // Eye height above ground
    this.cameraDepth = 0.84;   // Field of view / lens focal length
    this.skyOffset = 0;
    this.mountainsOffset = 0;

    // Resize handler
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.ctx.imageSmoothingEnabled = false;
  }

  project(p, cameraX, cameraY, cameraZ, roadWidth) {
    p.camera.x = (p.world.x || 0) - cameraX;
    p.camera.y = (p.world.y || 0) - cameraY;
    p.camera.z = (p.world.z || 0) - cameraZ;

    p.screen.scale = this.cameraDepth / p.camera.z;
    p.screen.x = Math.round((this.width / 2) + (p.screen.scale * p.camera.x * this.width / 2));
    p.screen.y = Math.round((this.height / 2) - (p.screen.scale * p.camera.y * this.height / 2));
    p.screen.w = Math.round(p.screen.scale * roadWidth * this.width / 2);
  }

  render(road, player, traffic) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const baseSegment = road.findSegment(player.z);
    const basePercent = (player.z % road.segmentLength) / road.segmentLength;
    const playerSegment = road.findSegment(player.z + (this.cameraHeight * this.cameraDepth));
    const playerPercent = ((player.z + (this.cameraHeight * this.cameraDepth)) % road.segmentLength) / road.segmentLength;

    const cameraY = this.cameraHeight + (baseSegment.p1.world.y + (baseSegment.p2.world.y - baseSegment.p1.world.y) * basePercent);
    const cameraX = player.x * road.roadWidth;

    // Parallax background scrolling
    const curveVelocity = playerSegment.curve * (player.speed / player.maxSpeed);
    this.skyOffset += curveVelocity * 0.001;
    this.mountainsOffset += curveVelocity * 0.003;

    // 1. Render Sky, Sun & Horizon Parallax
    this.renderSkyAndHorizon(road.theme);

    // 2. Render Road Segments (Back-to-Front depth clipping)
    let maxY = this.height; // Depth clipping horizon mask
    const segmentsToDraw = [];

    for (let n = 0; n < road.drawDistance; n++) {
      const segmentIndex = (baseSegment.index + n) % road.segments.length;
      const segment = road.segments[segmentIndex];
      const looped = segment.index < baseSegment.index;

      this.project(
        segment.p1,
        cameraX,
        cameraY,
        player.z - (looped ? road.trackLength : 0),
        road.roadWidth
      );
      this.project(
        segment.p2,
        cameraX,
        cameraY,
        player.z - (looped ? road.trackLength : 0),
        road.roadWidth
      );

      // Cull segments behind camera or beyond clip height
      if (segment.p1.camera.z <= this.cameraDepth || segment.p2.screen.y >= maxY || segment.p2.screen.y >= segment.p1.screen.y) {
        continue;
      }

      this.renderSegment(ctx, segment);
      maxY = segment.p1.screen.y;

      // Keep for sprite/car pass
      segmentsToDraw.push(segment);
    }

    // 3. Render Roadside Sprites and Traffic Cars (Back-to-Front)
    for (let n = segmentsToDraw.length - 1; n >= 0; n--) {
      const seg = segmentsToDraw[n];

      // Draw Checkpoint Arch
      if (seg.isCheckpoint) {
        this.renderCheckpointArch(ctx, seg);
      }

      // Draw Roadside Scenery (Trees, Signs, Lamps)
      for (let i = 0; i < seg.sprites.length; i++) {
        const sprite = seg.sprites[i];
        this.renderRoadsideSprite(ctx, seg, sprite);
      }

      // Draw Traffic Cars at this segment
      for (let i = 0; i < seg.cars.length; i++) {
        const car = seg.cars[i];
        this.renderTrafficCar(ctx, seg, car);
      }
    }

    // 4. Render Player Car (Suspension bounce, steering roll, exhaust flames)
    this.renderPlayerCar(ctx, player, baseSegment);

    // 5. Render Speed / Nitro Streaks
    if (player.speed > (player.maxSpeed * 0.8) || player.isBoosting) {
      this.renderSpeedLines(ctx, player);
    }
  }

  renderSkyAndHorizon(theme) {
    const ctx = this.ctx;
    const horizonY = this.height * 0.45;

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    theme.skyGradient.forEach((c, idx) => {
      skyGrad.addColorStop(idx / (theme.skyGradient.length - 1), c);
    });
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, horizonY);

    // Synthwave Retro Sun with horizontal stripes
    const sunRadius = Math.min(this.width, this.height) * 0.16;
    const sunX = this.width * 0.5 - (this.skyOffset * 100 % this.width);
    const sunY = horizonY - sunRadius * 0.4;

    ctx.save();
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    const sunGrad = ctx.createLinearGradient(sunX, sunY - sunRadius, sunX, sunY + sunRadius);
    sunGrad.addColorStop(0, theme.sunColor);
    sunGrad.addColorStop(1, theme.sunGlow);
    ctx.fillStyle = sunGrad;
    ctx.shadowColor = theme.sunGlow;
    ctx.shadowBlur = 40;
    ctx.fill();

    // Horizontal cutout lines across lower half of sun
    ctx.fillStyle = theme.skyGradient[theme.skyGradient.length - 2] || '#120826';
    const lines = 7;
    for (let i = 0; i < lines; i++) {
      const lineY = sunY + (i / lines) * (sunRadius * 0.85);
      const lineHeight = 2 + (i * 1.5);
      ctx.fillRect(sunX - sunRadius, lineY, sunRadius * 2, lineHeight);
    }
    ctx.restore();

    // Distant mountain silhouette / cityscape
    ctx.save();
    ctx.fillStyle = theme.mountains;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    const mountainStep = 60;
    const offset = (this.mountainsOffset * 200) % (mountainStep * 2);
    for (let x = -mountainStep * 2; x <= this.width + mountainStep * 2; x += mountainStep) {
      const peakHeight = 25 + Math.sin(x * 0.02) * 20 + Math.cos(x * 0.05) * 15;
      ctx.lineTo(x - offset, horizonY - peakHeight);
    }
    ctx.lineTo(this.width, horizonY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  renderSegment(ctx, segment) {
    const x1 = segment.p1.screen.x;
    const y1 = segment.p1.screen.y;
    const w1 = segment.p1.screen.w;
    const x2 = segment.p2.screen.x;
    const y2 = segment.p2.screen.y;
    const w2 = segment.p2.screen.w;

    const r1 = w1 / 6; // rumble width
    const r2 = w2 / 6;
    const l1 = w1 / 32; // lane mark width
    const l2 = w2 / 32;

    // 1. Grass
    ctx.fillStyle = segment.color.grass;
    ctx.fillRect(0, y2, this.width, y1 - y2);

    // 2. Rumble strips (curbs)
    this.drawPolygon(ctx, x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, segment.color.rumble);
    this.drawPolygon(ctx, x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, segment.color.rumble);

    // 3. Road surface
    this.drawPolygon(ctx, x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, segment.color.road);

    // 4. Lane markings
    if (segment.color.lane && segment.color.lane !== 'transparent') {
      const lanes = 3;
      const laneW1 = (w1 * 2) / lanes;
      const laneW2 = (w2 * 2) / lanes;
      for (let lane = 1; lane < lanes; lane++) {
        const laneX1 = x1 - w1 + (laneW1 * lane);
        const laneX2 = x2 - w2 + (laneW2 * lane);
        this.drawPolygon(ctx, laneX1 - l1 / 2, y1, laneX1 + l1 / 2, y1, laneX2 + l2 / 2, y2, laneX2 - l2 / 2, y2, segment.color.lane);
      }
    }
  }

  drawPolygon(ctx, x1, y1, x2, y2, x3, y3, x4, y4, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
  }

  renderRoadsideSprite(ctx, seg, sprite) {
    const scale = seg.p1.screen.scale;
    const spriteX = seg.p1.screen.x + (scale * sprite.offset * this.width / 2);
    const spriteY = seg.p1.screen.y;

    if (sprite.type === 'palm') {
      const w = 260 * scale * (this.width / 1024);
      const h = 420 * scale * (this.height / 768);
      this.drawPalmTree(ctx, spriteX, spriteY, w, h);
    } else if (sprite.type === 'billboard') {
      const w = 320 * scale * (this.width / 1024);
      const h = 220 * scale * (this.height / 768);
      this.drawBillboard(ctx, spriteX, spriteY, w, h);
    } else if (sprite.type === 'lamppost') {
      const w = 120 * scale * (this.width / 1024);
      const h = 380 * scale * (this.height / 768);
      this.drawLamppost(ctx, spriteX, spriteY, w, h, sprite.offset < 0);
    }
  }

  drawPalmTree(ctx, x, y, w, h) {
    ctx.save();
    // Curved trunk
    ctx.strokeStyle = '#2d1808';
    ctx.lineWidth = Math.max(3, w * 0.1);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + w * 0.2, y - h * 0.5, x + w * 0.1, y - h);
    ctx.stroke();

    // Neon tropical leaves
    const topX = x + w * 0.1;
    const topY = y - h;
    const fronds = 6;
    for (let f = 0; f < fronds; f++) {
      const angle = (f / fronds) * Math.PI + Math.PI;
      const fx = topX + Math.cos(angle) * w * 0.6;
      const fy = topY + Math.sin(angle) * h * 0.25 + 10;

      ctx.strokeStyle = (f % 2 === 0) ? '#00f0ff' : '#00ff88';
      ctx.lineWidth = Math.max(2, w * 0.08);
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(topX + Math.cos(angle) * w * 0.3, topY - 15, fx, fy);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawBillboard(ctx, x, y, w, h) {
    ctx.save();
    // Legs
    ctx.strokeStyle = '#333';
    ctx.lineWidth = Math.max(2, w * 0.04);
    ctx.strokeRect(x - w * 0.4, y - h * 0.4, w * 0.8, h * 0.4);

    // Neon Signboard
    ctx.fillStyle = '#0f081e';
    ctx.strokeStyle = '#ff2a85';
    ctx.lineWidth = Math.max(2, w * 0.05);
    ctx.fillRect(x - w * 0.5, y - h, w, h * 0.6);
    ctx.strokeRect(x - w * 0.5, y - h, w, h * 0.6);

    // Neon Text
    ctx.fillStyle = '#ffe600';
    ctx.font = `bold ${Math.max(10, Math.floor(h * 0.25))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff2a85';
    ctx.shadowBlur = 10;
    ctx.fillText('TURBO 80s', x, y - h * 0.7);
    ctx.restore();
  }

  drawLamppost(ctx, x, y, w, h, isLeft) {
    ctx.save();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = Math.max(2, w * 0.08);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - h);
    const armX = isLeft ? x + w * 0.8 : x - w * 0.8;
    ctx.lineTo(armX, y - h);
    ctx.stroke();

    // Glowing Lamp Bulb
    ctx.beginPath();
    ctx.arc(armX, y - h + 5, Math.max(4, w * 0.15), 0, Math.PI * 2);
    ctx.fillStyle = '#ffe600';
    ctx.shadowColor = '#ffe600';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.restore();
  }

  renderCheckpointArch(ctx, seg) {
    const scale = seg.p1.screen.scale;
    const x = seg.p1.screen.x;
    const y = seg.p1.screen.y;
    const w = seg.p1.screen.w * 1.35;
    const h = 260 * scale * (this.height / 768);

    ctx.save();
    // Pillars
    ctx.fillStyle = '#ff2a85';
    ctx.fillRect(x - w, y - h, w * 0.1, h);
    ctx.fillRect(x + w * 0.9, y - h, w * 0.1, h);

    // Banner arch
    ctx.fillStyle = '#0c0818';
    ctx.fillRect(x - w, y - h, w * 2, h * 0.35);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = Math.max(2, w * 0.02);
    ctx.strokeRect(x - w, y - h, w * 2, h * 0.35);

    // Text
    ctx.fillStyle = '#ffe600';
    ctx.font = `900 ${Math.max(12, Math.floor(h * 0.22))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ffe600';
    ctx.shadowBlur = 15;
    ctx.fillText('⚡ CHECKPOINT ⚡', x, y - h * 0.82);
    ctx.restore();
  }

  renderTrafficCar(ctx, seg, car) {
    const scale = seg.p1.screen.scale;
    const x = seg.p1.screen.x + (scale * car.x * this.width / 2);
    const y = seg.p1.screen.y;
    const w = car.model.width * scale * (this.width / 1024);
    const h = (car.model.length * 0.5) * scale * (this.height / 768);

    if (w < 4 || h < 2) return;

    ctx.save();
    // Car Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, w * 0.6, h * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chassis body
    ctx.fillStyle = car.model.color;
    ctx.fillRect(x - w / 2, y - h, w, h * 0.8);

    // Rear Windshield
    ctx.fillStyle = '#111827';
    ctx.fillRect(x - w * 0.4, y - h * 0.95, w * 0.8, h * 0.3);

    // Glowing Taillights
    ctx.fillStyle = '#ff1c43';
    ctx.shadowColor = '#ff1c43';
    ctx.shadowBlur = 12;
    ctx.fillRect(x - w * 0.45, y - h * 0.5, w * 0.25, h * 0.25);
    ctx.fillRect(x + w * 0.2, y - h * 0.5, w * 0.25, h * 0.25);

    // Bumper
    ctx.fillStyle = '#1e1e24';
    ctx.shadowBlur = 0;
    ctx.fillRect(x - w * 0.48, y - h * 0.25, w * 0.96, h * 0.25);

    // Tires
    ctx.fillStyle = '#000000';
    ctx.fillRect(x - w * 0.5, y - h * 0.25, w * 0.15, h * 0.3);
    ctx.fillRect(x + w * 0.35, y - h * 0.25, w * 0.15, h * 0.3);

    ctx.restore();
  }

  renderPlayerCar(ctx, player, baseSegment) {
    const carW = 160;
    const carH = 80;
    const x = this.width / 2;
    // Suspension bounce based on engine RPM and hills
    const bounce = Math.sin(Date.now() * 0.02) * (player.speed > 500 ? 2.5 : 0.8);
    const y = this.height - 45 + bounce;

    ctx.save();
    ctx.translate(x, y);

    // Roll / tilt during steering
    ctx.rotate(player.steerTilt * 0.08);

    // 1. Contact Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 5, carW * 0.55, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Wide Rear Wheels
    ctx.fillStyle = '#111';
    ctx.fillRect(-carW * 0.52, -18, 22, 28);
    ctx.fillRect(carW * 0.52 - 22, -18, 22, 28);

    // 3. Lower Aerodynamic Diffuser
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(-carW * 0.45, -12, carW * 0.9, 14);

    // 4. Exhaust pipes & Nitro flames
    const exhaustL = -carW * 0.32;
    const exhaustR = carW * 0.32;

    ctx.fillStyle = '#333';
    ctx.fillRect(exhaustL - 6, -6, 12, 8);
    ctx.fillRect(exhaustR - 6, -6, 12, 8);

    if (player.isBoosting) {
      // Twin high-energy blue/magenta nitro jet plumes
      this.drawExhaustFlame(ctx, exhaustL, 2);
      this.drawExhaustFlame(ctx, exhaustR, 2);
    }

    // 5. Main Car Body Chassis
    const bodyGrad = ctx.createLinearGradient(0, -carH, 0, 0);
    bodyGrad.addColorStop(0, player.preset.color);
    bodyGrad.addColorStop(1, '#660015');
    ctx.fillStyle = bodyGrad;

    ctx.beginPath();
    ctx.moveTo(-carW * 0.48, -12);
    ctx.lineTo(-carW * 0.42, -carH * 0.45);
    ctx.lineTo(-carW * 0.3, -carH * 0.85);
    ctx.lineTo(carW * 0.3, -carH * 0.85);
    ctx.lineTo(carW * 0.42, -carH * 0.45);
    ctx.lineTo(carW * 0.48, -12);
    ctx.closePath();
    ctx.fill();

    // 6. Cockpit & Rear Slanted Window
    ctx.fillStyle = '#090812';
    ctx.beginPath();
    ctx.moveTo(-carW * 0.28, -carH * 0.82);
    ctx.lineTo(-carW * 0.24, -carH * 0.42);
    ctx.lineTo(carW * 0.24, -carH * 0.42);
    ctx.lineTo(carW * 0.28, -carH * 0.82);
    ctx.closePath();
    ctx.fill();

    // Window reflection streak
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-carW * 0.15, -carH * 0.8);
    ctx.lineTo(carW * 0.05, -carH * 0.45);
    ctx.stroke();

    // 7. Iconic Rear Spoiler
    ctx.fillStyle = player.preset.spoilerColor || '#111';
    ctx.fillRect(-carW * 0.48, -carH * 0.65, carW * 0.96, 7);
    ctx.fillRect(-carW * 0.35, -carH * 0.65, 8, 16);
    ctx.fillRect(carW * 0.35 - 8, -carH * 0.65, 8, 16);

    // 8. Cyber Taillights (Neon glow strip across rear)
    const isBraking = player.speed > 0 && ctx.canvas.dataset.braking === 'true';
    ctx.fillStyle = isBraking ? '#ff0033' : '#ff2a85';
    ctx.shadowColor = isBraking ? '#ff0033' : '#ff2a85';
    ctx.shadowBlur = isBraking ? 25 : 15;
    ctx.fillRect(-carW * 0.44, -carH * 0.38, carW * 0.88, 8);
    ctx.shadowBlur = 0;

    // 9. License plate
    ctx.fillStyle = '#ffe600';
    ctx.fillRect(-18, -14, 36, 12);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('OUTRUN', 0, -5);

    ctx.restore();
  }

  drawExhaustFlame(ctx, x, y) {
    const flameH = 20 + Math.random() * 25;
    const flameW = 8 + Math.random() * 4;

    ctx.save();
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(x - flameW / 2, y);
    ctx.lineTo(x + flameW / 2, y);
    ctx.lineTo(x, y + flameH);
    ctx.closePath();
    ctx.fill();

    // Inner bright core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x - flameW * 0.25, y);
    ctx.lineTo(x + flameW * 0.25, y);
    ctx.lineTo(x, y + flameH * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  renderSpeedLines(ctx, player) {
    ctx.save();
    const count = player.isBoosting ? 22 : 10;
    ctx.strokeStyle = player.isBoosting ? 'rgba(0, 240, 255, 0.45)' : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = player.isBoosting ? 2.5 : 1.5;

    for (let i = 0; i < count; i++) {
      const angle = (Math.random() - 0.5) * 1.4;
      const len = 80 + Math.random() * 140;
      const startX = (Math.random() > 0.5 ? 0 : this.width) + (Math.random() * 40 - 20);
      const startY = Math.random() * this.height;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX - Math.sin(angle) * len, startY + Math.cos(angle) * len);
      ctx.stroke();
    }
    ctx.restore();
  }
}

window.Renderer = Renderer;

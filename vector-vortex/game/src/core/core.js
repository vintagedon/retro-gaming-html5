import { Mulberry32 } from './rng.js';
import { CONSTANTS, DIRECTOR_BANDS } from './constants.js';

/**
 * Pure deterministic simulation core for Vector Vortex.
 *
 * Coordinates:
 * - Lane indices: 0..23, clockwise. Left decrements with wrap, right increments with wrap.
 * - Normalized depth: 0 at player rim, 1 at far vortex center.
 * - Shots spawn at depth 0, move toward 1 (+0.025 / tick).
 * - Crawlers spawn at depth 1, move toward 0 (-0.0015 / tick).
 */
export class VectorVortexCore {
  /**
   * @param {Object} [options]
   * @param {number} [options.seed=0]
   */
  constructor(options = {}) {
    this.seed = options.seed ?? 0;
    this.rng = new Mulberry32(this.seed);

    this.playerLane = 0;
    this.lives = CONSTANTS.STARTING_LIVES;
    this.score = 0;
    this.elapsedTicks = 0;
    this.status = 'active'; // 'active' | 'survived' | 'lost'

    this.shots = [];
    this.enemies = [];

    this.nextEntityId = 1;
    this.shotsSpawned = 0;
    this.shotsHit = 0;
    this.kills = 0;

    this.fireCooldownTimer = 0;
    this.damageGraceTimer = 0;
    this.spawnTimer = 0;

    this.events = [];
  }

  /**
   * Get the current spawn interval based on elapsedTicks.
   * @returns {number}
   */
  getCurrentSpawnInterval() {
    for (const band of DIRECTOR_BANDS) {
      if (this.elapsedTicks >= band.startTick && this.elapsedTicks <= band.endTick) {
        return band.interval;
      }
    }
    return 27; // fallback
  }

  /**
   * Advances the simulation by exactly one tick (1/60s).
   *
   * Authoritative order:
   * 1. Drain input
   * 2. Advance shots
   * 3. Advance enemies
   * 4. Resolve shot-enemy collisions
   * 5. Resolve rim breaches and life loss
   * 6. Update director and spawn
   * 7. Advance elapsed ticks
   * 8. Resolve 300-second (18000 ticks) boundary and outcomes
   * 9. Emit semantic events
   * 10. Publish serializable snapshot
   *
   * @param {Object} [input]
   * @param {boolean} [input.left=false]
   * @param {boolean} [input.right=false]
   * @param {boolean} [input.fire=false]
   * @returns {Object} snapshot
   */
  step(input = {}) {
    this.events = [];

    if (this.status !== 'active') {
      return this.getSnapshot();
    }

    const inLeft = Boolean(input.left);
    const inRight = Boolean(input.right);
    const inFire = Boolean(input.fire);

    // 1. Drain input (Movement)
    if (inLeft && !inRight) {
      this.playerLane = (this.playerLane - 1 + CONSTANTS.LANE_COUNT) % CONSTANTS.LANE_COUNT;
    } else if (inRight && !inLeft) {
      this.playerLane = (this.playerLane + 1) % CONSTANTS.LANE_COUNT;
    }

    // Handle Fire input & Cooldown
    if (this.fireCooldownTimer > 0) {
      this.fireCooldownTimer--;
    }

    if (inFire && this.fireCooldownTimer === 0) {
      if (this.shots.length < CONSTANTS.MAX_ACTIVE_SHOTS) {
        const shotId = this.nextEntityId++;
        const shot = {
          id: shotId,
          lane: this.playerLane,
          depth: CONSTANTS.DEPTH_RIM,
          prevDepth: CONSTANTS.DEPTH_RIM,
        };
        this.shots.push(shot);
        this.shotsSpawned++;
        this.fireCooldownTimer = CONSTANTS.FIRE_COOLDOWN_TICKS;
        this.events.push({ type: 'shot-fired', id: shotId, lane: this.playerLane });
      }
    }

    // 2. Advance shots
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const shot = this.shots[i];
      shot.prevDepth = shot.depth;
      shot.depth += CONSTANTS.SHOT_SPEED;
      // Remove shots that reached or passed far depth (1)
      if (shot.depth >= CONSTANTS.DEPTH_FAR) {
        this.shots.splice(i, 1);
      }
    }

    // 3. Advance enemies
    for (const enemy of this.enemies) {
      enemy.prevDepth = enemy.depth;
      enemy.depth -= CONSTANTS.CRAWLER_SPEED;
    }

    // 4. Resolve shot-enemy collisions
    // Swept collision: same lane, overlapping [min(prev, next), max(prev, next)] intervals
    // Candidate ordering: ascending stable enemy ID.
    // Shot is consumed by first resolved hit.
    const sortedEnemies = [...this.enemies].sort((a, b) => a.id - b.id);
    const deadEnemyIds = new Set();
    const consumedShotIds = new Set();

    for (const shot of this.shots) {
      if (consumedShotIds.has(shot.id)) continue;

      const shotMin = Math.min(shot.prevDepth, shot.depth);
      const shotMax = Math.max(shot.prevDepth, shot.depth);

      for (const enemy of sortedEnemies) {
        if (deadEnemyIds.has(enemy.id)) continue;
        if (enemy.lane !== shot.lane) continue;

        const enemyMin = Math.min(enemy.prevDepth, enemy.depth);
        const enemyMax = Math.max(enemy.prevDepth, enemy.depth);

        // Check swept interval overlap
        if (shotMax >= enemyMin && shotMin <= enemyMax) {
          // Hit!
          deadEnemyIds.add(enemy.id);
          consumedShotIds.add(shot.id);
          this.shotsHit++;
          this.kills++;
          this.score += CONSTANTS.CRAWLER_SCORE;
          this.events.push({
            type: 'enemy-destroyed',
            id: enemy.id,
            lane: enemy.lane,
            score: CONSTANTS.CRAWLER_SCORE,
          });
          break; // Shot consumed by first resolved hit
        }
      }
    }

    // Clean up consumed shots
    if (consumedShotIds.size > 0) {
      this.shots = this.shots.filter(s => !consumedShotIds.has(s.id));
    }

    // Clean up dead enemies (destroyed enemies cannot breach later in the same tick)
    if (deadEnemyIds.size > 0) {
      this.enemies = this.enemies.filter(e => !deadEnemyIds.has(e.id));
    }

    // 5. Resolve rim breaches and life loss
    if (this.damageGraceTimer > 0) {
      this.damageGraceTimer--;
    }

    const breachers = this.enemies
      .filter(e => e.depth <= CONSTANTS.DEPTH_RIM)
      .sort((a, b) => a.id - b.id);

    if (breachers.length > 0) {
      // All breaching enemies are removed
      const breacherIds = new Set(breachers.map(e => e.id));
      this.enemies = this.enemies.filter(e => !breacherIds.has(e.id));

      if (this.damageGraceTimer === 0) {
        // First eligible breach removes one life and starts 30 ticks grace
        this.lives--;
        this.damageGraceTimer = CONSTANTS.DAMAGE_GRACE_TICKS;
        this.events.push({
          type: 'life-lost',
          remainingLives: this.lives,
          triggerEnemyId: breachers[0].id,
        });

        if (this.lives <= 0) {
          this.status = 'lost';
          this.events.push({
            type: 'run-ended',
            outcome: 'lost',
            finalScore: this.score,
          });
        }
      }
    }

    // 6. Update director and spawn (only while active)
    if (this.status === 'active') {
      const currentBand = DIRECTOR_BANDS.find(
        b => this.elapsedTicks >= b.startTick && this.elapsedTicks <= b.endTick
      );

      if (currentBand) {
        const ticksIntoBand = this.elapsedTicks - currentBand.startTick;
        if (ticksIntoBand > 0 && ticksIntoBand % currentBand.interval === 0) {
          // Spawn crawler
          const spawnLane = this.rng.nextInt(0, CONSTANTS.LANE_COUNT - 1);
          const enemyId = this.nextEntityId++;
          const enemy = {
            id: enemyId,
            type: 'crawler',
            lane: spawnLane,
            depth: CONSTANTS.DEPTH_FAR,
            prevDepth: CONSTANTS.DEPTH_FAR,
            hp: CONSTANTS.CRAWLER_HP,
          };
          this.enemies.push(enemy);
          this.events.push({
            type: 'enemy-spawned',
            id: enemyId,
            lane: spawnLane,
          });
        }
      }
    }

    // 7. Advance elapsed ticks
    this.elapsedTicks++;

    // 8. Resolve 300-second boundary (18,000 ticks: indices 0..17,999) and outcomes
    if (this.elapsedTicks >= CONSTANTS.RUN_LENGTH_TICKS && this.status === 'active') {
      this.status = 'survived';
      const accuracyBonus = this.shotsSpawned > 0
        ? Math.round(CONSTANTS.ACCURACY_BONUS_MAX * (this.shotsHit / this.shotsSpawned))
        : 0;
      this.score += CONSTANTS.SURVIVAL_BONUS + accuracyBonus;
      this.events.push({
        type: 'run-ended',
        outcome: 'survived',
        finalScore: this.score,
        accuracyBonus,
        survivalBonus: CONSTANTS.SURVIVAL_BONUS,
      });
    }

    return this.getSnapshot();
  }

  /**
   * Returns a serializable read-only snapshot of current game state.
   * @returns {Object}
   */
  getSnapshot() {
    const accuracyPercent = this.shotsSpawned > 0
      ? Math.round((this.shotsHit / this.shotsSpawned) * 100)
      : null;

    return {
      playerLane: this.playerLane,
      lives: this.lives,
      score: this.score,
      elapsedTicks: this.elapsedTicks,
      status: this.status,
      shotsSpawned: this.shotsSpawned,
      shotsHit: this.shotsHit,
      kills: this.kills,
      accuracyPercent,
      accuracyText: accuracyPercent !== null ? `${accuracyPercent}%` : 'ACC --',
      damageGraceTimer: this.damageGraceTimer,
      shots: this.shots.map(s => ({ ...s })),
      enemies: this.enemies.map(e => ({ ...e })),
      events: [...this.events],
    };
  }

  /**
   * Produces a deterministic string digest representing current state.
   * @returns {string}
   */
  getDigest() {
    const s = this.serialize();
    return JSON.stringify(s);
  }

  /**
   * Serializes core state to a plain object.
   * @returns {Object}
   */
  serialize() {
    return {
      seed: this.seed,
      rngState: this.rng.getState(),
      playerLane: this.playerLane,
      lives: this.lives,
      score: this.score,
      elapsedTicks: this.elapsedTicks,
      status: this.status,
      nextEntityId: this.nextEntityId,
      shotsSpawned: this.shotsSpawned,
      shotsHit: this.shotsHit,
      kills: this.kills,
      fireCooldownTimer: this.fireCooldownTimer,
      damageGraceTimer: this.damageGraceTimer,
      shots: this.shots.map(s => ({ ...s })),
      enemies: this.enemies.map(e => ({ ...e })),
    };
  }

  /**
   * Restores a core instance from serialized state.
   * @param {Object} data
   * @returns {VectorVortexCore}
   */
  static deserialize(data) {
    const core = new VectorVortexCore({ seed: data.seed });
    core.rng.setState(data.rngState);
    core.playerLane = data.playerLane;
    core.lives = data.lives;
    core.score = data.score;
    core.elapsedTicks = data.elapsedTicks;
    core.status = data.status;
    core.nextEntityId = data.nextEntityId;
    core.shotsSpawned = data.shotsSpawned;
    core.shotsHit = data.shotsHit;
    core.kills = data.kills;
    core.fireCooldownTimer = data.fireCooldownTimer;
    core.damageGraceTimer = data.damageGraceTimer;
    core.shots = data.shots.map(s => ({ ...s }));
    core.enemies = data.enemies.map(e => ({ ...e }));
    return core;
  }
}

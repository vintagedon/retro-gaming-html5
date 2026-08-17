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
   * 2. Resolve 300-second (18000 ticks) boundary
   * 3. Advance shots
   * 4. Advance enemies
   * 5. Resolve shot-enemy collisions
   * 6. Resolve rim breaches and life loss
   * 7. Update director and spawn
   * 8. Advance elapsed ticks
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

    // 2. Resolve 300-second boundary (18000 ticks)
    if (this.elapsedTicks >= CONSTANTS.RUN_LENGTH_TICKS) {
      if (this.lives > 0) {
        this.status = 'survived';
        // Calculate survival cash-out
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
        return this.getSnapshot();
      }
    }

    // 3. Advance shots
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const shot = this.shots[i];
      shot.prevDepth = shot.depth;
      shot.depth += CONSTANTS.SHOT_SPEED;
      // Remove shots that reached or passed far depth (1)
      if (shot.depth >= CONSTANTS.DEPTH_FAR) {
        this.shots.splice(i, 1);
      }
    }

    // 4. Advance enemies
    for (const enemy of this.enemies) {
      enemy.prevDepth = enemy.depth;
      enemy.depth -= CONSTANTS.CRAWLER_SPEED;
    }

    // 5. Resolve shot-enemy collisions
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

    // 6. Resolve rim breaches and life loss
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

    // If game ended due to loss, return snapshot
    if (this.status !== 'active') {
      return this.getSnapshot();
    }

    // 7. Update director and spawn
    // Spawning interval check: first spawn is one full interval after band begins
    // Let's implement spawnTimer logic according to director bands.
    // Spec: "with the first spawn one full interval after the band begins"
    // Intervals:
    // 0:00-0:59.999 (0-3599): 60 ticks. First spawn at tick 60, then 120, 180...
    // 1:00-2:59.999 (3600-10799): 48 ticks. Band begins at 3600. First spawn at 3600+48=3648, then +48...
    // 3:00-3:59.999 (10800-14399): 36 ticks. Band begins at 10800. First spawn at 10800+36=10836...
    // 4:00-4:59.999 (14400-17999): 27 ticks. Band begins at 14400. First spawn at 14400+27=14427...
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

    // 8. Advance elapsed ticks
    this.elapsedTicks++;

    // Check again if we just reached 18000 ticks at end of tick
    // Note: Spec says check 300s boundary before movement or breach. Reaching it with at least 1 life produces survived.
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

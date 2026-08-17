import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VectorVortexCore } from '../../game/src/core/core.js';
import { CONSTANTS, DIRECTOR_BANDS } from '../../game/src/core/constants.js';

describe('Deliverable 2 - Director, Collision, Scoring, Lives, and Outcomes', () => {
  it('swept-collision hits a same-lane Crawler crossed within one tick and misses an adjacent-lane or non-overlapping Crawler', () => {
    const core = new VectorVortexCore({ seed: 1 });

    // Setup:
    // Shot at depth 0.4 moving to 0.425
    // Crawler 1 in same lane (0) at depth 0.415 moving to 0.4135 -> Swept intervals overlap: [0.4, 0.425] and [0.4135, 0.415]
    // Crawler 2 in lane 1 at depth 0.415
    // Crawler 3 in lane 0 at depth 0.6 moving to 0.5985 -> Non-overlapping swept intervals: [0.4, 0.425] and [0.5985, 0.6]
    core.shots = [
      { id: 10, lane: 0, depth: 0.40, prevDepth: 0.375 },
    ];
    core.enemies = [
      { id: 1, lane: 0, depth: 0.415, prevDepth: 0.4165, hp: 1 },
      { id: 2, lane: 1, depth: 0.415, prevDepth: 0.4165, hp: 1 },
      { id: 3, lane: 0, depth: 0.600, prevDepth: 0.6015, hp: 1 },
    ];
    core.shotsSpawned = 1;

    // Advance 1 tick
    core.step({});

    // Crawler 1 should be destroyed (hit!)
    // Crawler 2 (lane 1) and Crawler 3 (depth 0.6) should remain alive
    assert.equal(core.enemies.length, 2);
    assert.equal(core.enemies.some(e => e.id === 1), false);
    assert.equal(core.enemies.some(e => e.id === 2), true);
    assert.equal(core.enemies.some(e => e.id === 3), true);

    // Shot 10 should be consumed
    assert.equal(core.shots.length, 0);
    assert.equal(core.kills, 1);
    assert.equal(core.score, 100);
  });

  it('proves point sampling would fail the collision test if shot jumps past crawler in single tick', () => {
    // If a shot moves from 0.40 to 0.425, and enemy moves from 0.420 to 0.4185,
    // At start: shot 0.40 < enemy 0.420
    // At end: shot 0.425 > enemy 0.4185
    // They cross each other, but point-sampling after movement checks shot.depth (0.425) == enemy.depth (0.4185), which would miss without swept interval!
    const core = new VectorVortexCore({ seed: 1 });
    core.shots = [{ id: 1, lane: 5, depth: 0.40, prevDepth: 0.375 }];
    core.enemies = [{ id: 2, lane: 5, depth: 0.42, prevDepth: 0.4215, hp: 1 }];
    core.shotsSpawned = 1;

    core.step({});
    assert.equal(core.enemies.length, 0, 'Swept collision must detect crossed entities');
    assert.equal(core.kills, 1);
  });

  it('simultaneous-candidate fixture resolves hits by ascending stable enemy ID and consumes shot on first hit', () => {
    const core = new VectorVortexCore({ seed: 1 });
    // Shot in lane 0
    core.shots = [{ id: 100, lane: 0, depth: 0.50, prevDepth: 0.475 }];
    // Two enemies in lane 0 within same swept window, IDs 25 and 12
    core.enemies = [
      { id: 25, lane: 0, depth: 0.51, prevDepth: 0.5115, hp: 1 },
      { id: 12, lane: 0, depth: 0.51, prevDepth: 0.5115, hp: 1 },
    ];
    core.shotsSpawned = 1;

    core.step({});

    // Shot should hit enemy ID 12 first (ascending ID order: 12 < 25)
    // Enemy 12 dies, Enemy 25 survives, shot is consumed
    assert.equal(core.enemies.length, 1);
    assert.equal(core.enemies[0].id, 25);
    assert.equal(core.shots.length, 0);
    assert.equal(core.kills, 1);
  });

  it('asserts exact spawn interval at every director band boundary and reproduces same lane sequence for fixed seed', () => {
    // Band 1: 0:00 - 0:59.999 (0-3599), interval 60
    // First spawn is after 60 ticks (when elapsedTicks reaches 60 at end of tick)
    const core1 = new VectorVortexCore({ seed: 777 });
    for (let t = 0; t < 59; t++) {
      core1.step({});
    }
    assert.equal(core1.enemies.length, 0, 'No spawn before 60 ticks completed');
    core1.step({}); // 60th step (elapsedTicks was 59 during step, becomes 60)
    // Wait, let's check: at start of 60th step, elapsedTicks is 59.
    // 60th step completes: elapsedTicks becomes 60.
    // Next step (61st step): at start of step, elapsedTicks is 60. 60 - 0 = 60, 60 % 60 === 0 -> Spawns!
    assert.equal(core1.elapsedTicks, 60);
    core1.step({}); // 61st step, spawn happens!
    assert.equal(core1.enemies.length, 1, 'Spawn after 60 ticks completed');
    const firstSpawnLane = core1.enemies[0].lane;

    // Independent core with same seed produces identical first spawn lane
    const core2 = new VectorVortexCore({ seed: 777 });
    for (let t = 0; t < 61; t++) core2.step({});
    assert.equal(core2.enemies[0].lane, firstSpawnLane);

    // Test Band 2 boundary: 3600 (1:00) with interval 48.
    // Set elapsedTicks to 3600 (band starts)
    core1.elapsedTicks = 3600;
    core1.enemies = [];
    core1.step({}); // tick 3600 (band starts, ticksIntoBand = 0, no spawn)
    assert.equal(core1.enemies.length, 0, 'No immediate spawn on band start tick 3600');

    for (let t = 0; t < 47; t++) {
      core1.step({});
    }
    assert.equal(core1.enemies.length, 0, 'No spawn before full interval 48 in band 2');
    core1.step({}); // tick 3648 (ticksIntoBand = 48)
    assert.equal(core1.enemies.length, 1, 'Spawn at 3648 (3600 + 48)');

    // Test Band 3 boundary: 10800 (3:00) with interval 36
    core1.elapsedTicks = 10800;
    core1.enemies = [];
    core1.step({}); // tick 10800
    assert.equal(core1.enemies.length, 0);
    for (let t = 0; t < 35; t++) {
      core1.step({});
    }
    assert.equal(core1.enemies.length, 0);
    core1.step({}); // 10836
    assert.equal(core1.enemies.length, 1, 'Spawn at 10836 (10800 + 36)');

    // Test Band 4 boundary: 14400 (4:00) with interval 27
    core1.elapsedTicks = 14400;
    core1.enemies = [];
    core1.step({}); // tick 14400
    assert.equal(core1.enemies.length, 0);
    for (let t = 0; t < 26; t++) {
      core1.step({});
    }
    assert.equal(core1.enemies.length, 0);
    core1.step({}); // 14427
    assert.equal(core1.enemies.length, 1, 'Spawn at 14427 (14400 + 27)');
  });

  it('pins damage-grace boundary: breach on the tick grace timer reaches 0 costs a life, and breach on immediately preceding tick costs none', () => {
    // Intended immunity window:
    // Initial breach at tick 0 sets damageGraceTimer = 30 ticks.
    // In each subsequent tick step:
    // - Tick 1 (step 1 after hit): timer decrements 30 -> 29 (in grace, immune)
    // - ...
    // - Tick 29 (step 29 after hit): timer decrements 2 -> 1 (in grace, immune)
    // - Tick 30 (step 30 after hit): timer decrements 1 -> 0 (eligible for damage again once timer reaches 0)
    // The immediately preceding tick is tick 29 (timer is 2 before step, becomes 1).
    // The tick where grace timer reaches 0 is tick 30 (timer is 1 before step, becomes 0).

    // Case A: Breach on immediately preceding tick (tick 29 after initial breach)
    const corePreceding = new VectorVortexCore({ seed: 1 });
    assert.equal(corePreceding.lives, 3);

    // Initial breach at tick 0: lives -> 2, grace -> 30
    corePreceding.enemies = [{ id: 1, lane: 0, depth: 0.001, prevDepth: 0.0025, hp: 1 }];
    corePreceding.step({});
    assert.equal(corePreceding.lives, 2);
    assert.equal(corePreceding.damageGraceTimer, 30);

    // Step 28 ticks with no breaches (ticks 1..28)
    for (let t = 0; t < 28; t++) {
      corePreceding.enemies = [];
      corePreceding.step({});
    }
    assert.equal(corePreceding.damageGraceTimer, 2);

    // Inject breach at tick 29 (immediately preceding tick before timer reaches 0)
    corePreceding.enemies = [{ id: 2, lane: 0, depth: 0.001, prevDepth: 0.0025, hp: 1 }];
    corePreceding.step({});
    assert.equal(corePreceding.lives, 2, 'Breach on immediately preceding tick within 30-tick grace window must cost no life');
    assert.equal(corePreceding.damageGraceTimer, 1);

    // Case B: Breach on the tick where grace timer reaches 0 (tick 30 after initial breach)
    const coreExpired = new VectorVortexCore({ seed: 1 });
    assert.equal(coreExpired.lives, 3);

    // Initial breach at tick 0: lives -> 2, grace -> 30
    coreExpired.enemies = [{ id: 1, lane: 0, depth: 0.001, prevDepth: 0.0025, hp: 1 }];
    coreExpired.step({});
    assert.equal(coreExpired.lives, 2);

    // Step 29 ticks with no breaches (ticks 1..29)
    for (let t = 0; t < 29; t++) {
      coreExpired.enemies = [];
      coreExpired.step({});
    }
    assert.equal(coreExpired.damageGraceTimer, 1);

    // Inject breach at tick 30 (timer decrements from 1 to 0, so grace reaches 0 and breach is lethal)
    coreExpired.enemies = [{ id: 3, lane: 0, depth: 0.001, prevDepth: 0.0025, hp: 1 }];
    coreExpired.step({});
    assert.equal(coreExpired.lives, 1, 'Breach on the tick where grace timer reaches zero must cost 1 life');
    assert.equal(coreExpired.damageGraceTimer, 30, 'New breach restarts 30-tick damage grace window');
  });

  it('calculates accuracy percentage accurately, ignores blocked fire requests, and formats ACC -- when 0 shots spawned', () => {
    const core = new VectorVortexCore({ seed: 1 });
    assert.equal(core.getSnapshot().accuracyText, 'ACC --');

    // Fire 10 shots and hit 7
    core.shotsSpawned = 10;
    core.shotsHit = 7;
    assert.equal(core.getSnapshot().accuracyPercent, 70);
    assert.equal(core.getSnapshot().accuracyText, '70%');

    // Fire blocked by cooldown should not increment shotsSpawned
    core.fireCooldownTimer = 5;
    core.step({ fire: true });
    assert.equal(core.shotsSpawned, 10);
  });

  it('advances through real tick path to final tick (17,999) with 1 life and breach on tick 17,999 asserting lost outcome (real-play test)', () => {
    // Stepping to tick 17,999 (the 18,000th tick, indices 0..17,999)
    const core = new VectorVortexCore({ seed: 1 });
    core.lives = 1;
    core.damageGraceTimer = 0;

    // Fast step 17,999 ticks (0..17,998) without letting spawns breach
    for (let t = 0; t < 17999; t++) {
      core.enemies = []; // clear spawns before they crawl to rim
      core.step({});
    }
    assert.equal(core.elapsedTicks, 17999);
    assert.equal(core.status, 'active');
    assert.equal(core.lives, 1);

    // Inject enemy positioned to breach on tick 17,999 (final tick)
    core.enemies = [{ id: 999, lane: 0, depth: 0.001, prevDepth: 0.0025, hp: 1 }];

    // Step the 18,000th tick (tick index 17,999)
    core.step({});

    assert.equal(core.elapsedTicks, 18000);
    assert.equal(core.lives, 0);
    assert.equal(core.status, 'lost');

    // Mutation note: evaluating survival before breach resolution on the final tick
    // would improperly yield 'survived' instead of 'lost'.
  });

  it('advances through real tick path to final tick (17,999) with surviving life asserting survived outcome and correct bonus calculation', () => {
    const core = new VectorVortexCore({ seed: 1 });
    core.lives = 2;
    core.score = 300; // 3 kills
    core.shotsSpawned = 10;
    core.shotsHit = 8; // 80% accuracy -> bonus = round(2000 * 8 / 10) = 1600

    // Step 18,000 ticks (0..17,999) with no breaches
    for (let t = 0; t < 18000; t++) {
      core.enemies = []; // keep clear of breach
      core.step({});
    }

    assert.equal(core.elapsedTicks, 18000);
    assert.equal(core.status, 'survived');
    assert.equal(core.lives, 2);
    // Score: 300 (kills) + 5000 (survival bonus) + 1600 (accuracy bonus) = 6900
    assert.equal(core.score, 6900);
  });

  it('final score equals kill points + 5,000 + rounded accuracy bonus on survival with no hidden multipliers', () => {
    const core = new VectorVortexCore({ seed: 1 });
    core.score = 700; // 7 kills * 100
    core.shotsSpawned = 10;
    core.shotsHit = 7; // 70% accuracy -> bonus = round(2000 * 7 / 10) = 1400
    core.elapsedTicks = 17999;
    core.lives = 2;

    core.step({});

    assert.equal(core.status, 'survived');
    // Expected final score: 700 + 5000 (survival) + 1400 (accuracy) = 7100
    assert.equal(core.score, 7100);
  });
});

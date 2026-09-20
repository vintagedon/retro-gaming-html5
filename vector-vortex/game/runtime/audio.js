// Vector Vortex game audio adapter (Spec 02 deliverable 3, extended in
// Spec 03 gate 3). Synthesizes bounded UI and combat cues after the first
// deliberate gesture, and loops the one shipped music track. One
// AudioContext, one gain bus: volume scales the bus, mute silences it.
// Audio callbacks and time never advance shell or core state: this module
// receives no reference to either, and nothing schedules game work from a
// cue. Active node counts are bounded; finished nodes disconnect.

const MAX_ACTIVE_CUES = 12;

// Each cue is a short note list: { f0, f1, type, at, dur, gain }. Total
// envelope per note is bounded well under a quarter second.
const CUES = {
  activate: [{ f0: 660, f1: 660, type: 'square', at: 0, dur: 0.06, gain: 0.18 }],
  confirm: [
    { f0: 520, f1: 520, type: 'square', at: 0, dur: 0.07, gain: 0.16 },
    { f0: 780, f1: 780, type: 'square', at: 0.08, dur: 0.09, gain: 0.16 }
  ],
  cancel: [
    { f0: 520, f1: 520, type: 'square', at: 0, dur: 0.07, gain: 0.16 },
    { f0: 330, f1: 330, type: 'square', at: 0.08, dur: 0.1, gain: 0.16 }
  ],
  toggle: [{ f0: 880, f1: 880, type: 'sine', at: 0, dur: 0.05, gain: 0.14 }],
  pause: [{ f0: 520, f1: 300, type: 'triangle', at: 0, dur: 0.12, gain: 0.18 }],
  resume: [{ f0: 300, f1: 520, type: 'triangle', at: 0, dur: 0.12, gain: 0.18 }],
  transition: [{ f0: 440, f1: 880, type: 'sine', at: 0, dur: 0.16, gain: 0.14 }],
  // Combat cues (Spec 03): fire, hit, destruction.
  fire: [{ f0: 980, f1: 420, type: 'square', at: 0, dur: 0.07, gain: 0.12 }],
  hit: [{ f0: 240, f1: 90, type: 'sawtooth', at: 0, dur: 0.14, gain: 0.16 }],
  destroyed: [{ f0: 180, f1: 40, type: 'sawtooth', at: 0, dur: 0.22, gain: 0.18 }]
};

export function createUiAudio({ musicUrl } = {}) {
  let ctx = null;
  let bus = null;
  let musicGain = null;
  let musicBuffer = null;
  let musicLoading = false;
  let musicSource = null;
  let musicWanted = false;
  let unlocked = false;
  let muted = false;
  let volume = 80;
  const active = new Set();

  function ensureContext() {
    if (ctx) return;
    ctx = new AudioContext();
    bus = ctx.createGain();
    bus.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.5;
    musicGain.connect(bus);
    applyBus();
  }

  function applyBus() {
    if (bus) bus.gain.value = muted ? 0 : volume / 100;
  }

  // Deliberate-gesture gate: the first call creates or resumes the
  // context. Before it, play() is a no-op.
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    ensureContext();
    if (ctx.state === 'suspended') ctx.resume();
    loadMusic();
    if (musicWanted) startMusic();
  }

  // The one shipped music loop (game/assets, attribution in
  // game/assets/ATTRIBUTION.md). Loading is passive: a failure leaves the
  // game silent and never touches shell or core state.
  function loadMusic() {
    if (!musicUrl || musicBuffer || musicLoading || typeof fetch !== 'function') return;
    musicLoading = true;
    fetch(musicUrl)
      .then(res => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(`music ${res.status}`))))
      .then(buf => {
        ensureContext();
        return ctx.decodeAudioData(buf);
      })
      .then(decoded => {
        musicBuffer = decoded;
        if (musicWanted) startMusic();
      })
      .catch(() => {
        musicBuffer = null;
      })
      .finally(() => {
        musicLoading = false;
      });
  }

  function startMusic() {
    musicWanted = true;
    if (!unlocked || !musicBuffer || musicSource) return;
    ensureContext();
    const source = ctx.createBufferSource();
    source.buffer = musicBuffer;
    source.loop = true;
    source.connect(musicGain);
    source.onended = () => {
      if (musicSource === source) musicSource = null;
    };
    musicSource = source;
    source.start();
  }

  function stopMusic() {
    musicWanted = false;
    if (musicSource) {
      const source = musicSource;
      musicSource = null;
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
    }
  }

  function play(name) {
    if (!unlocked || muted) return;
    const cue = CUES[name];
    if (!cue) return;
    if (active.size >= MAX_ACTIVE_CUES) return;
    ensureContext();
    const now = ctx.currentTime;
    for (const note of cue) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = note.type;
      osc.frequency.setValueAtTime(note.f0, now + note.at);
      if (note.f1 !== note.f0) {
        osc.frequency.setValueAtTime(note.f1, now + note.at + note.dur);
      }
      env.gain.setValueAtTime(0.0001, now + note.at);
      env.gain.exponentialRampToValueAtTime(note.gain, now + note.at + 0.008);
      env.gain.exponentialRampToValueAtTime(0.0001, now + note.at + note.dur);
      osc.connect(env);
      env.connect(bus);
      const entry = { osc, env };
      active.add(entry);
      osc.onended = () => {
        active.delete(entry);
        env.disconnect();
        osc.disconnect();
      };
      osc.start(now + note.at);
      osc.stop(now + note.at + note.dur + 0.02);
    }
  }

  function setMuted(next) {
    muted = !!next;
    applyBus();
  }

  function setVolume(next) {
    volume = Math.max(0, Math.min(100, Math.round(Number(next) || 0)));
    applyBus();
  }

  function getState() {
    return {
      unlocked,
      muted,
      volume,
      busGain: bus ? bus.gain.value : null,
      activeNodes: active.size,
      contextState: ctx ? ctx.state : null,
      musicLoaded: musicBuffer != null,
      musicPlaying: musicSource != null
    };
  }

  return { unlock, play, setMuted, setVolume, startMusic, stopMusic, getState };
}

// The no-op replacement used by the audio-equivalence validation: same
// surface, no Web Audio work at all.
export function createNoopUiAudio() {
  return {
    unlock() {},
    play() {},
    setMuted() {},
    setVolume() {},
    startMusic() {},
    stopMusic() {},
    getState() {
      return {
        unlocked: false, muted: true, volume: 0, busGain: null, activeNodes: 0,
        contextState: null, musicLoaded: false, musicPlaying: false, noop: true
      };
    }
  };
}

// ---------------------------------------------------------------------------
// Procedural sound effects synthesised with the Web Audio API.
// No audio files are loaded — everything is generated on the fly.
// ---------------------------------------------------------------------------

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  enabled = true;

  /** Must be called from a user gesture to satisfy autoplay policies. */
  init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);

    const len = Math.floor(this.ctx.sampleRate * 2);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noise = buf;
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (this.master)
      this.master.gain.value = on ? 0.55 : 0;
  }

  private now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  private noiseSource() {
    if (!this.ctx || !this.noise) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    return src;
  }

  /** Soft UI click. */
  click() {
    if (!this.enabled || !this.ctx || !this.master) return;
    const t = this.now();
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(520, t);
    o.frequency.exponentialRampToValueAtTime(300, t + 0.05);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.1);
  }

  /** Wooden scrape as a block is dragged out. */
  scrape() {
    if (!this.enabled || !this.ctx || !this.master) return;
    const t = this.now();
    const src = this.noiseSource();
    if (!src) return;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 2.2;
    bp.frequency.setValueAtTime(900, t);
    bp.frequency.linearRampToValueAtTime(1700, t + 0.55);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.14, t + 0.04);
    g.gain.linearRampToValueAtTime(0.1, t + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.72);
  }

  /** Dull wooden thud as a block is placed. */
  thud(pitch = 150) {
    if (!this.enabled || !this.ctx || !this.master) return;
    const t = this.now();
    const o = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(pitch, t);
    o.frequency.exponentialRampToValueAtTime(pitch * 0.55, t + 0.16);
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.45, t + 0.008);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

    const src = this.noiseSource();
    let ng: GainNode | null = null;
    if (src) {
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 700;
      ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.22, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      src.connect(lp).connect(ng).connect(this.master);
      src.start(t);
      src.stop(t + 0.1);
    }
    o.connect(og).connect(this.master);
    o.start(t);
    o.stop(t + 0.24);
  }

  /** Groaning creak while the tower wobbles. intensity 0..1 */
  creak(intensity: number) {
    if (!this.enabled || !this.ctx || !this.master) return;
    if (intensity < 0.05) return;
    const t = this.now();
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 500;
    o.type = "sawtooth";
    const base = 70 + intensity * 60;
    o.frequency.setValueAtTime(base, t);
    o.frequency.linearRampToValueAtTime(base * 1.4, t + 0.3);
    o.frequency.linearRampToValueAtTime(base * 0.9, t + 0.7);
    const vol = 0.05 + intensity * 0.12;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.12);
    g.gain.linearRampToValueAtTime(vol * 0.7, t + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
    o.connect(lp).connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.9);
  }

  /** Heartbeat double-thump for critical tension. */
  heartbeat() {
    if (!this.enabled) return;
    this.thud(95);
    window.setTimeout(() => this.thud(78), 170);
  }

  /** Big chaotic collapse crash. */
  crash() {
    if (!this.enabled || !this.ctx || !this.master) return;
    const t = this.now();
    // rumble
    const src = this.noiseSource();
    if (src) {
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(1400, t);
      lp.frequency.exponentialRampToValueAtTime(220, t + 1.3);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      src.connect(lp).connect(g).connect(this.master);
      src.start(t);
      src.stop(t + 1.45);
    }
    // resonant wooden bangs
    const hits = [0, 0.08, 0.18, 0.32, 0.5, 0.74, 1.0];
    hits.forEach((d, i) => {
      const ht = t + d;
      const o = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      o.type = "sine";
      const f = 90 + Math.random() * 120;
      o.frequency.setValueAtTime(f, ht);
      o.frequency.exponentialRampToValueAtTime(f * 0.4, ht + 0.2);
      const v = 0.4 / (1 + i * 0.5);
      g.gain.setValueAtTime(0.0001, ht);
      g.gain.exponentialRampToValueAtTime(v, ht + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, ht + 0.28);
      o.connect(g).connect(this.master!);
      o.start(ht);
      o.stop(ht + 0.3);
    });
  }
}

export const sound = new SoundEngine();

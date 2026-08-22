// High-Fidelity Web Audio Game Sound Synthesizer Engine
// Designed for clear, realistic, and game-specific acoustic identities

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  // Aviator Engine Nodes
  private engineOsc: OscillatorNode | null = null;
  private engineNoise: AudioBufferSourceNode | null = null;
  private engineGain: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;

  // Roulette Wheel Spin Nodes
  private rouletteWheelNoise: AudioBufferSourceNode | null = null;
  private rouletteWheelGain: GainNode | null = null;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.75, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private getDestination(): AudioNode {
    this.init();
    return this.masterGain || this.ctx!.destination;
  }

  private createNoiseBuffer(duration = 2, type: 'white' | 'pink' | 'brown' = 'white'): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    } else if (type === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    } else if (type === 'brown') {
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // Gain compensation
      }
    }
    return buffer;
  }

  setMute(mute: boolean) {
    this.isMuted = mute;
    if (mute) {
      this.stopEngine();
      this.stopRouletteWheel();
    }
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  // =========================================================================
  // 1. AVIATOR & CRASH SOUND IDENTITY (Aviation, Jets, Rockets, Flight)
  // =========================================================================

  playAviatorTakeoff() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Jet spooling turbine sound
    const osc = this.ctx.createOscillator();
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(1.5, 'pink');

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(4, now);
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(1400, now + 1.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 1.2);

    osc.connect(filter);
    if (noise.buffer) noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.getDestination());

    osc.start(now);
    if (noise.buffer) noise.start(now);
    osc.stop(now + 1.5);
    if (noise.buffer) noise.stop(now + 1.5);
  }

  startEngine(multiplier = 1) {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    if (this.engineOsc) {
      const targetFreq = 45 + (Math.min(multiplier, 30) * 12);
      this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.3);
      if (this.filter) {
        this.filter.frequency.setTargetAtTime(350 + (Math.min(multiplier, 50) * 20), now, 0.3);
      }
      return;
    }

    this.engineOsc = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();
    this.lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    this.filter = this.ctx.createBiquadFilter();

    this.engineNoise = this.ctx.createBufferSource();
    this.engineNoise.buffer = this.createNoiseBuffer(2, 'brown');
    this.engineNoise.loop = true;

    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(50, now);

    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(380, now);

    this.lfo.frequency.setValueAtTime(14, now);
    lfoGain.gain.setValueAtTime(0.35, now);

    this.lfo.connect(lfoGain);
    lfoGain.connect(this.engineGain.gain);

    this.engineOsc.connect(this.filter);
    if (this.engineNoise.buffer) this.engineNoise.connect(this.filter);
    this.filter.connect(this.engineGain);
    this.engineGain.connect(this.getDestination());

    this.engineGain.gain.setValueAtTime(0, now);
    this.engineGain.gain.linearRampToValueAtTime(0.09, now + 0.4);

    this.engineOsc.start(now);
    if (this.engineNoise.buffer) this.engineNoise.start(now);
    this.lfo.start(now);
  }

  stopEngine() {
    if (this.engineGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.engineGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      const osc = this.engineOsc;
      const noise = this.engineNoise;
      const lfo = this.lfo;
      setTimeout(() => {
        try {
          osc?.stop();
          noise?.stop();
          lfo?.stop();
        } catch (e) {}
      }, 250);
    }
    this.engineOsc = null;
    this.engineNoise = null;
    this.engineGain = null;
    this.lfo = null;
    this.filter = null;
  }

  playAviatorFlyAway() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.stopEngine();
    const now = this.ctx.currentTime;

    // Jet engine fly away zoom with doppler shift
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.6);
    osc.frequency.exponentialRampToValueAtTime(120, now + 1.2);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc.connect(gain);
    gain.connect(this.getDestination());
    osc.start(now);
    osc.stop(now + 1.2);
  }

  playAviatorCashout() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Pilot radio telemetry dual-chime
    this.playTone(1174.66, 'sine', 0.08, 0.18); // D6
    setTimeout(() => this.playTone(1760.00, 'sine', 0.15, 0.22), 70); // A6
  }

  // =========================================================================
  // 2. MINES SOUND IDENTITY (Crystal gems, radar scans & real detonation)
  // =========================================================================

  playMinesGem(step = 1) {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Sparkling crystal chime pitching up based on steps
    const baseFreqs = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00];
    const pitch = baseFreqs[Math.min(step - 1, baseFreqs.length - 1)] * (1 + (step > 7 ? (step - 7) * 0.08 : 0));

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(pitch, now);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(pitch * 2, now); // Harmonic sparkle

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.getDestination());

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  }

  playMinesExplosion() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Deep cinematic ground detonation
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(1.4, 'brown');

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, now);
    filter.frequency.exponentialRampToValueAtTime(35, now + 1.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

    // Initial shockwave punch
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(120, now);
    subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.5);
    subGain.gain.setValueAtTime(0.5, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    if (noise.buffer) {
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.getDestination());
      noise.start(now);
      noise.stop(now + 1.3);
    }

    subOsc.connect(subGain);
    subGain.connect(this.getDestination());
    subOsc.start(now);
    subOsc.stop(now + 0.5);
  }

  playMinesCashout() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Diamond treasure cascade
    const chords = [659.25, 830.61, 987.77, 1318.51, 1661.22];
    chords.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'sine', 0.35, 0.15);
      }, idx * 60);
    });
  }

  // =========================================================================
  // 3. PLINKO SOUND IDENTITY (Metallic/wooden pegs, drop and slot landings)
  // =========================================================================

  playPlinkoDrop() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Mechanical ball spring release
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(250, now + 0.08);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.getDestination());
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playPlinkoPeg(row = 0) {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Organic metallic pin collision with micro-pitch shifts
    const pitchOffset = (Math.random() * 80) - 40;
    const baseFreq = 1200 + (row * 60) + pitchOffset;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(this.getDestination());
    osc.start(now);
    osc.stop(now + 0.045);
  }

  playPlinkoBucket(multiplier: number) {
    this.init();
    if (!this.ctx || this.isMuted) return;
    if (multiplier >= 10) {
      // Big outer slot victory bell
      const notes = [783.99, 987.77, 1174.66, 1567.98];
      notes.forEach((f, i) => setTimeout(() => this.playTone(f, 'sine', 0.3, 0.2), i * 70));
    } else if (multiplier >= 2) {
      // Medium slot chime
      this.playTone(659.25, 'sine', 0.15, 0.15);
      setTimeout(() => this.playTone(880, 'sine', 0.25, 0.18), 80);
    } else if (multiplier >= 1) {
      // Soft return bounce
      this.playTone(440, 'triangle', 0.1, 0.12);
    } else {
      // Low pocket hollow tap
      this.playTone(220, 'sine', 0.12, 0.12);
    }
  }

  // =========================================================================
  // 4. DICE SOUND IDENTITY (Match Dice, Cup Shake & Clattering Table Roll)
  // =========================================================================

  playDiceShake() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Rhythmic cup rattle
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.playTone(180 + Math.random() * 60, 'triangle', 0.04, 0.12);
      }, i * 70);
    }
  }

  playDiceRoll() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    // Realistic clattering wooden dice bouncing on a table
    const bounces = [0, 60, 130, 210, 300, 410];
    bounces.forEach((delay, idx) => {
      setTimeout(() => {
        const freq = 320 + (Math.random() * 180) - (idx * 20);
        const vol = 0.2 - (idx * 0.025);
        this.playTone(freq, 'triangle', 0.035, Math.max(vol, 0.04));
      }, delay);
    });
  }

  playDiceWin() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Golden dice high fanfare
    const chord = [587.33, 739.99, 880.00, 1174.66]; // D Major
    chord.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.3, 0.18), idx * 80);
    });
  }

  playDiceLoss() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Dull hollow wooden roll thud
    this.playTone(160, 'triangle', 0.2, 0.18);
    setTimeout(() => this.playTone(110, 'sine', 0.25, 0.15), 90);
  }

  // =========================================================================
  // 5. ROULETTE SOUND IDENTITY (Wheel spin, ball clicking in frets & pocket drop)
  // =========================================================================

  playRouletteSpin() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Heavy polished mahogany wheel spin whir
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(5, 'pink');

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(150, now + 4.8);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 4.8);

    if (noise.buffer) {
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.getDestination());
      noise.start(now);
      noise.stop(now + 4.8);
      this.rouletteWheelNoise = noise;
      this.rouletteWheelGain = gain;
    }
  }

  stopRouletteWheel() {
    if (this.rouletteWheelNoise) {
      try { this.rouletteWheelNoise.stop(); } catch (e) {}
      this.rouletteWheelNoise = null;
    }
  }

  playRouletteBallClick() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Crisp ivory ball clicking against a metal fret
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400 + Math.random() * 300, now);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    osc.connect(gain);
    gain.connect(this.getDestination());
    osc.start(now);
    osc.stop(now + 0.02);
  }

  playRoulettePocketDrop() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Ball rattling into numbered pocket
    const drops = [0, 40, 90, 160];
    drops.forEach((d, i) => {
      setTimeout(() => {
        this.playTone(1800 - (i * 200), 'sine', 0.03, 0.14 - (i * 0.02));
      }, d);
    });
  }

  playRouletteWin() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // European Casino Bell and chip stack
    this.playTone(1046.50, 'sine', 0.4, 0.25);
    setTimeout(() => this.playTone(1318.51, 'sine', 0.4, 0.22), 120);
    setTimeout(() => this.playTone(1567.98, 'sine', 0.5, 0.22), 240);
  }

  // =========================================================================
  // 6. COIN FLIP SOUND IDENTITY (Metallic coin toss ring, slap and streak chime)
  // =========================================================================

  playCoinToss() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // High metallic coin flick whistle (shiiiing!)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2800, now);
    osc.frequency.exponentialRampToValueAtTime(3800, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(3200, now + 0.8);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.connect(gain);
    gain.connect(this.getDestination());
    osc.start(now);
    osc.stop(now + 0.8);
  }

  playCoinCatch() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Palm slap with metallic ring
    this.playTone(240, 'triangle', 0.06, 0.2);
    this.playTone(2200, 'sine', 0.15, 0.12);
  }

  playCoinStreak(streak = 1) {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Ascending streak synth with increasing triumph
    const baseFreq = 523.25 * Math.pow(1.12, Math.min(streak, 10));
    this.playTone(baseFreq, 'sine', 0.25, 0.2);
    setTimeout(() => this.playTone(baseFreq * 1.5, 'sine', 0.35, 0.22), 80);
  }

  playCoinCashout() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Cash register bell + coin cascade
    this.playTone(1760, 'sine', 0.3, 0.25);
    setTimeout(() => this.playTone(2637.02, 'sine', 0.45, 0.28), 100);
  }

  // =========================================================================
  // 7. SLOTS SOUND IDENTITY (Mechanical arm, reel stop clicks & Vegas jackpot)
  // =========================================================================

  playSlotLever() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Mechanical lever arm pull & spring clunk
    this.playTone(220, 'sawtooth', 0.08, 0.15);
    setTimeout(() => this.playTone(110, 'triangle', 0.12, 0.2), 60);
  }

  playSlotReelStop(reelIndex = 0) {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Solid mechanical reel lock click with distinct pitch per column
    const pitch = 380 + (reelIndex * 60);
    this.playTone(pitch, 'triangle', 0.04, 0.22);
    this.playTone(pitch * 0.5, 'sine', 0.06, 0.18);
  }

  playSlotPayline() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Laser payout line highlight
    const notes = [659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.12, 0.15), idx * 60);
    });
  }

  playSlotJackpot() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Vegas Big Win celebratory sirens & bells
    const bells = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
    for (let loop = 0; loop < 2; loop++) {
      bells.forEach((note, idx) => {
        setTimeout(() => {
          this.playTone(note, 'sine', 0.18, 0.2);
          this.playTone(note * 1.5, 'triangle', 0.12, 0.12);
        }, (loop * 500) + (idx * 80));
      });
    }
  }

  // =========================================================================
  // 8. WHEEL OF FORTUNE (Roda da Sorte flapper clicking & VIP chime)
  // =========================================================================

  playWheelFlapperClick(speed = 1) {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Classic plastic flapper hitting a brass pin
    const pitch = 950 + (Math.random() * 80);
    this.playTone(pitch, 'triangle', 0.025, 0.14);
  }

  playWheelWin() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Carnival fanfare
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((f, i) => setTimeout(() => this.playTone(f, 'sine', 0.25, 0.2), i * 90));
  }

  // =========================================================================
  // 9. LIMBO SOUND IDENTITY (Turbo surge, supersonic rocket break & bust)
  // =========================================================================

  playLimboLaunch() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Futuristic turbo laser boost
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(1600, now + 0.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.5);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.getDestination());

    osc.start(now);
    osc.stop(now + 0.5);
  }

  playLimboTargetHit() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Supersonic barrier break success
    this.playTone(880, 'sine', 0.15, 0.22);
    setTimeout(() => this.playTone(1320, 'sine', 0.15, 0.22), 80);
    setTimeout(() => this.playTone(1760, 'sine', 0.35, 0.25), 160);
  }

  playLimboBust() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Sudden laser fizzle cut
    this.playTone(350, 'sawtooth', 0.15, 0.18);
    setTimeout(() => this.playTone(120, 'sawtooth', 0.2, 0.15), 70);
  }

  // =========================================================================
  // 10. TOWER & STAIRS SOUND IDENTITY (Elevator ascent, stone locks & traps)
  // =========================================================================

  playTowerFloorAscent(floor = 1) {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // High-tech magnetic floor ascent lock
    const freq = 440 * Math.pow(1.08, Math.min(floor, 12));
    this.playTone(freq, 'triangle', 0.15, 0.2);
    setTimeout(() => this.playTone(freq * 1.5, 'sine', 0.2, 0.18), 60);
  }

  playTowerTrap() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Electric arc trap collapse
    this.playTone(280, 'sawtooth', 0.2, 0.22);
    setTimeout(() => this.playTone(90, 'sawtooth', 0.3, 0.2), 80);
  }

  playStairsStep(step = 1) {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Heavy stone step resonance with rewarding pitch
    const pitch = 300 + (step * 35);
    this.playTone(pitch, 'triangle', 0.1, 0.2);
    setTimeout(() => this.playTone(pitch * 2, 'sine', 0.15, 0.14), 40);
  }

  // =========================================================================
  // 11. CARDS & CASINO TABLE GAMES (Blackjack, Poker, Baccarat, HiLo)
  // =========================================================================

  playCardSlide() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    // Realistic crisp paper card slide from the shoe
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.12, 'pink');
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    if (noise.buffer) {
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.getDestination());
      noise.start(now);
      noise.stop(now + 0.12);
    }
  }

  playCardSnap() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Crisp card snap on green felt
    this.playTone(800, 'triangle', 0.03, 0.18);
    this.playTone(200, 'sine', 0.05, 0.15);
  }

  playClayChips() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Heavy clay chips clinking together
    this.playTone(1800, 'sine', 0.025, 0.18);
    setTimeout(() => this.playTone(2200, 'sine', 0.03, 0.15), 30);
  }

  playBlackjackNatural() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Royal Blackjack trumpet chords
    const chord = [523.25, 659.25, 783.99, 1046.50];
    chord.forEach((f, i) => setTimeout(() => this.playTone(f, 'sine', 0.35, 0.22), i * 90));
  }

  playHiLoGuess(isHi: boolean) {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Ascending or descending synth sweep
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    if (isHi) {
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.15);
    } else {
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);
    }
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.getDestination());
    osc.start(now);
    osc.stop(now + 0.15);
  }

  // =========================================================================
  // 12. KENO & LOTTERY SOUND IDENTITY (Air blower, ball pops & lucky hits)
  // =========================================================================

  playKenoBallPop(ballNum = 1) {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Plastic ping-pong ball popping out of air tube
    const pitch = 500 + (ballNum % 10) * 40;
    this.playTone(pitch, 'sine', 0.05, 0.22);
    setTimeout(() => this.playTone(pitch * 1.6, 'triangle', 0.04, 0.14), 25);
  }

  playKenoMatch() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Golden match star chime
    this.playTone(1046.50, 'sine', 0.15, 0.25);
    setTimeout(() => this.playTone(1567.98, 'sine', 0.25, 0.22), 60);
  }

  // =========================================================================
  // 13. SCRATCH CARD SOUND IDENTITY (Textured silver foil rasp & reveal)
  // =========================================================================

  playScratchFoil() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    // Silver latex foil scratching sound
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.08, 'white');
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3200, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    if (noise.buffer) {
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.getDestination());
      noise.start(now);
      noise.stop(now + 0.08);
    }
  }

  // =========================================================================
  // 14. UNIVERSAL & UI SOUNDS (Crisp, modern, non-intrusive)
  // =========================================================================

  playBet() {
    this.playClayChips();
  }

  playTakeoff() {
    this.playAviatorTakeoff();
  }

  playMultiplierStep(multiplier: number) {
    this.playTone(1200, 'sine', 0.02, 0.015, true);
  }

  playTick() {
    this.playTone(850, 'sine', 0.025, 0.04);
  }

  playCrash() {
    this.playMinesExplosion();
  }

  playLoss() {
    this.stopEngine();
    this.playTone(160, 'sawtooth', 0.25, 0.16);
    setTimeout(() => this.playTone(100, 'sawtooth', 0.35, 0.14), 120);
  }

  playWin() {
    this.playTone(523.25, 'sine', 0.1, 0.15);
    setTimeout(() => this.playTone(659.25, 'sine', 0.1, 0.15), 80);
    setTimeout(() => this.playTone(783.99, 'sine', 0.1, 0.15), 160);
    setTimeout(() => this.playTone(1046.50, 'sine', 0.35, 0.2), 240);
  }

  playSpin() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(250, now);
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.35);
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(g);
    g.connect(this.getDestination());
    osc.start(now);
    osc.stop(now + 0.35);
  }

  playWhistle() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.playTone(2000, 'sine', 0.1, 0.12);
    setTimeout(() => this.playTone(2000, 'sine', 0.2, 0.12), 140);
  }

  playKick() {
    this.playTone(150, 'sine', 0.1, 0.22);
  }

  playTennisHit() {
    this.playTone(600, 'sine', 0.05, 0.15);
  }

  playUISelect() {
    this.playTone(950, 'sine', 0.04, 0.06);
  }

  playChip() {
    this.playClayChips();
  }

  playCardShuffle() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    for (let i = 0; i < 4; i++) {
      setTimeout(() => this.playCardSlide(), i * 60);
    }
  }

  playJackpot() {
    this.playSlotJackpot();
  }

  playChomp() {
    this.playTone(700, 'triangle', 0.06, 0.12);
    setTimeout(() => this.playTone(920, 'sine', 0.05, 0.1), 40);
  }

  playEmojiFlightStart() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.3);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(g);
    g.connect(this.getDestination());
    osc.start(now);
    osc.stop(now + 0.3);
  }

  playEmojiCrash() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.playTone(320, 'triangle', 0.12, 0.15);
    setTimeout(() => this.playTone(210, 'sine', 0.18, 0.15), 80);
    setTimeout(() => this.playTone(120, 'sine', 0.25, 0.15), 180);
  }

  playDepositProcessing() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 1.0);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.15, now + 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    osc.connect(g);
    g.connect(this.getDestination());
    osc.start(now);
    osc.stop(now + 1.0);
  }

  playDepositSuccess() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.35, 0.18), i * 75);
    });
    setTimeout(() => this.playTone(2093.00, 'sine', 0.5, 0.15), 300);
  }

  playWithdrawProcessing() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(200, now + 0.3);
    osc.frequency.exponentialRampToValueAtTime(800, now + 1.0);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.12, now + 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    osc.connect(g);
    g.connect(this.getDestination());
    osc.start(now);
    osc.stop(now + 1.0);
  }

  playWithdrawSuccess() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.playTone(880, 'sine', 0.15, 0.18);
    setTimeout(() => this.playTone(1320, 'sine', 0.15, 0.18), 90);
    setTimeout(() => this.playTone(1760, 'sine', 0.3, 0.22), 180);
  }

  playGameTransition() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(650, now + 0.6);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.12, now + 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.connect(g);
    g.connect(this.getDestination());
    osc.start(now);
    osc.stop(now + 0.6);
  }

  playTone(freq: number, type: OscillatorType, duration: number, volume: number, fadeOut = true) {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(volume, now);
    if (fadeOut) {
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    }

    osc.connect(gain);
    gain.connect(this.getDestination());

    osc.start(now);
    osc.stop(now + duration);
  }
}

export const soundService = new SoundManager();

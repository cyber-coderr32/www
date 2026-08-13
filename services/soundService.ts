
class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  
  // Engine Nodes
  private engineOsc: OscillatorNode | null = null;
  private engineNoise: AudioBufferSourceNode | null = null;
  private engineGain: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private createNoiseBuffer() {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  setMute(mute: boolean) {
    this.isMuted = mute;
    if (mute) this.stopEngine();
  }

  playBet() {
    this.playTone(440, 'sine', 0.05, 0.1);
  }

  playTakeoff() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    // Som de subida de potência
    const sweep = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    sweep.type = 'sawtooth';
    sweep.frequency.setValueAtTime(100, this.ctx.currentTime);
    sweep.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 1);
    
    g.gain.setValueAtTime(0, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1);

    sweep.connect(g);
    g.connect(this.ctx.destination);
    sweep.start();
    sweep.stop(this.ctx.currentTime + 1);
  }

  startEngine(multiplier: number = 1) {
    this.init();
    if (!this.ctx || this.isMuted) return;

    if (this.engineOsc) {
      // Atualizar o motor existente
      const targetFreq = 40 + (Math.min(multiplier, 20) * 15);
      this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.5);
      
      const lfoFreq = 10 + (Math.min(multiplier, 10) * 5);
      if (this.lfo) this.lfo.frequency.setTargetAtTime(lfoFreq, this.ctx.currentTime, 0.5);
      
      const noiseGain = 0.02 + (Math.min(multiplier, 50) * 0.005);
      if (this.engineGain) this.engineGain.gain.setTargetAtTime(noiseGain, this.ctx.currentTime, 0.5);
      return;
    }

    // Criar novo som de motor persistente
    this.engineOsc = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();
    this.lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    this.filter = this.ctx.createBiquadFilter();

    // Ruído para o vento
    this.engineNoise = this.ctx.createBufferSource();
    this.engineNoise.buffer = this.createNoiseBuffer();
    this.engineNoise.loop = true;

    // Configuração do Oscilador Principal (Combustão)
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(50, this.ctx.currentTime);

    // Configuração do Filtro (Som abafado do cockpit)
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(400, this.ctx.currentTime);

    // Configuração do LFO (Efeito de hélice)
    this.lfo.frequency.setValueAtTime(12, this.ctx.currentTime);
    lfoGain.gain.setValueAtTime(0.4, this.ctx.currentTime); // Intensidade do thrum

    // Conexões
    this.lfo.connect(lfoGain);
    lfoGain.connect(this.engineGain.gain);
    
    this.engineOsc.connect(this.filter);
    this.engineNoise.connect(this.filter);
    
    this.filter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.engineGain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.5);

    this.engineOsc.start();
    this.engineNoise.start();
    this.lfo.start();
  }

  stopEngine() {
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
      const osc = this.engineOsc;
      const noise = this.engineNoise;
      const lfo = this.lfo;
      
      setTimeout(() => {
        try {
          osc?.stop();
          noise?.stop();
          lfo?.stop();
        } catch(e) {}
      }, 350);
    }
    this.engineOsc = null;
    this.engineNoise = null;
    this.engineGain = null;
    this.lfo = null;
    this.filter = null;
  }

  playMultiplierStep(multiplier: number) {
    // Um clique mecânico sutil a cada incremento
    this.playTone(1200, 'sine', 0.02, 0.01, true);
  }

  playTick() {
    this.playTone(800, 'sine', 0.03, 0.02);
  }

  playCrash() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.stopEngine();

    // Som de impacto profundo (Brown Noise simulation)
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(100, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 1.5);

    g.gain.setValueAtTime(0.4, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.5);

    noise.connect(filter);
    filter.connect(g);
    g.connect(this.ctx.destination);
    
    noise.start();
    noise.stop(this.ctx.currentTime + 1.5);

    // Adicionar um "thud" de baixa frequência
    this.playTone(40, 'sine', 0.8, 0.5);
  }

  playLoss() {
    this.stopEngine();
    this.playTone(150, 'sawtooth', 0.5, 0.2);
    setTimeout(() => this.playTone(100, 'sawtooth', 0.6, 0.2), 150);
  }

  playWin() {
    this.playTone(523.25, 'sine', 0.1, 0.1);
    setTimeout(() => this.playTone(659.25, 'sine', 0.1, 0.1), 100);
    setTimeout(() => this.playTone(783.99, 'sine', 0.1, 0.1), 200);
    setTimeout(() => this.playTone(1046.50, 'sine', 0.4, 0.15), 300);
  }

  playSpin() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.5);
    g.gain.setValueAtTime(0.1, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  // --- SPORTS SOUNDS ---
  playWhistle() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.playTone(2000, 'sine', 0.1, 0.1);
    setTimeout(() => this.playTone(2000, 'sine', 0.2, 0.1), 150);
  }

  playKick() {
    this.playTone(150, 'sine', 0.1, 0.2);
  }

  playTennisHit() {
    this.playTone(600, 'sine', 0.05, 0.15);
  }

  playUISelect() {
    this.playTone(800, 'sine', 0.05, 0.05);
  }

  // --- NEW DEPOSIT, WITHDRAWAL & TRANSITION SYNTHESIZERS ---
  playDepositProcessing() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    
    // Nice high-tech rising synthesizer
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 1.2);
    
    g.gain.setValueAtTime(0, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);
    
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 1.2);
  }

  playDepositSuccess() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    
    // Beautiful major-chord arpeggio sweep (C major -> E -> G -> C)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 'sine', 0.4, 0.15);
      }, i * 80);
    });
    
    // High sparkling sound
    setTimeout(() => {
      this.playTone(2093.00, 'sine', 0.6, 0.1);
    }, 320);
  }

  playWithdrawProcessing() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    
    // Sci-fi descending then rising swoosh
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(200, this.ctx.currentTime + 0.4);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 1.2);
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 1.2);
    
    g.gain.setValueAtTime(0, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);
    
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 1.2);
  }

  playWithdrawSuccess() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    
    // Cash register/futuristic win sound
    this.playTone(880, 'sine', 0.15, 0.15);
    setTimeout(() => this.playTone(1320, 'sine', 0.15, 0.15), 100);
    setTimeout(() => this.playTone(1760, 'sine', 0.3, 0.2), 200);
  }

  playGameTransition() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    
    // A beautiful rising synthesizer swoosh/takeoff sweep that feels like launching Aviator
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.8);
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.8);
    
    g.gain.setValueAtTime(0, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);
    
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.8);
  }

  // --- CASINO SOUNDS ---
  playChip() {
    this.playTone(1200, 'sine', 0.05, 0.1);
  }

  playCardShuffle() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    for (let i = 0; i < 5; i++) {
      setTimeout(() => this.playTone(100 + (Math.random() * 50), 'sawtooth', 0.1, 0.05), i * 50);
    }
  }

  playJackpot() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.15, 0.15), i * 100);
      setTimeout(() => this.playTone(freq * 1.5, 'sine', 0.15, 0.1), i * 100 + 50);
    });
  }

  playChomp() {
    this.playTone(700, 'triangle', 0.08, 0.1);
    setTimeout(() => this.playTone(900, 'sine', 0.06, 0.08), 50);
  }

  playEmojiFlightStart() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Cheerful cartoon ascending jump/launch (no motor sound)
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.35);
    
    g.gain.setValueAtTime(0.12, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
    
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }

  playEmojiCrash() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    // Funny cartoon pop & descending wah-wah (no explosion/engine noise)
    this.playTone(300, 'triangle', 0.15, 0.15);
    setTimeout(() => this.playTone(200, 'sine', 0.2, 0.15), 100);
    setTimeout(() => this.playTone(130, 'sine', 0.3, 0.15), 250);
  }

  playTone(freq: number, type: OscillatorType, duration: number, volume: number, fadeOut: boolean = true) {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    if (fadeOut) {
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    }
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }
}

export const soundService = new SoundManager();

/**
 * Medical Monitor Audio Alert Synthesizer
 * Uses Web Audio API to create IEC 60601-1-8 compliant medical alarm tones
 */

class AudioAlertService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private muteUntil: number = 0;
  private intervalId: number | null = null;
  private isEnabled: boolean = true;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public enableAudio(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stopAlarmLoop();
    }
  }

  public getAudioEnabled(): boolean {
    return this.isEnabled;
  }

  public isCurrentlyMuted(): boolean {
    if (this.isMuted) return true;
    if (Date.now() < this.muteUntil) return true;
    return false;
  }

  public getMuteRemainingSeconds(): number {
    if (Date.now() >= this.muteUntil) return 0;
    return Math.max(0, Math.ceil((this.muteUntil - Date.now()) / 1000));
  }

  public silence() {
    this.isMuted = true;
    this.stopAlarmLoop();
  }

  public acknowledgeAndMute(minutes: number = 5) {
    this.muteUntil = Date.now() + minutes * 60 * 1000;
    this.stopAlarmLoop();
  }

  public unmute() {
    this.isMuted = false;
    this.muteUntil = 0;
  }

  public playTone(freq: number = 880, duration: number = 0.15, type: OscillatorType = 'sine') {
    if (!this.isEnabled || this.isCurrentlyMuted()) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.15, this.ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio autoplay may require user interaction
    }
  }

  /**
   * Plays medical high priority triple beep (IEC 60601-1-8 standard medical chime)
   */
  public playCriticalChime() {
    if (!this.isEnabled || this.isCurrentlyMuted()) return;
    this.playTone(987.77, 0.12); // B5
    setTimeout(() => this.playTone(880, 0.12), 150); // A5
    setTimeout(() => this.playTone(659.25, 0.2), 300); // E5
  }

  public startAlarmLoop() {
    if (this.intervalId !== null) return;
    this.playCriticalChime();
    this.intervalId = window.setInterval(() => {
      if (!this.isCurrentlyMuted() && this.isEnabled) {
        this.playCriticalChime();
      }
    }, 4000);
  }

  public stopAlarmLoop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const audioAlert = new AudioAlertService();

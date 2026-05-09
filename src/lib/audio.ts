class AudioSystem {
  private sounds: Record<string, HTMLAudioElement> = {};
  private muted: boolean = false;
  private masterVolume: number = 0.5;

  private soundUrls = {
    join: '/sounds/join.mp3',
    ready: '/sounds/ready.mp3',
    start: '/sounds/start.mp3',
    stop: '/sounds/stop.mp3',
    vote: '/sounds/vote.mp3',
    valid: '/sounds/valid.mp3',
    invalid: '/sounds/invalid.mp3',
    win: '/sounds/win.mp3',
    round_end: '/sounds/round_end.mp3',
    tick: '/sounds/tick.mp3',
    danger: '/sounds/danger.mp3',
  };

  preload() {
    if (typeof window === 'undefined') return;
    
    Object.entries(this.soundUrls).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      this.sounds[key] = audio;
    });
  }

  play(soundName: keyof typeof this.soundUrls, options?: { loop?: boolean; volume?: number }) {
    if (this.muted || typeof window === 'undefined') return;

    const sound = this.sounds[soundName];
    if (sound) {
      // Clone the node so we can play overlapping sounds of the same type
      const clone = sound.cloneNode() as HTMLAudioElement;
      clone.volume = (options?.volume ?? 1) * this.masterVolume;
      clone.loop = options?.loop || false;
      clone.play().catch(e => console.warn('Audio play failed (browser policy):', e));
      return clone;
    }
  }

  stop(audioInstance?: HTMLAudioElement) {
    if (audioInstance) {
      audioInstance.pause();
      audioInstance.currentTime = 0;
    }
  }

  setMute(mute: boolean) {
    this.muted = mute;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  setVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }
}

export const audioSystem = new AudioSystem();

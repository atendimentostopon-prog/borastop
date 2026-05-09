'use client';

/**
 * Utilitário profissional de áudio para o Bora Stop
 * Gerencia efeitos sonoros e música de fundo
 */

class AudioEngine {
  private static instance: AudioEngine;
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;

  private constructor() {
    if (typeof window !== 'undefined') {
      // Pré-carregar sons comuns
      this.loadSound('stop', '/sounds/stop.mp3');
      this.loadSound('tick', '/sounds/tick.mp3');
      this.loadSound('success', '/sounds/success.mp3');
      this.loadSound('join', '/sounds/join.mp3');
    }
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public loadSound(name: string, url: string) {
    if (typeof window === 'undefined') return;
    const audio = new Audio(url);
    audio.preload = 'auto';
    this.sounds.set(name, audio);
  }

  public play(name: string, volume: number = 0.5) {
    if (!this.enabled || typeof window === 'undefined') return;
    
    const sound = this.sounds.get(name);
    if (sound) {
      sound.volume = volume;
      sound.currentTime = 0;
      sound.play().catch(e => console.warn("Audio play failed:", e));
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
}

export const audio = typeof window !== 'undefined' ? AudioEngine.getInstance() : null;

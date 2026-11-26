let sharedAudioContext: AudioContext | null = null;
let audioUnlockAttached = false;

function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  const win = window as Window &
    typeof globalThis & {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
  return win.AudioContext || win.webkitAudioContext || null;
}

function getOrCreateAudioContext(): AudioContext | null {
  const AudioCtx = getAudioContextConstructor();
  if (!AudioCtx) return null;
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    try {
      sharedAudioContext = new AudioCtx();
    } catch {
      return null;
    }
  }
  return sharedAudioContext;
}

export function attachNotificationAudioUnlock(): () => void {
  if (typeof window === 'undefined' || audioUnlockAttached) {
    return () => {};
  }
  audioUnlockAttached = true;

  const unlock = () => {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
  };

  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });

  return () => {
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
    audioUnlockAttached = false;
  };
}

export async function playOrderNotificationSound(): Promise<boolean> {
  const ctx = getOrCreateAudioContext();
  if (!ctx) return false;

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const now = ctx.currentTime;
    // Crisp three-note boutique chime (E5 -> G#5 -> B5 -> E6)
    const notes: { freq: number; delay: number; duration: number; peak: number }[] = [
      { freq: 659.25, delay: 0, duration: 0.28, peak: 0.22 },
      { freq: 830.61, delay: 0.11, duration: 0.28, peak: 0.22 },
      { freq: 987.77, delay: 0.22, duration: 0.34, peak: 0.24 },
      { freq: 1318.51, delay: 0.34, duration: 0.52, peak: 0.26 },
    ];

    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, now + note.delay);

      gain.gain.setValueAtTime(0.0001, now + note.delay);
      gain.gain.exponentialRampToValueAtTime(note.peak, now + note.delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.delay + note.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + note.delay);
      osc.stop(now + note.delay + note.duration + 0.02);
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Utility to play pleasant synthesized audio chimes for incoming real-time notifications
 * using the Web Audio API without requiring external audio asset files.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Plays a double-tone notification chime (gold/luxury sound profile)
 */
export function playNotificationChime(severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'URGENT' = 'INFO') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Frequencies tailored to severity
    let freq1 = 587.33; // D5
    let freq2 = 880.00; // A5
    let duration = 0.35;

    if (severity === 'URGENT') {
      freq1 = 783.99; // G5
      freq2 = 1046.50; // C6
      duration = 0.45;
    } else if (severity === 'SUCCESS') {
      freq1 = 523.25; // C5
      freq2 = 659.25; // E5
    } else if (severity === 'WARNING') {
      freq1 = 622.25; // D#5
      freq2 = 830.61; // G#5
    }

    // Tone 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq1, now);
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.2);

    // Tone 2 (harmonious second chime)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq2, now + 0.1);
    gain2.gain.setValueAtTime(0.0001, now);
    gain2.gain.setValueAtTime(0.08, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.0005, now + duration + 0.1);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + duration + 0.1);
  } catch (err) {
    // Audio autoplays might be restricted before first user interaction
    console.debug('Notification audio chime deferred:', err);
  }
}

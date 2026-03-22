// Notification sound utility - uses MP3 file with AudioContext fallback
let audioCtx: AudioContext | null = null;
let notifAudio: HTMLAudioElement | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function getNotifAudio(): HTMLAudioElement {
  if (!notifAudio) {
    notifAudio = new Audio("/notification.mp3");
    notifAudio.volume = 0.5;
  }
  return notifAudio;
}

// Main notification sound - tries MP3 first, falls back to AudioContext chime
export function playNotificationSound() {
  try {
    const audio = getNotifAudio();
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Fallback to AudioContext
      playChimeFallback();
    });
  } catch {
    playChimeFallback();
  }
}

function playChimeFallback() {
  try {
    const ctx = getAudioContext();
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.value = 880;
    osc1.type = "sine";
    gain1.gain.setValueAtTime(0.35, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.4);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1320;
    osc2.type = "sine";
    gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.6);
  } catch {
    // Audio not supported or blocked
  }
}

export function playUrgentSound() {
  try {
    const ctx = getAudioContext();
    // Three-tone urgent beep
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = i === 0 ? 1000 : i === 1 ? 1200 : 1400;
      osc.type = "sine";
      const startTime = ctx.currentTime + i * 0.2;
      gain.gain.setValueAtTime(0.5, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
      osc.start(startTime);
      osc.stop(startTime + 0.15);
    }
  } catch {
    // Audio not supported or blocked
  }
}


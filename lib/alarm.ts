let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  audioContext ??= new AudioCtx();
  return audioContext;
}

export async function enableAlarmAudio() {
  const ctx = getAudioContext();
  if (!ctx) return false;
  masterGain ??= ctx.createGain();
  masterGain.gain.value = 0.2;
  masterGain.connect(ctx.destination);
  if (ctx.state === "suspended") await ctx.resume();
  return ctx.state === "running";
}

export function stopAlarmAudio() {
  if (!audioContext) return;
  try {
    masterGain?.disconnect();
  } catch {}
  masterGain = null;
  audioContext.close().catch(() => undefined);
  audioContext = null;
}

function beep(startAt: number, frequency: number, duration: number, volume = 0.8) {
  if (!audioContext || !masterGain) return;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain).connect(masterGain);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.03);
}

export function playAlarmPattern() {
  if (!audioContext || !masterGain || audioContext.state !== "running") return;
  const start = audioContext.currentTime + 0.03;
  for (let i = 0; i < 16; i += 1) {
    const t = start + i * 0.26;
    beep(t, i % 2 ? 660 : 880, 0.14, 0.65);
  }
}

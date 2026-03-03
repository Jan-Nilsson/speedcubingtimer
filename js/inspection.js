const PLUS2_THRESHOLD = 15;
const DNF_THRESHOLD   = 17;

let intervalId  = null;
let startedAt   = null;
let callbacks   = {};
let spoke8      = false;
let spoke12     = false;
let spokedPlus2 = false;
let audioCtx    = null;
let narratorOn  = false;

export function setNarrator(enabled) { narratorOn = enabled; }

function getAudioContext() {
  audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function beep(freq, duration = 0.12, volume = 0.4) {
  try {
    const context    = getAudioContext();
    const oscillator = context.createOscillator();
    const gain       = context.createGain();
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.type = 'sine';
    oscillator.frequency.value = freq;
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  } catch (_) {}
}

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 0.75;
  utterance.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find(v => /Google UK English Male|Microsoft David/i.test(v.name))
             || voices.find(v => v.lang === 'en-GB')
             || voices.find(v => v.lang.startsWith('en'));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

if (window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener('voiceschanged', () => window.speechSynthesis.getVoices());
}

function emit(name, data) {
  (callbacks[name] || []).forEach(fn => fn(data));
}

export function on(event, fn) {
  callbacks[event] = callbacks[event] || [];
  callbacks[event].push(fn);
}

export function startInspection() {
  startedAt   = Date.now();
  spoke8      = false;
  spoke12     = false;
  spokedPlus2 = false;

  intervalId = setInterval(() => {
    const elapsed   = (Date.now() - startedAt) / 1000;
    const remaining = PLUS2_THRESHOLD - elapsed;
    emit('inspection:tick', { elapsed, remaining });

    if (!spoke8      && elapsed >= 8)               { if (narratorOn) { speak('eight seconds');  beep(660, 0.08); } spoke8      = true; }
    if (!spoke12     && elapsed >= 12)              { if (narratorOn) { speak('twelve seconds'); beep(880, 0.08); } spoke12     = true; }
    if (!spokedPlus2 && elapsed >= PLUS2_THRESHOLD) { if (narratorOn) beep(440, 0.35, 0.6); emit('inspection:plus2', {}); spokedPlus2 = true; }
    if (elapsed >= DNF_THRESHOLD) { stopInspection(); emit('inspection:dnf', {}); }
  }, 50);
}

export function stopInspection() {
  clearInterval(intervalId);
  intervalId = null;
  startedAt  = null;
  if (narratorOn) window.speechSynthesis?.cancel();
}
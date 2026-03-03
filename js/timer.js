import { startInspection, stopInspection, setNarrator, on as onInspection } from './inspection.js';
import { addSolve, deleteSolve, updateLastPenalty, clearHistory, getSolves, getStats, formatMs } from './stats.js';
import { generateScramble } from './scramble.js';
import { applyScramble, renderNet } from './cube-preview.js';

const arena              = document.getElementById('arena');
const display            = document.getElementById('display');
const penaltyEl          = document.getElementById('penalty-text');
const manualPenaltyBar   = document.getElementById('manual-penalty-bar');
const btnPlus2           = document.getElementById('btn-plus2');
const btnDnf             = document.getElementById('btn-dnf');
const inspectionToggle   = document.getElementById('inspection-enabled');
const narratorToggle     = document.getElementById('narrator-enabled');
const tapModeToggle      = document.getElementById('tap-mode-enabled');
const cubeToggle         = document.getElementById('cube-preview-enabled');
const themeToggle        = document.getElementById('theme-toggle');
const ao5Display         = document.getElementById('ao5-display');
const historyList        = document.getElementById('history-list');
const statAo5            = document.getElementById('stat-ao5');
const statAo12           = document.getElementById('stat-ao12');
const statAo100          = document.getElementById('stat-ao100');
const statMean           = document.getElementById('stat-mean');
const clearBtn           = document.getElementById('clear-history');
const scrambleSeq        = document.getElementById('scramble-seq');
const scrambleRefresh    = document.getElementById('scramble-refresh');
const cubeNetSvg         = document.getElementById('cube-net');
const cubeNetWrap        = document.getElementById('cube-net-wrap');

const STATES = {
  IDLE:       'idle',
  HOLDING:    'holding',
  READY:      'ready',
  INSPECTING: 'inspecting',
  HOLD_INSP:  'hold-insp',
  READY_INSP: 'ready-insp',
  RUNNING:    'running',
  STOPPED:    'stopped',
};

const HOLD_DURATION = 550;

let currentState = STATES.IDLE;
let holdTimer    = null;
let runInterval  = null;
let startedAt    = null;
let penalty      = null;

function isTapMode()    { return tapModeToggle.checked; }
function isInspMode()   { return inspectionToggle.checked; }
function isCubeActive() { return cubeToggle.checked; }

function setState(newState) {
  currentState        = newState;
  arena.dataset.state = newState;
  document.body.classList.toggle('timer-running', newState === STATES.RUNNING);
}

function formatTime(ms) {
  const pad = n => String(n).padStart(2, '0');
  const centiseconds = Math.floor(ms / 10);
  const totalSeconds = Math.floor(centiseconds / 100);
  const cents        = centiseconds % 100;
  const minutes      = Math.floor(totalSeconds / 60);
  const seconds      = totalSeconds % 60;
  const hours        = Math.floor(minutes / 60);
  if (hours   > 0) return `${hours}:${pad(minutes % 60)}:${pad(seconds)}`;
  if (minutes > 0) return `${minutes}:${pad(seconds)}.${pad(cents)}`;
  return `${seconds}.${pad(cents)}`;
}

function setDisplay(ms, text = null) {
  display.textContent = text ?? formatTime(ms);
  display.dateTime    = `PT${(ms / 1000).toFixed(2)}S`;
}

function setPenalty(newPenalty) {
  penalty = newPenalty;
  penaltyEl.textContent = newPenalty ?? '';
  penaltyEl.classList.toggle('visible', !!newPenalty);
  btnPlus2.classList.toggle('active', newPenalty === '+2');
  btnDnf.classList.toggle('active', newPenalty === 'DNF');
}

function startTimer() {
  stopInspection();
  startedAt = Date.now();
  penalty   = null;
  setPenalty(null);
  runInterval = setInterval(() => setDisplay(Date.now() - startedAt), 10);
}

function stopTimer() {
  clearInterval(runInterval);
  runInterval = null;
}

onInspection('inspection:tick', ({ remaining }) => {
  if ([STATES.INSPECTING, STATES.HOLD_INSP, STATES.READY_INSP].includes(currentState)) {
    setDisplay(0, String(Math.max(0, Math.ceil(remaining))));
  }
});

onInspection('inspection:plus2', () => setPenalty('+2'));

onInspection('inspection:dnf', () => {
  setPenalty('DNF');
  setState(STATES.STOPPED);
  setDisplay(0, 'DNF');
  recordSolve(0, 'DNF');
});

function onPress() {
  switch (currentState) {
    case STATES.IDLE:
      if (isTapMode()) {
        if (isInspMode()) {
          setState(STATES.INSPECTING);
          startInspection();
        } else {
          setState(STATES.RUNNING);
          startTimer();
        }
      } else {
        setState(STATES.HOLDING);
        holdTimer = setTimeout(() => setState(STATES.READY), HOLD_DURATION);
      }
      break;

    case STATES.INSPECTING:
      if (isTapMode()) {
        setState(STATES.RUNNING);
        startTimer();
      } else {
        setState(STATES.HOLD_INSP);
        holdTimer = setTimeout(() => setState(STATES.READY_INSP), HOLD_DURATION);
      }
      break;

    case STATES.RUNNING:
      stopTimer();
      const elapsed = Date.now() - startedAt;
      setDisplay(penalty === '+2' ? elapsed + 2000 : elapsed);
      setState(STATES.STOPPED);
      manualPenaltyBar.classList.add('visible');
      recordSolve(elapsed, penalty);
      break;

    case STATES.STOPPED:
      manualPenaltyBar.classList.remove('visible');
      setPenalty(null);
      if (isTapMode()) {
        if (isInspMode()) {
          setState(STATES.INSPECTING);
          startInspection();
        } else {
          setState(STATES.RUNNING);
          startTimer();
        }
      } else {
        setState(STATES.HOLDING);
        holdTimer = setTimeout(() => setState(STATES.READY), HOLD_DURATION);
      }
      break;
  }
}

function onRelease() {
  switch (currentState) {
    case STATES.HOLDING:
      clearTimeout(holdTimer);
      setState(STATES.IDLE);
      break;

    case STATES.READY:
      clearTimeout(holdTimer);
      if (isInspMode()) {
        setState(STATES.INSPECTING);
        startInspection();
      } else {
        setState(STATES.RUNNING);
        startTimer();
      }
      break;

    case STATES.HOLD_INSP:
      clearTimeout(holdTimer);
      setState(STATES.RUNNING);
      startTimer();
      break;

    case STATES.READY_INSP:
      clearTimeout(holdTimer);
      setState(STATES.RUNNING);
      startTimer();
      break;
  }
}

function reset() {
  clearTimeout(holdTimer);
  stopTimer();
  stopInspection();
  startedAt = null;
  setPenalty(null);
  setDisplay(0, '0.00');
  manualPenaltyBar.classList.remove('visible');
  setState(STATES.IDLE);
}

function recordSolve(ms, pen) {
  const stats = addSolve(ms, pen);
  renderStats(stats);
  renderHistory();
  newScramble();
}

function renderStats(stats) {
  ao5Display.textContent = formatMs(stats.ao5);
  statAo5.textContent    = formatMs(stats.ao5);
  statAo12.textContent   = formatMs(stats.ao12);
  statAo100.textContent  = formatMs(stats.ao100);
  statMean.textContent   = formatMs(stats.mean);
  document.getElementById('ao5-block').classList.toggle('has-data', stats.count >= 5);
}

function renderHistory() {
  const solves = getSolves();
  historyList.innerHTML = '';
  [...solves].reverse().forEach((solve, reversedIndex) => {
    const realIndex = solves.length - 1 - reversedIndex;
    const li = document.createElement('li');
    li.className = 'history-item';

    const num = document.createElement('span');
    num.className   = 'h-num';
    num.textContent = solves.length - reversedIndex;

    const time = document.createElement('span');
    time.className = 'h-time';
    time.textContent = solve.penalty === 'DNF' ? 'DNF'
                     : solve.penalty === '+2'  ? formatMs(solve.ms + 2000) + '+'
                     : formatMs(solve.ms);

    const del = document.createElement('button');
    del.className   = 'h-del';
    del.textContent = '×';
    del.addEventListener('click', event => {
      event.stopPropagation();
      renderStats(deleteSolve(realIndex));
      renderHistory();
    });

    li.append(num, time, del);
    historyList.appendChild(li);
  });
}

btnPlus2.addEventListener('click', event => {
  event.stopPropagation();
  if (currentState !== STATES.STOPPED) return;
  const newPenalty = penalty === '+2' ? null : '+2';
  setPenalty(newPenalty);
  const solves = getSolves();
  if (!solves.length) return;
  const lastSolve = solves[solves.length - 1];
  const displayMs = newPenalty === '+2' ? lastSolve.ms + 2000 : lastSolve.ms;
  setDisplay(displayMs);
  renderStats(updateLastPenalty(newPenalty));
  renderHistory();
});

btnDnf.addEventListener('click', event => {
  event.stopPropagation();
  if (currentState !== STATES.STOPPED) return;
  const newPenalty = penalty === 'DNF' ? null : 'DNF';
  setPenalty(newPenalty);
  if (newPenalty === 'DNF') {
    setDisplay(0, 'DNF');
  } else {
    const solves = getSolves();
    if (solves.length) setDisplay(solves[solves.length - 1].ms);
  }
  renderStats(updateLastPenalty(newPenalty));
  renderHistory();
});

document.addEventListener('keydown', event => {
  if (event.repeat) return;

  if ((event.code === 'Backspace' || event.code === 'Delete') &&
      (currentState === STATES.STOPPED || currentState === STATES.IDLE)) {
    const solves = getSolves();
    if (solves.length) {
      renderStats(deleteSolve(solves.length - 1));
      renderHistory();
    }
    return;
  }

  if (event.code === 'Space') {
    event.preventDefault();
    if (!keysDown.has('Space')) {
      keysDown.add('Space');
      onPress();
    }
    return;
  }

  if (event.code === 'KeyR' || event.code === 'Escape') {
    event.preventDefault();
    reset();
  }
});

document.addEventListener('keyup', event => {
  if (event.code === 'Space') {
    event.preventDefault();
    keysDown.delete('Space');
    if (!isTapMode()) onRelease();
  }
});

const keysDown = new Set();

let activeTouchId = null;

document.addEventListener('touchstart', event => {
  if (activeTouchId !== null) return;
  if (event.target.closest('#sidebar, header, .scramble-bar, .manual-penalty-bar')) return;
  activeTouchId = event.changedTouches[0].identifier;
  spawnRipple(event.changedTouches[0].clientX, event.changedTouches[0].clientY);
  onPress();
}, { passive: true });

document.addEventListener('touchend', event => {
  for (const touch of event.changedTouches) {
    if (touch.identifier === activeTouchId) {
      activeTouchId = null;
      if (!isTapMode()) onRelease();
      break;
    }
  }
}, { passive: true });

function spawnRipple(x, y) {
  const el = document.createElement('div');
  el.className   = 'ripple';
  el.style.left  = x + 'px';
  el.style.top   = y + 'px';
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

clearBtn.addEventListener('click', () => {
  renderStats(clearHistory());
  renderHistory();
});

let currentScramble = '';

function newScramble() {
  currentScramble = generateScramble();
  scrambleSeq.textContent = currentScramble;
  if (isCubeActive()) updateCubeNet();
}

function updateCubeNet() {
  const cubeState = applyScramble(currentScramble);
  renderNet(cubeNetSvg, cubeState);
}

scrambleRefresh.addEventListener('click', newScramble);

narratorToggle.addEventListener('change', () => setNarrator(narratorToggle.checked));

cubeToggle.addEventListener('change', () => {
  cubeNetWrap.classList.toggle('hidden', !cubeToggle.checked);
  if (cubeToggle.checked && currentScramble) updateCubeNet();
});

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.dataset.theme = prefersDark ? 'dark' : 'light';

themeToggle.addEventListener('click', () => {
  document.documentElement.dataset.theme =
    document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
});

setState(STATES.IDLE);
setDisplay(0, '0.00');
renderStats(getStats());
renderHistory();
newScramble();
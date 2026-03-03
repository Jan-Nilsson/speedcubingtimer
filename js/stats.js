let solves = [];

export function addSolve(ms, penalty = null) {
    solves.push({ ms, penalty, timestamp: Date.now() });
    return getStats();
}

export function deleteSolve(index) {
    solves.splice(index, 1);
    return getStats();
}

export function updateLastPenalty(penalty) {
    if (!solves.length) return getStats();
    solves[solves.length - 1].penalty = penalty;
    return getStats();
}

export function clearHistory() {
    solves = [];
    return getStats();
}

export function getSolves() { return [...solves]; }

function effectiveMs(solve) {
    if (solve.penalty === 'DNF') return Infinity;
    if (solve.penalty === '+2') return solve.ms + 2000;
    return solve.ms;
}

function averageOf(count) {
    if (solves.length < count) return null;
    const slice = solves.slice(-count).map(effectiveMs);
    const sorted = [...slice].sort((a, b) => a - b);
    const trimmed = sorted.slice(1, -1);
    if (trimmed.some(value => value === Infinity)) return Infinity;
    return trimmed.reduce((sum, value) => sum + value, 0) / trimmed.length;
}

function overallMean() {
    if (!solves.length) return null;
    const valid = solves.map(effectiveMs).filter(value => value !== Infinity);
    if (!valid.length) return Infinity;
    return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

export function getStats() {
    return {
        count: solves.length,
        ao5: averageOf(5),
        ao12: averageOf(12),
        ao100: averageOf(100),
        mean: overallMean(),
    };
}

export function formatMs(ms) {
    if (ms === null) return '—';
    if (ms === Infinity) return 'DNF';
    const pad = n => String(n).padStart(2, '0');
    const centiseconds = Math.floor(ms / 10);
    const totalSeconds = Math.floor(centiseconds / 100);
    const cents = centiseconds % 100;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}:${pad(minutes % 60)}:${pad(seconds)}`;
    if (minutes > 0) return `${minutes}:${pad(seconds)}.${pad(cents)}`;
    return `${seconds}.${pad(cents)}`;
}
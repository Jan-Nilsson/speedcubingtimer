const solvedState = {
    U: Array(9).fill('U'), D: Array(9).fill('D'),
    F: Array(9).fill('F'), B: Array(9).fill('B'),
    R: Array(9).fill('R'), L: Array(9).fill('L'),
};

const faceColors = {
    U: '#f0f0f0', D: '#ffd60a',
    F: '#30d158', B: '#0a84ff',
    R: '#ff453a', L: '#ff9f0a',
};

const adjacentFaces = {
    U: [['B', [2, 1, 0]], ['R', [0, 3, 6]], ['F', [0, 1, 2]], ['L', [2, 5, 8]]],
    D: [['F', [6, 7, 8]], ['R', [2, 5, 8]], ['B', [8, 7, 6]], ['L', [0, 3, 6]]],
    F: [['U', [6, 7, 8]], ['R', [0, 3, 6]], ['D', [2, 1, 0]], ['L', [2, 5, 8]]],
    B: [['U', [2, 1, 0]], ['L', [0, 3, 6]], ['D', [6, 7, 8]], ['R', [2, 5, 8]]],
    R: [['U', [2, 5, 8]], ['B', [0, 3, 6]], ['D', [2, 5, 8]], ['F', [2, 5, 8]]],
    L: [['U', [0, 3, 6]], ['F', [0, 3, 6]], ['D', [0, 3, 6]], ['B', [2, 5, 8]]],
};

function cloneState(state) {
    const copy = {};
    for (const face in state) copy[face] = [...state[face]];
    return copy;
}

function rotateFaceClockwise(face) {
    return [
        face[6], face[3], face[0],
        face[7], face[4], face[1],
        face[8], face[5], face[2],
    ];
}

function applyClockwise(state, face) {
    const next = cloneState(state);
    next[face] = rotateFaceClockwise(state[face]);

    const adjacent = adjacentFaces[face];
    const savedTiles = adjacent[3][1].map(position => state[adjacent[3][0]][position]);

    for (let step = 3; step > 0; step--) {
        const [sourceFace, sourcePositions] = adjacent[step - 1];
        const [destFace, destPositions] = adjacent[step];
        destPositions.forEach((position, index) => {
            next[destFace][position] = state[sourceFace][sourcePositions[index]];
        });
    }

    adjacent[0][1].forEach((position, index) => {
        next[adjacent[0][0]][position] = savedTiles[index];
    });

    return next;
}

function applyMove(state, move) {
    const face = move[0];
    const mod = move.slice(1);
    const times = mod === '2' ? 2 : mod === "'" ? 3 : 1;
    let current = cloneState(state);
    for (let turn = 0; turn < times; turn++) current = applyClockwise(current, face);
    return current;
}

export function applyScramble(scrambleString) {
    let state = cloneState(solvedState);
    for (const move of scrambleString.trim().split(/\s+/)) {
        if (move) state = applyMove(state, move);
    }
    return state;
}

export function renderNet(svgElement, state) {
    const cellSize = 16;
    const gap = 1.5;
    const faceSize = 3 * cellSize + 2 * gap;
    const unit = faceSize + gap * 2;

    svgElement.setAttribute('viewBox', `0 0 ${unit * 4} ${unit * 3}`);

    const facePositions = {
        U: [unit, 0],
        L: [0, unit],
        F: [unit, unit],
        R: [unit * 2, unit],
        B: [unit * 3, unit],
        D: [unit, unit * 2],
    };

    for (const face in facePositions) {
        const [originX, originY] = facePositions[face];

        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const tileIndex = row * 3 + col;
                const x = originX + col * (cellSize + gap);
                const y = originY + row * (cellSize + gap);
                const color = faceColors[state[face][tileIndex]];

                const existing = svgElement.querySelector(`[data-face="${face}"][data-index="${tileIndex}"]`);
                if (existing) {
                    existing.setAttribute('fill', color);
                } else {
                    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    rect.setAttribute('x', x);
                    rect.setAttribute('y', y);
                    rect.setAttribute('width', cellSize);
                    rect.setAttribute('height', cellSize);
                    rect.setAttribute('rx', 2);
                    rect.setAttribute('fill', color);
                    rect.setAttribute('data-face', face);
                    rect.setAttribute('data-index', tileIndex);
                    svgElement.appendChild(rect);
                }
            }
        }
    }
}
const faces = ['U', 'D', 'F', 'B', 'R', 'L'];
const modifiers = ['', "'", '2'];
const axisMap = { U: 'U', D: 'U', F: 'F', B: 'F', R: 'R', L: 'R' };

export function generateScramble(length = 20) {
  const moves = [];
  let lastAxis = null;
  let prevAxis = null;

  while (moves.length < length) {
    const face = faces[Math.floor(Math.random() * 6)];
    const axis = axisMap[face];
    if (axis === lastAxis || axis === prevAxis) continue;
    moves.push(face + modifiers[Math.floor(Math.random() * 3)]);
    prevAxis = lastAxis;
    lastAxis = axis;
  }

  return moves.join('  ');
}
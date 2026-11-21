// A room-decomposed push-optimal Sokoban solver.
//
// Every level the generator draws is a hallway with one to four rooms off it, each room behind one door, and a box
// pushed out of a door into the hallway can never come back. So a box never changes room, a level's push-optimal
// count is the sum of its rooms' optima, and the rooms are solved one at a time with the other rooms' boxes standing
// as walls: a breadth-first search over pushes, which meets the first solved state in push-optimal order, pruning two
// deadlocks a box can never leave (a dead square, one from which no push brings a box to any goal, and a frozen
// 2 x 2 block of walls and boxes holding a box off its goal). The player's walk between pushes comes from a second
// breadth-first search, and the rooms' move strings are concatenated.
//
// Local run: MAKEFUN_INPUT_DIR=practice/input MAKEFUN_OUTPUT_DIR=out node main.ts
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** The four directions: [dx, dy, the step's letter, the push's letter]. */
const D = [[0, -1, 'u', 'U'], [0, 1, 'd', 'D'], [-1, 0, 'l', 'L'], [1, 0, 'r', 'R']];

/** A level in XSB: its width and height, its walls, goals and boxes, and the player's square. */
function parse(text) {
  const rows = text.split('\n').filter((r) => r.length > 0);
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const wall = new Uint8Array(w * h).fill(1);
  const goal = new Uint8Array(w * h);
  const boxes = [];
  let player = 0;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const i = y * w + x;
      if (ch === '#') continue;
      wall[i] = 0;
      if ('.*+'.includes(ch)) goal[i] = 1;
      if ('$*'.includes(ch)) boxes.push(i);
      if ('@+'.includes(ch)) player = i;
    }
  });
  // The outermost frame is wall whatever it shows, so nothing leaves the board.
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x === 0 || y === 0 || x === w - 1 || y === h - 1) wall[y * w + x] = 1;
  return { w, wall, goal, boxes: boxes.sort((a, b) => a - b), player };
}

/** The squares from which a box alone can be pushed onto some goal: the goals, pulled back over open floor. */
function live(lv) {
  const { w, wall, goal } = lv;
  const L = new Uint8Array(wall.length);
  const q = [];
  for (let i = 0; i < wall.length; i++) if (goal[i]) { L[i] = 1; q.push(i); }
  for (let k = 0; k < q.length; k++) {
    const x = q[k];
    for (const [dx, dy] of D) {
      const d = dy * w + dx;
      const y = x - d;
      if (!wall[y] && !wall[y - d] && !L[y]) { L[y] = 1; q.push(y); }
    }
  }
  return L;
}

/** The squares the player reaches from `from` around walls and `occ`, marked in `seen` with `stamp`: their lowest. */
function reach(lv, occ, from, seen, stamp, stack) {
  const { w, wall } = lv;
  let low = from;
  let n = 0;
  stack[n++] = from;
  seen[from] = stamp;
  while (n > 0) {
    const p = stack[--n];
    if (p < low) low = p;
    for (let k = 0; k < 4; k++) {
      const q = p + (k === 0 ? -w : k === 1 ? w : k === 2 ? -1 : 1);
      if (!wall[q] && !occ[q] && seen[q] !== stamp) { seen[q] = stamp; stack[n++] = q; }
    }
  }
  return low;
}

/**
 * The push-optimal solution of one room, searching every state: {pushes, moves}, or null when it has none. A state is
 * the boxes' squares and the player's reachable region, named by its lowest square; the search expands states in
 * order of pushes made, so the first solved state it meets is push-optimal.
 */
function solve(sub, L) {
  const { w, wall, goal, boxes: b0, player } = sub;
  const size = wall.length;
  const occ = new Uint8Array(size);
  const seen = new Int32Array(size);
  const mark = new Int32Array(size);
  const stack = new Int32Array(size);
  let stamp = 0;
  const key = (bs, low) => {
    let k = low;
    for (const b of bs) k = k * size + b;
    return k;
  };
  const solved = (bs) => bs.every((b) => goal[b]);
  if (b0.some((b) => !L[b])) return null;
  /** Whether the box just pushed to `t` sits in a frozen 2 x 2 block of walls and boxes with a box off its goal. */
  const frozen = (t) => {
    for (const a of [t, t - 1, t - w, t - w - 1]) {
      if (!((wall[a] || occ[a]) && (wall[a + 1] || occ[a + 1]) && (wall[a + w] || occ[a + w]) && (wall[a + w + 1] || occ[a + w + 1]))) continue;
      for (const s of [a, a + 1, a + w, a + w + 1]) if (occ[s] && !goal[s]) return true;
    }
    return false;
  };
  // The states in the order found: their boxes, the player's square, and the parent that made them.
  const sb = [b0];
  const sp = [player];
  const par = [-1];
  const idx = new Map();
  for (const b of b0) occ[b] = 1;
  idx.set(key(b0, reach(sub, occ, player, seen, ++stamp, stack)), 0);
  for (const b of b0) occ[b] = 0;
  let found = solved(b0) ? 0 : -1;
  for (let head = 0; found < 0 && head < sb.length; head++) {
    const boxes = sb[head];
    for (const b of boxes) occ[b] = 1;
    reach(sub, occ, sp[head], seen, ++stamp, stack);
    const here = stamp;
    for (let bi = 0; bi < boxes.length && found < 0; bi++) {
      const b = boxes[bi];
      for (const [dx, dy] of D) {
        const d = dy * w + dx;
        const t = b + d;
        if (seen[b - d] !== here || wall[t] || occ[t] || !L[t]) continue;
        occ[b] = 0;
        occ[t] = 1;
        let k = -1;
        let next = null;
        if (!frozen(t)) {
          next = boxes.slice();
          next[bi] = t;
          next.sort((x, y) => x - y);
          k = key(next, reach(sub, occ, b, mark, ++stamp, stack));
        }
        occ[t] = 0;
        occ[b] = 1;
        if (next === null || idx.has(k)) continue;
        idx.set(k, sb.length);
        sb.push(next);
        sp.push(b);
        par.push(head);
        if (solved(next)) { found = sb.length - 1; break; }
      }
    }
    for (const b of boxes) occ[b] = 0;
  }
  if (found < 0) return null;
  // The path of states, then the moves: walk to each push's square, then push.
  const path = [];
  for (let s = found; s > 0; s = par[s]) path.push(s);
  path.reverse();
  let moves = '';
  let at = player;
  let boxes = b0;
  for (const s of path) {
    const next = sb[s];
    const from = boxes.find((b) => !next.includes(b));
    const to = next.find((b) => !boxes.includes(b));
    const d = to - from;
    const dir = D.find(([dx, dy]) => dy * w + dx === d);
    for (const b of boxes) occ[b] = 1;
    moves += walk(sub, occ, at, from - d);
    for (const b of boxes) occ[b] = 0;
    moves += dir[3];
    at = from;
    boxes = next;
  }
  return { pushes: path.length, moves };
}

/** The shortest walk from `from` to `to` around walls and `occ`, in lower letters (the first direction first). */
function walk(sub, occ, from, to) {
  const { w, wall } = sub;
  if (from === to) return '';
  const prev = new Int32Array(wall.length).fill(-1);
  const how = [];
  const q = [from];
  prev[from] = from;
  for (let i = 0; i < q.length; i++) {
    const p = q[i];
    if (p === to) break;
    for (const [dx, dy, letter] of D) {
      const r = p + dy * w + dx;
      if (wall[r] || occ[r] || prev[r] !== -1) continue;
      prev[r] = p;
      how[r] = letter;
      q.push(r);
    }
  }
  let s = '';
  for (let p = to; p !== from; p = prev[p]) s = how[p] + s;
  return s;
}

/**
 * The level's rooms: the dead squares of the player's row (the hallway, where a box reaches no goal) cut out of the
 * floor, each part left that holds a box being a room. Null when the level is no set of rooms.
 */
function roomsOf(lv) {
  const { w, wall, goal, boxes, player } = lv;
  const n = wall.length;
  const L = live(lv);
  const row = Math.floor(player / w);
  const cut = new Uint8Array(n);
  for (let i = row * w; i < (row + 1) * w; i++) if (!wall[i] && !L[i]) cut[i] = 1;
  if (boxes.some((b) => cut[b])) return null;
  const part = new Int32Array(n).fill(-1);
  const rooms = [];
  for (let s = 0; s < n; s++) {
    if (wall[s] || cut[s] || part[s] >= 0) continue;
    const squares = [s];
    part[s] = rooms.length;
    for (let i = 0; i < squares.length; i++) {
      for (const [dx, dy] of D) {
        const q = squares[i] + dy * w + dx;
        if (!wall[q] && !cut[q] && part[q] < 0) { part[q] = rooms.length; squares.push(q); }
      }
    }
    rooms.push({ squares, boxes: [], goals: [] });
  }
  for (const b of boxes) rooms[part[b]].boxes.push(b);
  for (let i = 0; i < n; i++) if (goal[i] && part[i] >= 0) rooms[part[i]].goals.push(i);
  if (boxes.some((b) => part[b] < 0) || rooms.some((r) => r.boxes.length !== r.goals.length)) return null;
  return rooms.filter((r) => r.boxes.length > 0);
}

/** The level solved room by room: each room's push-optimal moves in turn, the player walking on from where it left. */
function solveLevel(lv) {
  const rooms = roomsOf(lv);
  if (rooms === null) return '';
  let at = lv.player;
  let moves = '';
  for (const room of rooms) {
    const wall = lv.wall.slice();
    for (const other of rooms) if (other !== room) for (const b of other.done ? other.goals : other.boxes) wall[b] = 1;
    const sub = { w: lv.w, wall, goal: lv.goal, boxes: room.boxes.slice(), player: at };
    const L = live(sub);
    const got = solve(sub, L);
    if (got === null) return '';
    moves += got.moves;
    for (let p = at, k = 0; k < got.moves.length; k++) {
      const ch = got.moves[k].toLowerCase();
      p += ch === 'u' ? -lv.w : ch === 'd' ? lv.w : ch === 'l' ? -1 : 1;
      if (k === got.moves.length - 1) at = p;
    }
    room.done = true;
  }
  return moves;
}

for (const id of readdirSync(I).sort()) {
  let moves = '';
  try {
    moves = solveLevel(parse(readFileSync(join(I, id, 'level.txt'), 'utf8')));
  } catch {
    moves = '';
  }
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'solution.txt'), `${moves}\n`);
}

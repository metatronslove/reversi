// Board class
class Board {
  constructor(orig) {
    if (!orig) {
      this.computerIs = 1; // White
      this.whoseMove = -1; // Black
      this.stateVector = [
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 1, -1, 0, 0, 0,
        0, 0, 0, -1, 1, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0
      ];
    } else {
      this.computerIs = orig.computerIs;
      this.whoseMove = orig.whoseMove;
      this.stateVector = [...orig.stateVector];
    }
  }

  static scoreVector = [
    99, -8, 8, 6, 6, 8, -8, 99,
    -8, -24, -4, -3, -3, -4, -24, -8,
    8, -4, 7, 4, 4, 7, -4, 8,
    6, -3, 4, 0, 0, 4, -3, 6,
    6, -3, 4, 0, 0, 4, -3, 6,
    8, -4, 7, 4, 4, 7, -4, 8,
    -8, -24, -4, -3, -3, -4, -24, -8,
    99, -8, 8, 6, 6, 8, -8, 99
  ];

  state([x, y]) {
    return this.stateVector[x + 8 * y];
  }

  positionScore([x, y]) {
    return Board.scoreVector[x + 8 * y];
  }

  setState([x, y], s) {
    this.stateVector[x + 8 * y] = s;
  }

  sameAs(other) {
    return this.whoseMove === other.whoseMove &&
           this.computerIs === other.computerIs &&
           this.stateVector.every((v, i) => v === other.stateVector[i]);
  }

  doMove(c) {
    if (c.length === 0) {
      this.pass();
      return true;
    }
    if (this.state(c) !== 0) return false;
    const flips = this.allFlips(c, this.whoseMove);
    if (flips.length === 0) return false;
    this.setState(c, this.whoseMove);
    flips.forEach(flip => this.setState(flip, this.whoseMove));
    this.whoseMove = -this.whoseMove;
    return true;
  }

  pass() {
    this.whoseMove = -this.whoseMove;
  }

  flipLine(c, dir, s) {
    const accumulate = [];
    let scan = [c[0] + dir[0], c[1] + dir[1]];
    while (scan[0] >= 0 && scan[0] <= 7 && scan[1] >= 0 && scan[1] <= 7) {
      if (this.state(scan) !== -s) {
        if (this.state(scan) === s) return accumulate;
        break;
      }
      accumulate.push([...scan]);
      scan[0] += dir[0];
      scan[1] += dir[1];
    }
    return [];
  }

  whoCanFlip(c, dir, got) {
    let scan = [c[0] + dir[0], c[1] + dir[1]];
    if (scan[0] <= 0 || scan[0] >= 7 || scan[1] <= 0 || scan[1] >= 7) return;
    const opponent = this.state(scan);
    scan = [scan[0] + dir[0], scan[1] + dir[1]];
    while (scan[0] >= 0 && scan[0] <= 7 && scan[1] >= 0 && scan[1] <= 7) {
      const who = this.state(scan);
      if (who !== opponent) {
        if (who === -opponent) got[(who + 2) % 3] = 1;
        return;
      }
      scan[0] += dir[0];
      scan[1] += dir[1];
    }
  }

  allFlips(c, s) {
    return [
      ...this.flipLine(c, [-1, -1], s),
      ...this.flipLine(c, [0, -1], s),
      ...this.flipLine(c, [1, -1], s),
      ...this.flipLine(c, [-1, 0], s),
      ...this.flipLine(c, [1, 0], s),
      ...this.flipLine(c, [-1, 1], s),
      ...this.flipLine(c, [0, 1], s),
      ...this.flipLine(c, [1, 1], s)
    ];
  }

  addLiberties(lib, c) {
    const got = [0, 0];
    [
      [-1, -1], [0, -1], [1, -1],
      [-1, 0], [1, 0],
      [-1, 1], [0, 1], [1, 1]
    ].forEach(dir => this.whoCanFlip(c, dir, got));
    lib[0] += got[0];
    lib[1] += got[1];
  }

  flipScore(flips) {
    return flips.reduce((score, flip) => score + this.positionScore(flip), 0);
  }

  liberties() {
    const lib = [0, 0];
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        this.addLiberties(lib, [x, y]);
      }
    }
    return lib;
  }

  score() {
    const cs = this.countSquares();
    if (cs[0] === 0) return -1000;
    if (cs[1] === 0) return 1000;
    if (cs[2] === 0) return 1000 * (cs[0] - cs[1]);
    const lib = this.liberties();
    let posCount = (321 / (lib[1] + 2 + this.whoseMove)) -
                  (321 / (lib[0] + 2 - this.whoseMove));
    if (cs[2] < 53 && cs[2] > 14) {
      posCount += (cs[1] - cs[0]) * 3;
    } else if (cs[2] < 9) {
      posCount += (cs[0] - cs[1]) * 20;
    }
    posCount += this.stateVector.reduce((sum, s, j) => sum + s * Board.scoreVector[j], 0);
    return posCount < 0 ? Math.floor(posCount + 0.4) : Math.ceil(posCount - 0.4);
  }

  bestMoves(promote) {
    const choices = [];
    let doPromote = false;
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        const pos = [x, y];
        if (this.state(pos) !== 0) continue;
        const flips = this.allFlips(pos, this.whoseMove);
        if (flips.length === 0) continue;
        if (promote && pos[0] === promote[0] && pos[1] === promote[1]) {
          doPromote = true;
          continue;
        }
        const score = 2 * this.flipScore(flips) +
                      this.positionScore(pos) +
                      15 * Math.random();
        choices.push([score, pos]);
      }
    }
    choices.sort((a, b) => b[0] - a[0]);
    const result = doPromote ? [promote] : [];
    choices.forEach(([_, pos]) => result.push(pos));
    return result.length ? result : [[]];
  }

  countSquares() {
    const counts = [0, 0, 0];
    this.stateVector.forEach(s => counts[(s + 2) % 3]++);
    return counts;
  }
}

// Node class for AI search
class Node {
  constructor(board, depth, move, adverse, first) {
    this.move = move;
    this.board = new Board(board);
    if (move) this.board.doMove(move);
    this.depth = depth;
    const promote = first?.length ? first.shift() : null;
    this.first = first;
    this.childMoves = depth <= 0 ? [] : board.bestMoves(promote);
    this.adverse = adverse;
    this.best = depth === 0 ? this.board.score() : null;
    this.bestSeq = null;
  }

  advanceDepth() {
    this.depth++;
    this.first = this.bestSeq;
    this.childMoves = this.board.bestMoves(this.first?.shift());
    this.best = null;
  }

  nextChild() {
    if (!this.childMoves.length) return null;
    const move = this.childMoves.shift();
    return new Node(this.board, this.depth - 1, move, this.best, this.first);
  }

  better(s1, s2) {
    if (s1 === null) return false;
    if (s2 === null) return true;
    return this.board.whoseMove === 1 ? s1 > s2 : s1 < s2;
  }

  finishChild(move, score, seq) {
    if (this.better(score, this.best)) {
      this.best = score;
      this.bestSeq = [move, ...(seq || [])];
      if (this.adverse !== null && !this.better(this.adverse, score)) {
        this.childMoves.length = 0;
      }
    }
  }

  stalemate() {
    if (!this.bestSeq || this.bestSeq.length < 2) return false;
    const last = this.bestSeq[this.bestSeq.length - 1];
    const secondLast = this.bestSeq[this.bestSeq.length - 2];
    return last.length === 0 && secondLast.length === 0;
  }
}

// SearchStack class for AI
class SearchStack {
  constructor(board, choice) {
    this.stack = [new Node(board, 2, choice, null, null)];
    this.bestMove = this.stack[0].childMoves[0];
    this.bestDepth = 1;
  }

  advance() {
    if (!this.stack.length) return false;
    const n = this.stack[this.stack.length - 1];
    const c = n.nextChild();
    if (c) {
      this.stack.push(c);
    } else {
      this.stack.pop();
      if (this.stack.length) {
        this.stack[this.stack.length - 1].finishChild(n.move, n.best, n.bestSeq);
      } else {
        this.bestMove = n.bestSeq[0];
        this.bestDepth = n.depth;
        if (!n.stalemate() && n.best < 1000 && n.best > -1000) {
          n.advanceDepth();
          this.stack.push(n);
        } else {
          this.stack.push(n);
          return false;
        }
      }
    }
    return true;
  }

  getBestMove() {
    return this.stack.length && this.stack[0].bestMove
      ? this.stack[0].bestMove
      : this.bestMove;
  }

  sameAs(b) {
    return this.stack.length && this.stack[0].board.sameAs(b);
  }
}

// SearchSpace class for managing AI searches
class SearchSpace {
  constructor() {
    this.stacks = [];
    this.currentStack = 0;
  }

  setBoard(board) {
    if (board.whoseMove === board.computerIs) {
      let newStack = this.stacks.find(s => s.sameAs(board));
      if (!newStack) {
        newStack = new SearchStack(board, null);
      } else {
        log(`Starting at depth ${newStack.bestDepth}`);
      }
      this.stacks = [newStack];
    } else {
      this.stacks = board.bestMoves().map(choice => new SearchStack(board, choice));
    }
    this.currentStack = 0;
  }

  advance(iterations) {
    if (!this.stacks.length) return false;
    let finished = 0;
    while (iterations > 0) {
      const stack = this.stacks[this.currentStack++];
      if (this.currentStack >= this.stacks.length) this.currentStack = 0;
      while (iterations > 0) {
        if (!stack.advance()) {
          finished++;
          break;
        }
        iterations--;
      }
      if (finished >= this.stacks.length) return false;
    }
    return true;
  }

  bestMove() {
    return this.stacks.length ? this.stacks[0].getBestMove() : [];
  }

  bestDepth() {
    return this.stacks.length ? this.stacks[0].bestDepth : 0;
  }
}

// UI functions
const drawAll = (board) => {
  $$('.rsquare').forEach(cell => {
    const img = cell.querySelector('img');
    img.src = IMAGES[board.state(coords(cell)) === -1 ? 'black' : board.state(coords(cell)) === 1 ? 'white' : 'green'];
  });
  drawText(board);
};

const drawText = (board) => {
  const counts = board.countSquares();
  $('#whitenum').textContent = counts[0] < 10 ? ` ${counts[0]}` : counts[0];
  $('#blacknum').textContent = counts[1] < 10 ? ` ${counts[1]}` : counts[1];

  const currentPlayer = colorName(board.whoseMove);
  const opponent = colorName(-board.whoseMove);
  $(`#${currentPlayer}pointer`).style.visibility = 'visible';
  $(`#${currentPlayer}pointer`).title = `${currentPlayer} to move`;
  $(`#${opponent}pointer`).style.visibility = 'hidden';
  $(`#${opponent}pointer`).removeAttribute('title');

  const humanPlayer = colorName(-board.computerIs);
  const computerPlayer = colorName(board.computerIs);
  $(`#${humanPlayer}line`).title = `you are ${humanPlayer}`;
  $(`#${computerPlayer}line`).title = `click to play as ${computerPlayer}`;
  $(`#${humanPlayer}computer`).hidden = true;
  $(`#${computerPlayer}computer`).hidden = false;

  $('#undo').disabled = !undoStack.length;
  const [whiteCount, blackCount, emptyCount] = counts;
  if (redoStack.length) {
    $('#pass').textContent = 'Redo';
    $('#pass').disabled = false;
  } else if (whiteCount === 0 || blackCount === 0 || emptyCount === 0) {
    $('#pass').textContent = 'Start';
    $('#pass').disabled = false;
  } else {
    $('#pass').textContent = 'Pass';
    $('#pass').disabled = board.whoseMove === board.computerIs ||
                         emptyCount === 0 ||
                         board.bestMoves()[0].length !== 0;
  }
};

const pickPlayer = (p) => {
  if (mainBoard.computerIs === -p) return;
  undoStack.push(new Board(mainBoard));
  redoStack.length = 0;
  mainBoard.computerIs = -p;
  drawText(mainBoard);
  startAI(mainBoard);
};

const doClick = (c) => {
  if (mainBoard.computerIs === mainBoard.whoseMove) return;
  const saved = new Board(mainBoard);
  if (mainBoard.doMove(c)) {
    undoStack.push(saved);
    redoStack.length = 0;
    drawAll(mainBoard);
    startAI(mainBoard);
  }
};

const doPass = () => {
  const counts = mainBoard.countSquares();
  if (redoStack.length) {
    doRedo();
  } else if (counts[0] === 0 || counts[1] === 0 || counts[2] === 0) {
    undoStack.push(new Board(mainBoard));
    redoStack.length = 0;
    mainBoard = new Board();
    drawAll(mainBoard);
    startAI(mainBoard);
    log('Starting new game');
  } else {
    doClick([]);
  }
};

const doRedo = () => {
  if (redoStack.length) {
    undoStack.push(new Board(mainBoard));
    mainBoard = redoStack.pop();
    log(`redo to ${undoStack.length}`);
    drawAll(mainBoard);
    startAI(mainBoard);
  }
};

const doUndo = () => {
  if (undoStack.length) {
    redoStack.push(new Board(mainBoard));
    mainBoard = undoStack.pop();
    log(`undo to ${undoStack.length}`);
    drawAll(mainBoard);
    startAI(mainBoard);
  }
};

// AI timing
let moveTimer = null;
let earlyTimer = null;
let cycleTimer = null;

const stopTimers = () => {
  clearTimeout(moveTimer);
  clearTimeout(earlyTimer);
  clearTimeout(cycleTimer);
  moveTimer = earlyTimer = cycleTimer = null;
};

const startAI = (board) => {
  stopTimers();
  ai.setBoard(board);
  if (board.whoseMove === board.computerIs) {
    const remaining = mainBoard.countSquares()[2];
    const ms = 500 + (64 - remaining) * 150;
    moveTimer = setTimeout(finishAI, ms);
    earlyTimer = setTimeout(earlyAI, 1000);
  }
  cycleTimer = setTimeout(advanceAI, 1);
};

const advanceAI = () => {
  if (!ai.advance(20)) {
    if (!earlyTimer) {
      finishAI();
    } else {
      clearTimeout(moveTimer);
      moveTimer = null;
    }
    return;
  }
  clearTimeout(cycleTimer);
  cycleTimer = setTimeout(advanceAI, 1);
};

const earlyAI = () => {
  if (!moveTimer) {
    finishAI();
  } else {
    clearTimeout(earlyTimer);
    earlyTimer = null;
  }
};

const finishAI = () => {
  stopTimers();
  if (mainBoard.computerIs !== mainBoard.whoseMove) return;
  const bestMove = ai.bestMove();
  if (!mainBoard.doMove(bestMove)) {
    log(`Problem move: ${bestMove}`);
    return;
  }
  log(`Depth ${ai.bestDepth()}: ${bestMove}`);
  drawAll(mainBoard);
  startAI(mainBoard);
};

// Board generation
const createBoard = () => {
  const board = $('#board');
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      const cell = document.createElement('div');
      cell.className = 'rsquare';
      cell.id = `r${x}${y}`;
      const img = document.createElement('img');
      img.src = IMAGES.green;
      cell.appendChild(img);
      board.appendChild(cell);
    }
  }
};

// Constants for game assets
const IMAGES = {
  black: 'assets/black.gif',
  green: 'assets/green.gif',
  white: 'assets/white.gif'
};

// Game state
const undoStack = [];
const redoStack = [];
let mainBoard = new Board();
const ai = new SearchSpace();

// URL parameters
const params = new URLSearchParams(window.location.search);
const easy = params.has('easy');
const small = params.has('small');
const playwhite = params.has('white');
const notext = params.has('quiet');

// Utility functions
const log = (message) => {
  if (console) console.log(message);
};

const coords = (cell) => {
  const id = cell.id;
  return [parseInt(id[1]), parseInt(id[2])];
};

const colorName = (n) => (n === -1 ? 'black' : 'white');

// DOM manipulation
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// Initialize game
const init = () => {
  createBoard();
  if (small) document.body.classList.add('small');
  if (notext) document.body.classList.add('no-text');

  $$('.rsquare').forEach(cell => {
    cell.addEventListener('mousedown', (e) => {
      doClick(coords(cell));
      e.preventDefault();
    });
  });

  $$('.player-label').forEach(label => {
    label.addEventListener('click', () => {
      const player = label.dataset.player === 'white' ? 1 : -1;
      pickPlayer(player);
    });
  });

  $('#undo').addEventListener('click', doUndo);
  $('#pass').addEventListener('click', doPass);

  drawAll(mainBoard);
  startAI(mainBoard);

  if (easy) {
    Board.scoreVector = Array(64).fill(11);
    log('Playing easy mode');
  }
  if (playwhite) pickPlayer(1);
};

document.addEventListener('DOMContentLoaded', init);
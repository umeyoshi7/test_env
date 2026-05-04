"use strict";

const BOARD_SIZE = 8;

const FLEET = [
  { name: "戦艦",     size: 4 },
  { name: "巡洋艦",   size: 3 },
  { name: "駆逐艦",   size: 3 },
  { name: "潜水艦",   size: 2 },
  { name: "哨戒艇",   size: 2 },
];

const PHASE_PLACEMENT = "placement";
const PHASE_PLAYING   = "playing";
const PHASE_ENDED     = "ended";

const cellKey = (r, c) => `${r},${c}`;

function emptyBoard() {
  return {
    ships: [],
    shots: new Set(),
    hits: new Set(),
  };
}

function newGameState() {
  return {
    phase: PHASE_PLACEMENT,
    playerBoard: emptyBoard(),
    enemyBoard:  emptyBoard(),
    selectedShipIndex: 0,
    orientation: "h",
    placedFlags: FLEET.map(() => false),
    aiState: { mode: "hunt", queue: [], firstHit: null, direction: null },
    busy: false,
  };
}

let state = newGameState();

const els = {};

function $(id) { return document.getElementById(id); }

function setStatus(text) { els.status.textContent = text; }

function setPhase(phase) {
  state.phase = phase;
  document.body.dataset.phase = phase;
}

/* -------- Board DOM -------- */

function buildBoard(elementId, onCellClick, onCellHover) {
  const root = $(elementId);
  root.innerHTML = "";
  const cells = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    cells.push([]);
    for (let c = 0; c < BOARD_SIZE; c++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cell";
      btn.dataset.r = r;
      btn.dataset.c = c;
      btn.setAttribute("role", "gridcell");
      btn.setAttribute("aria-label", `${r + 1}行${c + 1}列`);
      if (onCellClick) {
        btn.addEventListener("click", () => onCellClick(r, c));
      }
      if (onCellHover) {
        btn.addEventListener("pointerenter", () => onCellHover(r, c, true));
        btn.addEventListener("pointerleave", () => onCellHover(r, c, false));
      }
      root.appendChild(btn);
      cells[r].push(btn);
    }
  }
  return cells;
}

function clearPreview(cells) {
  for (const row of cells) {
    for (const cell of row) {
      cell.classList.remove("cell-preview", "cell-invalid");
    }
  }
}

/* -------- Placement logic -------- */

function shipCells(size, r, c, orient) {
  const result = [];
  for (let i = 0; i < size; i++) {
    if (orient === "h") result.push([r, c + i]);
    else result.push([r + i, c]);
  }
  return result;
}

function inBounds(r, c) {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

function canPlace(board, size, r, c, orient) {
  const cells = shipCells(size, r, c, orient);
  for (const [rr, cc] of cells) {
    if (!inBounds(rr, cc)) return false;
    for (const ship of board.ships) {
      if (ship.cells.some(([sr, sc]) => sr === rr && sc === cc)) return false;
    }
  }
  return true;
}

function placeShip(board, fleetIdx, r, c, orient) {
  const def = FLEET[fleetIdx];
  const cells = shipCells(def.size, r, c, orient);
  board.ships.push({
    fleetIdx,
    name: def.name,
    size: def.size,
    cells,
    hits: new Set(),
    sunk: false,
  });
}

function randomPlace(board) {
  board.ships = [];
  for (let i = 0; i < FLEET.length; i++) {
    const def = FLEET[i];
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 500) {
      attempts++;
      const orient = Math.random() < 0.5 ? "h" : "v";
      const r = Math.floor(Math.random() * BOARD_SIZE);
      const c = Math.floor(Math.random() * BOARD_SIZE);
      if (canPlace(board, def.size, r, c, orient)) {
        placeShip(board, i, r, c, orient);
        placed = true;
      }
    }
    if (!placed) {
      board.ships = [];
      i = -1;
    }
  }
}

/* -------- Rendering -------- */

function renderPlacementBoard() {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = els.placementCells[r][c];
      cell.className = "cell";
    }
  }
  for (const ship of state.playerBoard.ships) {
    for (const [r, c] of ship.cells) {
      els.placementCells[r][c].classList.add("cell-ship");
    }
  }
}

function renderFleetList() {
  els.fleetList.innerHTML = "";
  for (let i = 0; i < FLEET.length; i++) {
    const li = document.createElement("li");
    li.className = "fleet-item";
    if (state.placedFlags[i]) li.classList.add("placed");
    if (i === state.selectedShipIndex && !state.placedFlags[i]) li.classList.add("selected");
    li.dataset.idx = i;

    const name = document.createElement("span");
    name.textContent = FLEET[i].name;
    const size = document.createElement("span");
    size.className = "ship-size";
    size.textContent = `×${FLEET[i].size}`;
    li.appendChild(name);
    li.appendChild(size);

    li.addEventListener("click", () => {
      if (state.placedFlags[i]) return;
      state.selectedShipIndex = i;
      renderFleetList();
    });
    els.fleetList.appendChild(li);
  }
}

function updateStartButton() {
  const allPlaced = state.placedFlags.every(Boolean);
  els.btnStart.disabled = !allPlaced;
}

function renderOwnBoard() {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = els.ownCells[r][c];
      cell.className = "cell";
      cell.disabled = true;
    }
  }
  const board = state.playerBoard;
  for (const ship of board.ships) {
    for (const [r, c] of ship.cells) {
      const cell = els.ownCells[r][c];
      if (ship.sunk) cell.classList.add("cell-sunk");
      else if (ship.hits.has(cellKey(r, c))) cell.classList.add("cell-hit");
      else cell.classList.add("cell-ship");
    }
  }
  for (const key of board.shots) {
    const [r, c] = key.split(",").map(Number);
    if (!board.hits.has(key)) {
      els.ownCells[r][c].classList.add("cell-miss");
    }
  }
}

function renderEnemyBoard() {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = els.enemyCells[r][c];
      cell.className = "cell";
      cell.disabled = state.phase !== PHASE_PLAYING || state.busy;
    }
  }
  const board = state.enemyBoard;
  for (const key of board.shots) {
    const [r, c] = key.split(",").map(Number);
    const cell = els.enemyCells[r][c];
    cell.disabled = true;
    if (board.hits.has(key)) {
      const ship = board.ships.find(s => s.cells.some(([sr, sc]) => sr === r && sc === c));
      if (ship && ship.sunk) cell.classList.add("cell-sunk");
      else cell.classList.add("cell-hit");
    } else {
      cell.classList.add("cell-miss");
    }
  }
}

/* -------- Placement interaction -------- */

function onPlacementHover(r, c, entering) {
  clearPreview(els.placementCells);
  if (!entering) return;
  const fleetIdx = state.selectedShipIndex;
  if (state.placedFlags[fleetIdx]) return;
  const size = FLEET[fleetIdx].size;
  const cells = shipCells(size, r, c, state.orientation);
  const ok = canPlace(state.playerBoard, size, r, c, state.orientation);
  const cls = ok ? "cell-preview" : "cell-invalid";
  for (const [rr, cc] of cells) {
    if (inBounds(rr, cc)) els.placementCells[rr][cc].classList.add(cls);
  }
}

function onPlacementClick(r, c) {
  const fleetIdx = state.selectedShipIndex;
  if (state.placedFlags[fleetIdx]) {
    const next = state.placedFlags.findIndex(p => !p);
    if (next === -1) return;
    state.selectedShipIndex = next;
    renderFleetList();
    return;
  }
  const size = FLEET[fleetIdx].size;
  if (!canPlace(state.playerBoard, size, r, c, state.orientation)) {
    setStatus("ここには配置できません");
    return;
  }
  placeShip(state.playerBoard, fleetIdx, r, c, state.orientation);
  state.placedFlags[fleetIdx] = true;
  const next = state.placedFlags.findIndex(p => !p);
  if (next !== -1) state.selectedShipIndex = next;
  clearPreview(els.placementCells);
  renderPlacementBoard();
  renderFleetList();
  updateStartButton();
  if (state.placedFlags.every(Boolean)) {
    setStatus("配置完了。「開始」を押してください");
  } else {
    setStatus(`${FLEET[state.selectedShipIndex].name} を配置`);
  }
}

function resetPlacement() {
  state.playerBoard = emptyBoard();
  state.placedFlags = FLEET.map(() => false);
  state.selectedShipIndex = 0;
  state.orientation = "h";
  els.btnOrientation.textContent = "向き切替: 横";
  clearPreview(els.placementCells);
  renderPlacementBoard();
  renderFleetList();
  updateStartButton();
  setStatus("艦を配置してください");
}

function randomPlacePlayer() {
  randomPlace(state.playerBoard);
  state.placedFlags = FLEET.map(() => true);
  state.selectedShipIndex = 0;
  clearPreview(els.placementCells);
  renderPlacementBoard();
  renderFleetList();
  updateStartButton();
  setStatus("配置完了。「開始」を押してください");
}

function toggleOrientation() {
  state.orientation = state.orientation === "h" ? "v" : "h";
  els.btnOrientation.textContent = `向き切替: ${state.orientation === "h" ? "横" : "縦"}`;
}

/* -------- Combat -------- */

function attack(board, r, c) {
  const key = cellKey(r, c);
  if (board.shots.has(key)) return { result: "already" };
  board.shots.add(key);
  const ship = board.ships.find(s => s.cells.some(([sr, sc]) => sr === r && sc === c));
  if (!ship) return { result: "miss" };
  board.hits.add(key);
  ship.hits.add(key);
  if (ship.hits.size === ship.size) {
    ship.sunk = true;
    return { result: "sunk", ship };
  }
  return { result: "hit", ship };
}

function isAllSunk(board) {
  return board.ships.length > 0 && board.ships.every(s => s.sunk);
}

/* -------- Player turn -------- */

function onEnemyClick(r, c) {
  if (state.phase !== PHASE_PLAYING || state.busy) return;
  const key = cellKey(r, c);
  if (state.enemyBoard.shots.has(key)) return;
  const res = attack(state.enemyBoard, r, c);
  renderEnemyBoard();
  if (res.result === "sunk") {
    setStatus(`命中！ ${res.ship.name} を撃沈`);
  } else if (res.result === "hit") {
    setStatus("命中！");
  } else {
    setStatus("外れ");
  }
  if (isAllSunk(state.enemyBoard)) {
    endGame(true);
    return;
  }
  state.busy = true;
  els.aiIndicator.hidden = false;
  setTimeout(aiTurn, 600);
}

/* -------- AI turn -------- */

function neighbors(r, c) {
  return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([rr,cc]) => inBounds(rr, cc));
}

function aiPickHunt(board) {
  // Parity hunt: prefer cells where (r+c) is even, since smallest ship is size 2
  const candidates = [];
  const parityCandidates = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const key = cellKey(r, c);
      if (board.shots.has(key)) continue;
      candidates.push([r, c]);
      if ((r + c) % 2 === 0) parityCandidates.push([r, c]);
    }
  }
  const pool = parityCandidates.length > 0 ? parityCandidates : candidates;
  return pool[Math.floor(Math.random() * pool.length)];
}

function aiTurn() {
  const board = state.playerBoard;
  const ai = state.aiState;

  // Drain queue of already-shot cells
  while (ai.queue.length > 0) {
    const [qr, qc] = ai.queue[0];
    if (board.shots.has(cellKey(qr, qc))) ai.queue.shift();
    else break;
  }
  if (ai.mode === "target" && ai.queue.length === 0) {
    ai.mode = "hunt";
    ai.firstHit = null;
    ai.direction = null;
  }

  let r, c;
  if (ai.mode === "target" && ai.queue.length > 0) {
    [r, c] = ai.queue.shift();
  } else {
    [r, c] = aiPickHunt(board);
  }

  const res = attack(board, r, c);

  if (res.result === "miss") {
    setStatus("CPU: 外れ");
  } else if (res.result === "hit") {
    setStatus("CPU: 命中…");
    if (ai.mode === "hunt") {
      ai.mode = "target";
      ai.firstHit = [r, c];
      ai.queue = neighbors(r, c).filter(([rr, cc]) => !board.shots.has(cellKey(rr, cc)));
    } else {
      // Continue along discovered direction if possible
      if (ai.firstHit) {
        const [fr, fc] = ai.firstHit;
        const dr = Math.sign(r - fr);
        const dc = Math.sign(c - fc);
        if (dr !== 0 || dc !== 0) {
          const nr = r + dr, nc = c + dc;
          if (inBounds(nr, nc) && !board.shots.has(cellKey(nr, nc))) {
            ai.queue.unshift([nr, nc]);
          }
          // Also queue opposite direction from firstHit in case ship extends the other way
          const br = fr - dr, bc = fc - dc;
          if (inBounds(br, bc) && !board.shots.has(cellKey(br, bc))) {
            ai.queue.push([br, bc]);
          }
        }
      }
    }
  } else if (res.result === "sunk") {
    setStatus(`CPU: ${res.ship.name} を撃沈`);
    ai.mode = "hunt";
    ai.queue = [];
    ai.firstHit = null;
    ai.direction = null;
  }

  renderOwnBoard();

  if (isAllSunk(state.playerBoard)) {
    state.busy = false;
    els.aiIndicator.hidden = true;
    endGame(false);
    return;
  }

  // Standard rules: each side fires once per turn (no extra shot on hit)
  state.busy = false;
  els.aiIndicator.hidden = true;
  renderEnemyBoard();
}

/* -------- Game flow -------- */

function startGame() {
  randomPlace(state.enemyBoard);
  setPhase(PHASE_PLAYING);
  setStatus("あなたのターン。敵陣を攻撃してください");
  renderEnemyBoard();
  renderOwnBoard();
}

function endGame(playerWon) {
  setPhase(PHASE_ENDED);
  els.resultMessage.textContent = playerWon ? "勝利！全敵艦を撃沈しました" : "敗北… 自陣が全滅しました";
  els.resultMessage.classList.toggle("win", playerWon);
  els.resultMessage.classList.toggle("lose", !playerWon);
}

function restart() {
  state = newGameState();
  els.btnOrientation.textContent = "向き切替: 横";
  setPhase(PHASE_PLACEMENT);
  els.aiIndicator.hidden = true;
  els.resultMessage.classList.remove("win", "lose");
  renderPlacementBoard();
  renderFleetList();
  updateStartButton();
  setStatus("艦を配置してください");
}

/* -------- Init -------- */

function init() {
  els.status         = $("status");
  els.fleetList      = $("fleet-list");
  els.btnOrientation = $("btn-orientation");
  els.btnRandom      = $("btn-random");
  els.btnReset       = $("btn-reset");
  els.btnStart       = $("btn-start");
  els.btnRestart     = $("btn-restart");
  els.aiIndicator    = $("ai-indicator");
  els.resultMessage  = $("result-message");

  els.placementCells = buildBoard("placement-board", onPlacementClick, onPlacementHover);
  els.enemyCells     = buildBoard("enemy-board", onEnemyClick, null);
  els.ownCells       = buildBoard("own-board", null, null);

  els.btnOrientation.addEventListener("click", toggleOrientation);
  els.btnRandom.addEventListener("click", randomPlacePlayer);
  els.btnReset.addEventListener("click", resetPlacement);
  els.btnStart.addEventListener("click", startGame);
  els.btnRestart.addEventListener("click", restart);

  renderPlacementBoard();
  renderFleetList();
  updateStartButton();
}

document.addEventListener("DOMContentLoaded", init);

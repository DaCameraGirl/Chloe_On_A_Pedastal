const COLS = 5;
const ROWS = 10;
const TOTAL = COLS * ROWS;
const DEFAULT_IMAGE = "Chloe.jpg";

const board = document.querySelector("#board");
const tray = document.querySelector("#tray");
const preview = document.querySelector("#preview");
const progressText = document.querySelector("#progressText");
const progressBar = document.querySelector("#progressBar");
const status = document.querySelector("#status");
const shuffleButton = document.querySelector("#shuffleButton");
const resetButton = document.querySelector("#resetButton");
const hintButton = document.querySelector("#hintButton");
const solveButton = document.querySelector("#solveButton");
const photoButton = document.querySelector("#photoButton");
const photoInput = document.querySelector("#photoInput");

let selectedPiece = null;
let currentImage = DEFAULT_IMAGE;
let objectUrl = null;

document.documentElement.style.setProperty("--cols", COLS);
document.documentElement.style.setProperty("--rows", ROWS);

function imageCss(url) {
  return `url("${url}")`;
}

function shuffle(items) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function setStatus(message, isWin = false) {
  status.textContent = message;
  status.classList.toggle("win", isWin);
}

function clearSelection() {
  if (selectedPiece) selectedPiece.classList.remove("selected");
  selectedPiece = null;
}

function selectPiece(piece) {
  if (selectedPiece === piece) {
    clearSelection();
    return;
  }
  clearSelection();
  selectedPiece = piece;
  piece.classList.add("selected");
}

function getPieceIndex(piece) {
  return Number(piece.dataset.index);
}

function getSlotIndex(slot) {
  return Number(slot.dataset.index);
}

function updatePieceState(piece) {
  const slot = piece.closest(".slot");
  const correct = slot && getSlotIndex(slot) === getPieceIndex(piece);
  piece.classList.toggle("correct", Boolean(correct));
}

function updateProgress() {
  const placed = board.querySelectorAll(".piece").length;
  const correct = [...board.querySelectorAll(".piece")].filter((piece) => {
    const slot = piece.closest(".slot");
    return slot && getSlotIndex(slot) === getPieceIndex(piece);
  }).length;

  progressText.textContent = `${placed} / ${TOTAL} placed`;
  progressBar.style.width = `${(correct / TOTAL) * 100}%`;

  if (correct === TOTAL) {
    setStatus("Chloe is back on her pedestal.", true);
    clearSelection();
  } else if (selectedPiece) {
    setStatus(`Piece ${getPieceIndex(selectedPiece) + 1} selected.`);
  } else {
    setStatus(`${correct} matched.`);
  }
}

function placePiece(piece, slot) {
  const existing = slot.querySelector(".piece");
  const origin = piece.parentElement;

  if (existing && existing !== piece) {
    origin.append(existing);
    updatePieceState(existing);
  }

  slot.append(piece);
  updatePieceState(piece);
  clearSelection();
  updateProgress();
}

function returnPiece(piece) {
  tray.append(piece);
  updatePieceState(piece);
  clearSelection();
  updateProgress();
}

function makeSlot(index) {
  const slot = document.createElement("div");
  slot.className = "slot";
  slot.dataset.index = index;
  slot.addEventListener("click", () => {
    if (selectedPiece) placePiece(selectedPiece, slot);
  });
  slot.addEventListener("dragover", (event) => {
    event.preventDefault();
    slot.classList.add("drop-target");
  });
  slot.addEventListener("dragleave", () => slot.classList.remove("drop-target"));
  slot.addEventListener("drop", (event) => {
    event.preventDefault();
    slot.classList.remove("drop-target");
    const piece = document.querySelector(`[data-piece-id="${event.dataTransfer.getData("text/plain")}"]`);
    if (piece) placePiece(piece, slot);
  });
  return slot;
}

function makePiece(index) {
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  const piece = document.createElement("button");
  piece.type = "button";
  piece.className = "piece";
  piece.draggable = true;
  piece.dataset.index = index;
  piece.dataset.pieceId = `piece-${index}`;
  piece.setAttribute("aria-label", `Puzzle piece ${index + 1}`);
  piece.style.backgroundPosition = `${(col / (COLS - 1)) * 100}% ${(row / (ROWS - 1)) * 100}%`;

  piece.addEventListener("click", (event) => {
    event.stopPropagation();
    selectPiece(piece);
    updateProgress();
  });
  piece.addEventListener("dblclick", (event) => {
    event.stopPropagation();
    returnPiece(piece);
  });
  piece.addEventListener("dragstart", (event) => {
    selectPiece(piece);
    event.dataTransfer.setData("text/plain", piece.dataset.pieceId);
    event.dataTransfer.effectAllowed = "move";
  });

  return piece;
}

function setImage(url) {
  currentImage = url;
  document.documentElement.style.setProperty("--puzzle-image", imageCss(url));
  preview.src = url;

  const probe = new Image();
  probe.onload = () => {
    const imageRatio = `${probe.naturalWidth} / ${probe.naturalHeight}`;
    const pieceRatio = (probe.naturalWidth * ROWS) / (probe.naturalHeight * COLS);
    document.documentElement.style.setProperty("--image-ratio", imageRatio);
    document.documentElement.style.setProperty("--piece-ratio", pieceRatio.toFixed(4));
  };
  probe.src = url;
}

function buildPuzzle(randomize = true) {
  board.replaceChildren();
  tray.replaceChildren();
  clearSelection();

  for (let i = 0; i < TOTAL; i += 1) {
    board.append(makeSlot(i));
  }

  const order = randomize ? shuffle([...Array(TOTAL).keys()]) : [...Array(TOTAL).keys()];
  order.forEach((index) => tray.append(makePiece(index)));
  setStatus("Ready.");
  updateProgress();
}

function solvePuzzle() {
  const pieces = [...document.querySelectorAll(".piece")];
  pieces.forEach((piece) => {
    const slot = board.querySelector(`.slot[data-index="${piece.dataset.index}"]`);
    slot.append(piece);
    updatePieceState(piece);
  });
  clearSelection();
  updateProgress();
}

function showHint() {
  board.classList.add("show-hint");
  window.setTimeout(() => board.classList.remove("show-hint"), 1800);
}

tray.addEventListener("dragover", (event) => event.preventDefault());
tray.addEventListener("drop", (event) => {
  event.preventDefault();
  const piece = document.querySelector(`[data-piece-id="${event.dataTransfer.getData("text/plain")}"]`);
  if (piece) returnPiece(piece);
});

shuffleButton.addEventListener("click", () => buildPuzzle(true));
resetButton.addEventListener("click", () => buildPuzzle(false));
hintButton.addEventListener("click", showHint);
solveButton.addEventListener("click", solvePuzzle);
photoButton.addEventListener("click", () => photoInput.click());
photoInput.addEventListener("change", () => {
  const [file] = photoInput.files;
  if (!file) return;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  setImage(objectUrl);
  buildPuzzle(true);
});

setImage(currentImage);
buildPuzzle(true);

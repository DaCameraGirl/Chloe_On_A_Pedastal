const DEFAULT_IMAGE = "assets/chloe-cartoon.jpg";
const SVG_NS = "http://www.w3.org/2000/svg";

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
const difficultySelect = document.querySelector("#difficultySelect");
const previewButton = document.querySelector("#previewButton");

let COLS = 5;
let ROWS = 5;
let TOTAL = COLS * ROWS;

let selectedPiece = null;
let currentImage = DEFAULT_IMAGE;
let objectUrl = null;
let dragState = null;
let activeDropTarget = null;

function applyGridVars() {
  document.documentElement.style.setProperty("--cols", COLS);
  document.documentElement.style.setProperty("--rows", ROWS);
  document.documentElement.style.setProperty("--bg-size-x", `${COLS * 100}%`);
  document.documentElement.style.setProperty("--bg-size-y", `${ROWS * 100}%`);
}

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

function edgeType(index, side) {
  const row = Math.floor(index / COLS);
  const col = index % COLS;

  if ((side === "top" && row === 0) || (side === "right" && col === COLS - 1)) return 0;
  if ((side === "bottom" && row === ROWS - 1) || (side === "left" && col === 0)) return 0;

  if (side === "right") return ((row * 7 + col * 11) % 2 === 0 ? 1 : -1);
  if (side === "left") return -((row * 7 + (col - 1) * 11) % 2 === 0 ? 1 : -1);
  if (side === "bottom") return ((row * 13 + col * 5) % 2 === 0 ? 1 : -1);
  if (side === "top") return -(((row - 1) * 13 + col * 5) % 2 === 0 ? 1 : -1);
  return 0;
}

function piecePath(index) {
  const top = edgeType(index, "top");
  const right = edgeType(index, "right");
  const bottom = edgeType(index, "bottom");
  const left = edgeType(index, "left");
  const tab = 15;
  let d = "M 0 0";

  if (top === 0) d += " L 100 0";
  else {
    const y = -top * tab;
    d += ` L 34 0 C 38 0 39 ${y} 43 ${y} C 47 ${y * 1.25} 53 ${y * 1.25} 57 ${y} C 61 ${y} 62 0 66 0 L 100 0`;
  }

  if (right === 0) d += " L 100 100";
  else {
    const x = 100 + right * tab;
    d += ` L 100 34 C 100 38 ${x} 39 ${x} 43 C ${x * 1.01} 47 ${x * 1.01} 53 ${x} 57 C ${x} 61 100 62 100 66 L 100 100`;
  }

  if (bottom === 0) d += " L 0 100";
  else {
    const y = 100 + bottom * tab;
    d += ` L 66 100 C 62 100 61 ${y} 57 ${y} C 53 ${y * 1.01} 47 ${y * 1.01} 43 ${y} C 39 ${y} 38 100 34 100 L 0 100`;
  }

  if (left === 0) d += " L 0 0";
  else {
    const x = -left * tab;
    d += ` L 0 66 C 0 62 ${x} 61 ${x} 57 C ${x} 53 ${x} 47 ${x} 43 C ${x} 39 0 38 0 34 L 0 0`;
  }

  return `${d} Z`;
}

function renderPieceArt(piece) {
  const index = getPieceIndex(piece);
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  const clipId = `piece-clip-${index}-${Math.random().toString(36).slice(2)}`;
  const pathData = piecePath(index);

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "-18 -18 136 136");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");

  const defs = document.createElementNS(SVG_NS, "defs");
  const clipPath = document.createElementNS(SVG_NS, "clipPath");
  clipPath.setAttribute("id", clipId);
  clipPath.setAttribute("clipPathUnits", "userSpaceOnUse");
  const clipShape = document.createElementNS(SVG_NS, "path");
  clipShape.setAttribute("d", pathData);
  clipPath.append(clipShape);
  defs.append(clipPath);

  // solid backing so board background / preview doesn't bleed through indentations
  const backing = document.createElementNS(SVG_NS, "path");
  backing.setAttribute("d", pathData);
  backing.setAttribute("fill", "#f7f3ea");

  const image = document.createElementNS(SVG_NS, "image");
  image.setAttribute("href", currentImage);
  image.setAttribute("x", String(-col * 100));
  image.setAttribute("y", String(-row * 100));
  image.setAttribute("width", String(COLS * 100));
  image.setAttribute("height", String(ROWS * 100));
  image.setAttribute("preserveAspectRatio", "none");
  image.setAttribute("clip-path", `url(#${clipId})`);
  image.style.imageRendering = "-webkit-optimize-contrast";

  const edge = document.createElementNS(SVG_NS, "path");
  edge.setAttribute("d", pathData);
  edge.setAttribute("fill", "none");
  edge.setAttribute("stroke", "rgba(35, 27, 22, 0.78)");
  edge.setAttribute("stroke-width", "2.4");
  edge.setAttribute("stroke-linejoin", "round");

  const shine = document.createElementNS(SVG_NS, "path");
  shine.setAttribute("d", pathData);
  shine.setAttribute("fill", "none");
  shine.setAttribute("stroke", "rgba(255, 250, 240, 0.62)");
  shine.setAttribute("stroke-width", "0.9");
  shine.setAttribute("stroke-linejoin", "round");

  svg.append(defs, backing, image, edge, shine);
  piece.replaceChildren(svg);
}

function updatePieceState(piece) {
  const slot = piece.closest(".slot");
  const correct = slot && getSlotIndex(slot) === getPieceIndex(piece);
  piece.classList.toggle("correct", Boolean(correct));
  if (slot) {
    slot.classList.toggle("filled", true);
    if (correct) {
      piece.classList.add("snap");
      setTimeout(() => piece.classList.remove("snap"), 550);
    }
  }
}

function updateProgress() {
  const placed = board.querySelectorAll(".piece").length;
  const correct = [...board.querySelectorAll(".piece")].filter((piece) => {
    const slot = piece.closest(".slot");
    return slot && getSlotIndex(slot) === getPieceIndex(piece);
  }).length;

  progressText.textContent = `${placed} / ${TOTAL} placed`;
  progressBar.style.width = `${(correct / TOTAL) * 100}%`;

  const isComplete = correct === TOTAL;
  board.classList.toggle("is-complete", isComplete);
  tray.classList.toggle("is-empty", tray.querySelectorAll(".piece").length === 0);

  if (isComplete) {
    setStatus("Chloe is back on her pedestal.", true);
    clearSelection();
  } else if (selectedPiece) {
    setStatus(`Piece ${getPieceIndex(selectedPiece) + 1} selected.`);
  } else {
    setStatus(`${correct} matched.`);
  }
}

function placePiece(piece, slot, swapTarget = piece.parentElement) {
  const pieceIdx = getPieceIndex(piece);
  const slotIdx = getSlotIndex(slot);
  const origin = swapTarget || piece.parentElement;

  // Only allow correct placement
  if (pieceIdx !== slotIdx) {
    piece.classList.add("wrong");
    setTimeout(() => piece.classList.remove("wrong"), 400);
    setStatus("Not quite — that's piece " + (pieceIdx + 1) + "!", false);
    return false;
  }

  const existing = slot.querySelector(".piece");

  if (existing && existing !== piece && origin) {
    origin.append(existing);
    updatePieceState(existing);
    if (origin.classList && origin.classList.contains("slot")) {
      origin.classList.remove("filled");
    }
  }

  slot.append(piece);
  updatePieceState(piece);
  clearSelection();
  updateProgress();
  return true;
}

function returnPiece(piece) {
  const origin = piece.parentElement;
  tray.append(piece);
  if (origin && origin.classList && origin.classList.contains("slot")) {
    origin.classList.remove("filled");
  }
  piece.classList.remove("correct");
  clearSelection();
  updateProgress();
}

function makeSlotGhost(index) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "-18 -18 136 136");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "slot-ghost");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", piecePath(index));
  svg.append(path);
  return svg;
}

function makeSlot(index) {
  const slot = document.createElement("div");
  slot.className = "slot";
  slot.dataset.index = index;
  slot.append(makeSlotGhost(index));
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

function clearDropTarget() {
  if (activeDropTarget) activeDropTarget.classList.remove("drop-target");
  activeDropTarget = null;
}

function setDropTarget(target) {
  if (activeDropTarget === target) return;
  clearDropTarget();
  if (target) {
    activeDropTarget = target;
    activeDropTarget.classList.add("drop-target");
  }
}

function styleDraggedPiece(piece, rect) {
  piece.classList.add("dragging");
  piece.style.position = "fixed";
  piece.style.left = `${rect.left}px`;
  piece.style.top = `${rect.top}px`;
  piece.style.width = `${rect.width}px`;
  piece.style.height = `${rect.height}px`;
  piece.style.zIndex = "1000";
  piece.style.pointerEvents = "none";
}

function clearDraggedPieceStyle(piece) {
  piece.classList.remove("dragging");
  piece.style.position = "";
  piece.style.left = "";
  piece.style.top = "";
  piece.style.width = "";
  piece.style.height = "";
  piece.style.zIndex = "";
  piece.style.pointerEvents = "";
}

function moveDraggedPiece(event) {
  if (!dragState) return;
  const { piece, rect, offsetX, offsetY } = dragState;
  piece.style.left = `${event.clientX - offsetX}px`;
  piece.style.top = `${event.clientY - offsetY}px`;
  piece.style.width = `${rect.width}px`;
  piece.style.height = `${rect.height}px`;

  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".slot");
  setDropTarget(target);
}

function bindPointerDragListeners() {
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
  window.addEventListener("pointercancel", handlePointerCancel);
}

function unbindPointerDragListeners() {
  window.removeEventListener("pointermove", handlePointerMove);
  window.removeEventListener("pointerup", handlePointerUp);
  window.removeEventListener("pointercancel", handlePointerCancel);
}

function startPointerDrag(event, piece) {
  if (event.button !== undefined && event.button !== 0) return;

  const rect = piece.getBoundingClientRect();
  dragState = {
    piece,
    origin: piece.parentElement,
    placeholder: null,
    startX: event.clientX,
    startY: event.clientY,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    rect,
    dragging: false,
    pointerId: event.pointerId,
  };

  piece.setPointerCapture?.(event.pointerId);
  bindPointerDragListeners();
}

function beginDrag(event) {
  if (!dragState || dragState.dragging) return;

  const { piece, origin, rect } = dragState;
  const placeholder = document.createElement("div");
  placeholder.className = "piece-placeholder";
  origin.insertBefore(placeholder, piece);
  document.body.append(piece);
  dragState.placeholder = placeholder;
  dragState.dragging = true;
  clearSelection();
  styleDraggedPiece(piece, rect);
  moveDraggedPiece(event);
}

function endPointerDrag(event, canceled = false) {
  if (!dragState) return;

  const { piece, origin, placeholder, dragging, pointerId } = dragState;
  unbindPointerDragListeners();
  if (pointerId !== undefined) piece.releasePointerCapture?.(pointerId);

  if (!dragging) {
    dragState = null;
    return;
  }

  const hoveredSlot = activeDropTarget;
  clearDropTarget();
  clearDraggedPieceStyle(piece);
  piece.dataset.justDragged = "true";
  window.setTimeout(() => delete piece.dataset.justDragged, 0);

  const element = canceled ? null : document.elementFromPoint(event.clientX, event.clientY);
  const targetSlot = element?.closest(".slot") || hoveredSlot;
  const targetTray = element?.closest("#tray");
  const swapTarget = placeholder?.parentElement || origin;

  if (targetSlot) {
    placePiece(piece, targetSlot, swapTarget);
    placeholder?.remove();
  } else if (targetTray) {
    returnPiece(piece);
    placeholder?.remove();
  } else if (placeholder) {
    placeholder.replaceWith(piece);
    updatePieceState(piece);
    updateProgress();
  } else {
    origin.append(piece);
    updatePieceState(piece);
    updateProgress();
  }

  dragState = null;
}

function handlePointerMove(event) {
  if (!dragState) return;
  const distance = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY);
  if (!dragState.dragging && distance > 4) beginDrag(event);
  if (dragState.dragging) {
    event.preventDefault();
    moveDraggedPiece(event);
  }
}

function handlePointerUp(event) {
  endPointerDrag(event);
}

function handlePointerCancel(event) {
  endPointerDrag(event, true);
}

function makePiece(index) {
  const piece = document.createElement("button");
  piece.type = "button";
  piece.className = "piece";
  piece.draggable = false;
  piece.dataset.index = index;
  piece.dataset.pieceId = `piece-${index}`;
  piece.setAttribute("aria-label", `Puzzle piece ${index + 1}`);
  renderPieceArt(piece);

  piece.addEventListener("click", (event) => {
    event.stopPropagation();
    if (piece.dataset.justDragged) return;
    selectPiece(piece);
    updateProgress();
  });
  piece.addEventListener("dblclick", (event) => {
    event.stopPropagation();
    returnPiece(piece);
  });
  piece.addEventListener("pointerdown", (event) => startPointerDrag(event, piece));
  piece.addEventListener("dragstart", (event) => {
    selectPiece(piece);
    event.dataTransfer.setData("text/plain", piece.dataset.pieceId);
    event.dataTransfer.effectAllowed = "move";
  });

  return piece;
}

function setImage(url, rebuildPieces = true) {
  currentImage = url;
  document.documentElement.style.setProperty("--puzzle-image", imageCss(url));
  if (preview) preview.src = url;

  const probe = new Image();
  probe.onload = () => {
    const imageRatio = `${probe.naturalWidth} / ${probe.naturalHeight}`;
    const pieceRatio = (probe.naturalWidth * ROWS) / (probe.naturalHeight * COLS);
    document.documentElement.style.setProperty("--image-ratio", imageRatio);
    document.documentElement.style.setProperty("--piece-ratio", pieceRatio.toFixed(4));
    if (rebuildPieces) {
      document.querySelectorAll(".piece").forEach((piece) => renderPieceArt(piece));
    }
  };
  probe.src = url;
}

function buildPuzzle(randomize = true) {
  applyGridVars();

  // set aspect ratio from preview image before creating pieces, so they size correctly immediately
  if (preview && preview.naturalWidth) {
    const imageRatio = `${preview.naturalWidth} / ${preview.naturalHeight}`;
    const pieceRatio = (preview.naturalWidth * ROWS) / (preview.naturalHeight * COLS);
    document.documentElement.style.setProperty("--image-ratio", imageRatio);
    document.documentElement.style.setProperty("--piece-ratio", pieceRatio.toFixed(4));
  }

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
    if (slot) {
      slot.append(piece);
      updatePieceState(piece);
    }
  });
  clearSelection();
  updateProgress();
}

function showHint() {
  board.classList.add("show-hint");
  window.setTimeout(() => board.classList.remove("show-hint"), 1800);
}

function togglePreviewImage() {
  board.classList.toggle("show-preview");
  if (previewButton) {
    previewButton.textContent = board.classList.contains("show-preview") ? "Hide Preview" : "Preview";
    previewButton.classList.toggle("active", board.classList.contains("show-preview"));
  }
}

function setDifficulty(cols, rows) {
  COLS = cols;
  ROWS = rows;
  TOTAL = COLS * ROWS;
  const eyebrow = document.querySelector(".eyebrow");
  if (eyebrow) eyebrow.textContent = `${TOTAL} piece photo puzzle`;
  buildPuzzle(true);
  setImage(currentImage);
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
if (previewButton) previewButton.addEventListener("click", togglePreviewImage);
if (difficultySelect) difficultySelect.addEventListener("change", (e) => {
  const [c, r] = e.target.value.split("x").map(Number);
  setDifficulty(c, r);
});
if (photoButton) photoButton.addEventListener("click", () => photoInput.click());
if (photoInput) photoInput.addEventListener("change", () => {
  const [file] = photoInput.files;
  if (!file) return;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  setImage(objectUrl);
  buildPuzzle(true);
});

setDifficulty(5, 5);

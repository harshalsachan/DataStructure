/**
 * BST Visualizer — rendering & animation controller
 * Depends on bst.js being loaded first.
 */

/* ── Constants ─────────────────────────────────────────────── */
const NODE_R   = 22;   // circle radius (px, SVG units)
const H_SPACE  = 58;   // horizontal centre-to-centre spacing
const V_SPACE  = 80;   // vertical spacing between levels
const PADDING  = { x: 44, y: 40 };

// Animation speed: slider range 1–10 maps to MAX_ANIM_DELAY ms … MAX_ANIM_DELAY/10 ms
const MAX_ANIM_DELAY = 1520;

// Maximum number of entries retained in the operation log
const MAX_LOG_ENTRIES = 60;

// Random tree generation bounds
const MIN_RANDOM_NODES  = 6;
const RANDOM_NODE_RANGE = 8;   // actual count = random(0..RANGE) + MIN
const MIN_RANDOM_VALUE  = 5;
const RANDOM_VALUE_RANGE = 95; // values drawn from [MIN_RANDOM_VALUE .. MIN_RANDOM_VALUE + RANGE - 1]

// Scale factor applied when exporting the tree as a PNG (for HiDPI clarity)
const HIDPI_SCALE = 2;

/* ── State ──────────────────────────────────────────────────── */
const bst = new BST();
let isAnimating  = false;
let animQueue    = [];
let animTimerId  = null;
let animDelay = Math.round(MAX_ANIM_DELAY / 3);  // matches initial slider value of 3

/* ── DOM refs ────────────────────────────────────────────────── */
const svg          = document.getElementById('bst-svg');
const edgesLayer   = document.getElementById('edges-layer');
const nodesLayer   = document.getElementById('nodes-layer');
const emptyState   = document.getElementById('empty-state');

const inputEl      = document.getElementById('node-input');
const btnInsert    = document.getElementById('btn-insert');
const btnDelete    = document.getElementById('btn-delete');
const btnSearch    = document.getElementById('btn-search');
const btnInorder   = document.getElementById('btn-inorder');
const btnPreorder  = document.getElementById('btn-preorder');
const btnPostorder = document.getElementById('btn-postorder');
const btnLevel     = document.getElementById('btn-levelorder');
const btnClear     = document.getElementById('btn-clear');
const btnSample    = document.getElementById('btn-sample');
const btnRandom    = document.getElementById('btn-random');
const btnExportJSON= document.getElementById('btn-export-json');
const btnExportImg = document.getElementById('btn-export-img');
const speedSlider  = document.getElementById('speed-slider');
const themeToggle  = document.getElementById('theme-toggle');
const themeIcon    = document.getElementById('theme-icon');

const metHeight    = document.getElementById('metric-height');
const metNodes     = document.getElementById('metric-nodes');
const metBalanced  = document.getElementById('metric-balanced');
const metCmps      = document.getElementById('metric-comparisons');
const animIndicator= document.getElementById('anim-indicator');

const traversalBox = document.getElementById('traversal-result');
const opLog        = document.getElementById('op-log');
const toastContainer = document.getElementById('toast-container');

/* ════════════════════════════════════════════════════════════
   LAYOUT CALCULATION
   Assigns positions using in-order rank → x, depth → y.
   Guarantees no node overlap.
   ════════════════════════════════════════════════════════════ */
function calcPositions(root) {
  const pos = new Map();   // value → { x, y }
  let counter = 0;

  function traverse(node, depth) {
    if (!node) return;
    traverse(node.left,  depth + 1);
    pos.set(node.value, {
      x: counter * H_SPACE,
      y: depth   * V_SPACE,
    });
    counter++;
    traverse(node.right, depth + 1);
  }
  traverse(root, 0);
  return pos;
}

function svgDims(pos) {
  if (!pos.size) return { w: 400, h: 280 };
  let maxX = 0, maxY = 0;
  pos.forEach(({ x, y }) => {
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  });
  return {
    w: maxX + NODE_R * 2 + PADDING.x * 2,
    h: maxY + NODE_R * 2 + PADDING.y * 2,
  };
}

/* ════════════════════════════════════════════════════════════
   RENDERING
   highlightMap: Map<value, cssStateClass>
   edgeHighlights: Set<"parentVal-childVal"> (optional)
   ════════════════════════════════════════════════════════════ */
function renderTree(highlightMap = new Map(), edgeHighlights = new Set()) {
  const pos = calcPositions(bst.root);
  const { w, h } = svgDims(pos);

  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width',  '100%');
  svg.setAttribute('height', '100%');

  edgesLayer.innerHTML = '';
  nodesLayer.innerHTML = '';

  if (!pos.size) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  // Draw edges first (so they appear behind nodes)
  drawEdges(bst.root, pos, edgeHighlights);
  drawNodes(bst.root, pos, highlightMap);
}

function drawEdges(root, pos, edgeHighlights) {
  function walk(node) {
    if (!node) return;
    [node.left, node.right].forEach(child => {
      if (!child) return;
      const p = pos.get(node.value);
      const c = pos.get(child.value);
      const key1 = `${node.value}-${child.value}`;
      const key2 = `${child.value}-${node.value}`;
      const hl = edgeHighlights.has(key1) || edgeHighlights.has(key2);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', p.x + PADDING.x);
      line.setAttribute('y1', p.y + PADDING.y);
      line.setAttribute('x2', c.x + PADDING.x);
      line.setAttribute('y2', c.y + PADDING.y);
      line.setAttribute('class', 'edge-line' + (hl ? ' edge-highlighted' : ''));
      edgesLayer.appendChild(line);
      walk(child);
    });
  }
  walk(root);
}

function drawNodes(root, pos, highlightMap) {
  function walk(node) {
    if (!node) return;
    const { x, y } = pos.get(node.value);
    const state = highlightMap.get(node.value) || '';
    createNodeEl(node.value, x + PADDING.x, y + PADDING.y, state, node);
    walk(node.left);
    walk(node.right);
  }
  walk(root);
}

function createNodeEl(value, cx, cy, stateClass, node) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', `node-group ${stateClass}`);
  g.setAttribute('transform', `translate(${cx},${cy})`);
  g.setAttribute('data-value', value);

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('r', NODE_R);
  circle.setAttribute('class', 'node-circle');

  const label = String(value);
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('class', 'node-text');
  text.setAttribute('font-size', label.length > 3 ? '9' : label.length > 2 ? '11' : '13');
  text.textContent = value;

  // Tooltip
  const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
  title.textContent = buildTooltip(value, node);

  g.appendChild(title);
  g.appendChild(circle);
  g.appendChild(text);
  nodesLayer.appendChild(g);
  return g;
}

function buildTooltip(value, node) {
  const parts = [`Value: ${value}`];
  if (node) {
    parts.push(`Left: ${node.left  ? node.left.value  : 'null'}`);
    parts.push(`Right: ${node.right ? node.right.value : 'null'}`);
  }
  return parts.join('\n');
}

/* ════════════════════════════════════════════════════════════
   ANIMATION QUEUE
   ════════════════════════════════════════════════════════════ */
function enqueue(fn) { animQueue.push(fn); }

function runQueue() {
  if (isAnimating) return;
  isAnimating = true;
  setUI(true);
  step();
}

function step() {
  if (!animQueue.length) {
    isAnimating = false;
    setUI(false);
    return;
  }
  const fn = animQueue.shift();
  fn();
  animTimerId = setTimeout(step, animDelay);
}

function cancelQueue() {
  clearTimeout(animTimerId);
  animQueue = [];
  isAnimating = false;
  setUI(false);
}

function setUI(disabled) {
  [btnInsert, btnDelete, btnSearch,
   btnInorder, btnPreorder, btnPostorder, btnLevel,
   btnClear, btnSample, btnRandom].forEach(b => { b.disabled = disabled; });
  animIndicator.classList.toggle('visible', disabled);
}

/* ════════════════════════════════════════════════════════════
   METRICS
   ════════════════════════════════════════════════════════════ */
function updateMetrics(comparisons) {
  const h = bst.height();
  const n = bst.size();
  const bal = n > 0 ? bst.isBalanced() : null;

  metHeight.textContent = h || '—';
  metNodes.textContent  = n || '—';

  if (bal === null) {
    metBalanced.textContent = '—';
    metBalanced.className = 'metric-value';
  } else {
    metBalanced.textContent = bal ? 'Yes' : 'No';
    metBalanced.className = `metric-value ${bal ? 'yes' : 'no'}`;
  }

  if (comparisons !== undefined) {
    metCmps.textContent = comparisons;
  }
}

/* ════════════════════════════════════════════════════════════
   OPERATION LOG
   ════════════════════════════════════════════════════════════ */
function log(msg, type = 'info') {
  const d = document.createElement('div');
  d.className = `log-entry ${type}`;
  const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  d.textContent = `[${t}] ${msg}`;
  opLog.insertBefore(d, opLog.firstChild);
  while (opLog.children.length > MAX_LOG_ENTRIES) opLog.removeChild(opLog.lastChild);
}

/* ════════════════════════════════════════════════════════════
   TOAST
   ════════════════════════════════════════════════════════════ */
function showToast(msg, type = 'info', ms = 2600) {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  toastContainer.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

/* ════════════════════════════════════════════════════════════
   INSERT
   ════════════════════════════════════════════════════════════ */
function handleInsert() {
  const val = parseInput();
  if (val === null) return;

  const { path, inserted } = bst.insert(val);

  if (!inserted) {
    log(`${val} already exists in the tree.`, 'warning');
    // Flash the existing node
    renderTree(new Map([[val, 'state-search-found']]));
    setTimeout(() => renderTree(), 1200);
    return;
  }

  log(`Inserted ${val}. Path: ${path.join(' → ') || '(root)'}`, 'success');
  inputEl.value = '';
  updateMetrics();

  animQueue = [];

  // Step 1..n: highlight traversal path
  const visited = new Map();
  path.forEach(v => {
    enqueue(() => {
      visited.set(v, 'state-search-path');
      renderTree(new Map(visited));
    });
  });

  // Step n+1: show new node popping in
  enqueue(() => {
    const m = new Map(visited);
    m.set(val, 'state-new');
    renderTree(m);
  });

  // Final: settle to default tree
  enqueue(() => { renderTree(); updateMetrics(); });

  runQueue();
}

/* ════════════════════════════════════════════════════════════
   DELETE
   ════════════════════════════════════════════════════════════ */
function handleDelete() {
  const val = parseInput();
  if (val === null) return;

  // Find the path BEFORE modifying the tree
  const { found, path } = bst.search(val);

  if (!found) {
    log(`${val} not found in the tree.`, 'error');
    animateFailedSearch(path);
    return;
  }

  log(`Deleting ${val}. Path: ${path.join(' → ')}`, 'success');
  inputEl.value = '';

  animQueue = [];
  const visited = new Map();

  // Animate search path to target
  path.forEach((v, i) => {
    enqueue(() => {
      visited.set(v, i === path.length - 1 ? 'state-deleting' : 'state-search-path');
      renderTree(new Map(visited));
    });
  });

  // Now actually delete & render result
  enqueue(() => {
    bst.delete(val);
    renderTree();
    updateMetrics();
    showToast(`Deleted ${val}`, 'success');
  });

  runQueue();
}

/* ════════════════════════════════════════════════════════════
   SEARCH
   ════════════════════════════════════════════════════════════ */
function handleSearch() {
  const val = parseInput();
  if (val === null) return;

  const { found, path, comparisons } = bst.search(val);
  metCmps.textContent = comparisons;

  if (found) {
    log(`Found ${val} in ${comparisons} comparison(s). Path: ${path.join(' → ')}`, 'success');
    showToast(`✔ Found ${val} (${comparisons} comparison${comparisons !== 1 ? 's' : ''})`, 'success');
  } else {
    log(`${val} not found after ${comparisons} comparison(s). Path: ${path.join(' → ')}`, 'error');
    showToast(`✘ ${val} not found (${comparisons} comparison${comparisons !== 1 ? 's' : ''})`, 'error');
  }

  animQueue = [];
  const edgeHl = new Set();
  const visited = new Map();

  path.forEach((v, i) => {
    enqueue(() => {
      if (i > 0) {
        edgeHl.add(`${path[i-1]}-${v}`);
      }
      const isTarget = i === path.length - 1;
      const stateClass = isTarget
        ? (found ? 'state-search-found' : 'state-search-miss')
        : 'state-search-path';
      visited.set(v, stateClass);
      renderTree(new Map(visited), new Set(edgeHl));
    });
  });

  // Reset
  enqueue(() => { renderTree(); });

  runQueue();
}

function animateFailedSearch(path) {
  animQueue = [];
  const visited = new Map();
  path.forEach(v => {
    enqueue(() => {
      visited.set(v, 'state-search-path');
      renderTree(new Map(visited));
    });
  });
  if (path.length) {
    enqueue(() => {
      visited.set(path[path.length - 1], 'state-search-miss');
      renderTree(new Map(visited));
    });
  }
  enqueue(() => renderTree());
  runQueue();
}

/* ════════════════════════════════════════════════════════════
   TRAVERSALS
   ════════════════════════════════════════════════════════════ */
function handleTraversal(type) {
  const sequences = {
    inorder:    { fn: () => bst.inorder(),    name: 'Inorder (L → Root → R)' },
    preorder:   { fn: () => bst.preorder(),   name: 'Preorder (Root → L → R)' },
    postorder:  { fn: () => bst.postorder(),  name: 'Postorder (L → R → Root)' },
    levelorder: { fn: () => bst.levelOrder(), name: 'Level-Order (BFS)' },
  };

  const { fn, name } = sequences[type];
  const seq = fn();

  if (!seq.length) { showToast('Tree is empty!', 'info'); return; }

  log(`${name}: [${seq.join(', ')}]`, 'info');

  // Reset result box
  traversalBox.innerHTML = '';

  animQueue = [];
  const visited = new Map();

  seq.forEach((v, i) => {
    enqueue(() => {
      // Mark previous "current" as visited
      if (i > 0) visited.set(seq[i - 1], 'state-trav-visited');
      visited.set(v, 'state-trav-current');
      renderTree(new Map(visited));

      // Add badge to result
      const badge = document.createElement('span');
      badge.className = 'step-badge current';
      badge.id = `badge-${i}`;
      badge.textContent = v;
      traversalBox.appendChild(badge);

      // Mark previous badge as visited
      if (i > 0) {
        const prev = document.getElementById(`badge-${i - 1}`);
        if (prev) prev.className = 'step-badge visited';
      }
    });
  });

  // Final: mark last badge visited + keep visited tree briefly
  enqueue(() => {
    const last = document.getElementById(`badge-${seq.length - 1}`);
    if (last) last.className = 'step-badge visited';
    // Show all visited
    seq.forEach(v => visited.set(v, 'state-trav-visited'));
    renderTree(new Map(visited));
  });

  // Reset tree colours (keep badges)
  enqueue(() => renderTree());

  runQueue();
}

/* ════════════════════════════════════════════════════════════
   UTILITIES
   ════════════════════════════════════════════════════════════ */
function handleClear() {
  cancelQueue();
  bst.clear();
  renderTree();
  updateMetrics();
  metCmps.textContent = '—';
  traversalBox.innerHTML = '<span class="placeholder">Run a traversal to see results…</span>';
  log('Tree cleared.', 'info');
}

function handleSampleTree() {
  cancelQueue();
  bst.clear();
  [50, 30, 70, 20, 40, 60, 80, 10, 25, 35, 45].forEach(v => bst.insert(v));
  renderTree();
  updateMetrics();
  log('Loaded sample tree: [50, 30, 70, 20, 40, 60, 80, 10, 25, 35, 45]', 'info');
}

function handleRandomTree() {
  cancelQueue();
  bst.clear();
  const count = Math.floor(Math.random() * RANDOM_NODE_RANGE) + MIN_RANDOM_NODES;
  const pool = new Set();
  while (pool.size < count) pool.add(Math.floor(Math.random() * RANDOM_VALUE_RANGE) + MIN_RANDOM_VALUE);
  pool.forEach(v => bst.insert(v));
  renderTree();
  updateMetrics();
  log(`Random tree generated (${count} nodes): [${[...pool].join(', ')}]`, 'info');
}

/* ── Export JSON ─────────────────────────────────────────────── */
function handleExportJSON() {
  if (!bst.size()) { showToast('Tree is empty!', 'info'); return; }
  const json = bst.toJSON();
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  downloadFile(url, 'bst-tree.json');
  URL.revokeObjectURL(url);
  log('Tree exported as JSON.', 'success');
  showToast('JSON downloaded', 'success');
}

/* ── Export Image ────────────────────────────────────────────── */
function handleExportImage() {
  if (!bst.size()) { showToast('Tree is empty!', 'info'); return; }

  const svgEl = document.getElementById('bst-svg');

  // Clone SVG and bake in computed styles for portability
  const clone = svgEl.cloneNode(true);
  const vb = svgEl.viewBox.baseVal;
  const W = Math.max(vb.width,  400);
  const H = Math.max(vb.height, 300);
  clone.setAttribute('width',  W);
  clone.setAttribute('height', H);

  // Bake fill/stroke from computed styles
  const origEls  = svgEl.querySelectorAll('.node-circle, .node-text, .edge-line, .edge-highlighted');
  const cloneEls = clone.querySelectorAll('.node-circle, .node-text, .edge-line, .edge-highlighted');
  origEls.forEach((el, i) => {
    const cs = getComputedStyle(el);
    ['fill', 'stroke', 'stroke-width', 'font-size', 'font-weight', 'opacity'].forEach(prop => {
      const val = cs.getPropertyValue(prop);
      if (val) cloneEls[i].style[prop] = val;
    });
  });

  // Add background rect
  const isDark = document.documentElement.dataset.theme === 'dark';
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('x', 0); bg.setAttribute('y', 0);
  bg.setAttribute('width', W); bg.setAttribute('height', H);
  bg.setAttribute('fill', isDark ? '#1a202c' : '#f0f4f8');
  clone.insertBefore(bg, clone.firstChild);

  const svgStr = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width  = W * HIDPI_SCALE;   // 2× for HiDPI
    canvas.height = H * HIDPI_SCALE;
    const ctx = canvas.getContext('2d');
    ctx.scale(HIDPI_SCALE, HIDPI_SCALE);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    canvas.toBlob(blob => {
      const pngUrl = URL.createObjectURL(blob);
      downloadFile(pngUrl, 'bst-tree.png');
      URL.revokeObjectURL(pngUrl);
      log('Tree exported as PNG.', 'success');
      showToast('Image downloaded', 'success');
    }, 'image/png');
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    showToast('Export failed — try again.', 'error');
  };
  img.src = url;
}

function downloadFile(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ── Theme toggle ────────────────────────────────────────────── */
function toggleTheme() {
  const isDark = document.documentElement.dataset.theme === 'dark';
  document.documentElement.dataset.theme = isDark ? 'light' : 'dark';
  themeIcon.textContent = isDark ? '🌙' : '☀️';
  renderTree();   // refresh SVG colours
}

/* ── Input helper ────────────────────────────────────────────── */
function parseInput() {
  const raw = inputEl.value.trim();
  if (raw === '') { showToast('Enter a value first!', 'info'); return null; }
  const v = Number(raw);
  if (!Number.isInteger(v) || v < -9999 || v > 9999) {
    showToast('Enter an integer between -9999 and 9999.', 'error');
    return null;
  }
  return v;
}

/* ════════════════════════════════════════════════════════════
   EVENT LISTENERS
   ════════════════════════════════════════════════════════════ */
btnInsert .addEventListener('click', handleInsert);
btnDelete .addEventListener('click', handleDelete);
btnSearch .addEventListener('click', handleSearch);

btnInorder  .addEventListener('click', () => handleTraversal('inorder'));
btnPreorder .addEventListener('click', () => handleTraversal('preorder'));
btnPostorder.addEventListener('click', () => handleTraversal('postorder'));
btnLevel    .addEventListener('click', () => handleTraversal('levelorder'));

btnClear    .addEventListener('click', handleClear);
btnSample   .addEventListener('click', handleSampleTree);
btnRandom   .addEventListener('click', handleRandomTree);

btnExportJSON.addEventListener('click', handleExportJSON);
btnExportImg .addEventListener('click', handleExportImage);

themeToggle.addEventListener('click', toggleTheme);

speedSlider.addEventListener('input', () => {
  // slider: 1 (slow=1400ms) … 10 (fast=120ms)
  animDelay = Math.round(MAX_ANIM_DELAY / Number(speedSlider.value));
});

inputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter') handleInsert();
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (document.activeElement === inputEl) return;
  if (e.key === 'Escape') cancelQueue();
});

/* ════════════════════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════════════════════ */
renderTree();
updateMetrics();
log('Welcome to BST Visualizer 🎉  Insert values or try a sample tree!', 'info');

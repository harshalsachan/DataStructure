/* ═══════════════════════════════════════════════════════════════
   BST Visualizer — bst.js
   Fully animated, interactive Binary Search Tree visualizer
   using an HTML5 Canvas + async/await animation engine.
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ═══════════════════════════════════════
   1. BSTNode — tree node + visual state
   ═══════════════════════════════════════ */
class BSTNode {
  constructor(value) {
    this.value = value;
    this.left  = null;
    this.right = null;

    /* Visual properties (managed by Visualizer) */
    this.x       = 0;      // current canvas X
    this.y       = 0;      // current canvas Y
    this.targetX = 0;      // spring target X
    this.targetY = 0;      // spring target Y
    this.vx      = 0;      // spring velocity X
    this.vy      = 0;      // spring velocity Y

    this.state   = 'normal'; // normal | comparing | found | new | deleting | traversal | path
    this.alpha   = 1;        // 0–1  (used for fade-out during deletion)
    this.scale   = 1;        // used for pop-in animation
    this._iidx   = 0;        // in-order index (layout helper)
  }
}

/* ═══════════════════════════════════════
   2. BST — binary search tree operations
   ═══════════════════════════════════════ */
class BST {
  constructor() {
    this.root      = null;
    this.nodeCount = 0;
  }

  /* ── Insert ──────────────────────────── */
  insert(value) {
    const path = [];
    const node = new BSTNode(value);

    if (!this.root) {
      this.root = node;
      this.nodeCount++;
      return { success: true, duplicate: false, path, newNode: node };
    }

    let curr = this.root;
    for (;;) {
      path.push(curr);
      if (value === curr.value)
        return { success: false, duplicate: true, path, newNode: null };

      if (value < curr.value) {
        if (!curr.left) {
          curr.left = node;
          this.nodeCount++;
          return { success: true, duplicate: false, path, newNode: node };
        }
        curr = curr.left;
      } else {
        if (!curr.right) {
          curr.right = node;
          this.nodeCount++;
          return { success: true, duplicate: false, path, newNode: node };
        }
        curr = curr.right;
      }
    }
  }

  /* ── Search ──────────────────────────── */
  search(value) {
    const path = [];
    let curr = this.root;

    while (curr) {
      path.push(curr);
      if (value === curr.value)  return { found: true,  path, node: curr };
      curr = value < curr.value ? curr.left : curr.right;
    }
    return { found: false, path, node: null };
  }

  /* ── Delete ──────────────────────────── */
  delete(value) {
    const path = [];
    let parent  = null;
    let curr    = this.root;
    let isLeft  = false;

    while (curr && curr.value !== value) {
      path.push(curr);
      parent = curr;
      if (value < curr.value) { isLeft = true;  curr = curr.left;  }
      else                    { isLeft = false; curr = curr.right; }
    }

    if (!curr) return { success: false, path, nodeToDelete: null, successorValue: null };

    path.push(curr);
    const nodeToDelete = curr;
    let successorValue = null;

    /* Leaf */
    if (!curr.left && !curr.right) {
      this._replaceChild(parent, curr, null, isLeft);

    /* Only right child */
    } else if (!curr.left) {
      this._replaceChild(parent, curr, curr.right, isLeft);

    /* Only left child */
    } else if (!curr.right) {
      this._replaceChild(parent, curr, curr.left, isLeft);

    /* Two children — swap with in-order successor */
    } else {
      let succParent = curr;
      let succ       = curr.right;
      while (succ.left) { succParent = succ; succ = succ.left; }

      successorValue = succ.value;
      curr.value     = succ.value;

      /* Remove successor (it has at most one right child) */
      if (succParent === curr) succParent.right = succ.right;
      else                     succParent.left  = succ.right;
    }

    this.nodeCount--;
    return { success: true, path, nodeToDelete, successorValue };
  }

  _replaceChild(parent, node, replacement, isLeft) {
    if (!parent)      this.root = replacement;
    else if (isLeft)  parent.left  = replacement;
    else              parent.right = replacement;
  }

  /* ── Traversals (return ordered node arrays) ─ */
  inorder(node = this.root, out = []) {
    if (!node) return out;
    this.inorder(node.left, out);
    out.push(node);
    this.inorder(node.right, out);
    return out;
  }
  preorder(node = this.root, out = []) {
    if (!node) return out;
    out.push(node);
    this.preorder(node.left, out);
    this.preorder(node.right, out);
    return out;
  }
  postorder(node = this.root, out = []) {
    if (!node) return out;
    this.postorder(node.left, out);
    this.postorder(node.right, out);
    out.push(node);
    return out;
  }
  levelOrder() {
    if (!this.root) return [];
    const out = [], q = [this.root];
    while (q.length) {
      const n = q.shift();
      out.push(n);
      if (n.left)  q.push(n.left);
      if (n.right) q.push(n.right);
    }
    return out;
  }

  /* ── Metrics ──────────────────────────── */
  height(node = this.root) {
    if (!node) return -1;
    return 1 + Math.max(this.height(node.left), this.height(node.right));
  }
  min() {
    if (!this.root) return null;
    let n = this.root;
    while (n.left) n = n.left;
    return n.value;
  }
  max() {
    if (!this.root) return null;
    let n = this.root;
    while (n.right) n = n.right;
    return n.value;
  }
  balanceFactor(node = this.root) {
    return node ? this.height(node.left) - this.height(node.right) : 0;
  }
  isBalanced(node = this.root) {
    if (!node) return true;
    return (
      Math.abs(this.balanceFactor(node)) <= 1 &&
      this.isBalanced(node.left) &&
      this.isBalanced(node.right)
    );
  }
  toJSON(node = this.root) {
    if (!node) return null;
    return { value: node.value, left: this.toJSON(node.left), right: this.toJSON(node.right) };
  }
}

/* ═══════════════════════════════════════════════════════════
   3. BSTVisualizer — canvas rendering + animation engine
   ═══════════════════════════════════════════════════════════ */
class BSTVisualizer {
  constructor() {
    this.bst = new BST();

    /* Canvas */
    this.canvas = document.getElementById('bst-canvas');
    this.ctx    = this.canvas.getContext('2d');
    this.lw     = 0; // logical width
    this.lh     = 0; // logical height
    this.dpr    = 1;

    /* Node layout */
    this.NODE_RADIUS = 24;

    /* Animation engine */
    this.isAnimating   = false;
    this.isPaused      = false;
    this.stepMode      = false;
    this.stepResolve   = null;  // Promise resolver for step-through
    this.pauseResolve  = null;  // Promise resolver for resume
    this.speed         = 5;     // 1–10
    this.comparisons   = 0;

    /* Replay */
    this.replayFn      = null;  // () => Promise<void>

    /* Fading nodes (visually disappearing after deletion) */
    this.fadingNodes   = [];

    /* Time for pulse effect */
    this._raf = null;

    /* Highlighted nodes for reset at each step */
    this._highlighted = [];

    this._setupDOM();
    this._resizeCanvas();
    window.addEventListener('resize', () => this._resizeCanvas());

    /* Start render loop */
    this._renderLoop();
  }

  /* ══════════════════════════════════════
     CANVAS SETUP & RENDER LOOP
     ══════════════════════════════════════ */

  _resizeCanvas() {
    const wrapper = this.canvas.parentElement;
    this.dpr  = window.devicePixelRatio || 1;
    this.lw   = wrapper.clientWidth;
    this.lh   = wrapper.clientHeight;

    this.canvas.width  = Math.round(this.lw  * this.dpr);
    this.canvas.height = Math.round(this.lh  * this.dpr);
    this.canvas.style.width  = this.lw  + 'px';
    this.canvas.style.height = this.lh + 'px';

    this._calcPositions();
  }

  _renderLoop(ts = 0) {
    this._raf = requestAnimationFrame(t => this._renderLoop(t));
    this._updatePositions();
    this._draw(ts);
  }

  /* Spring physics — smoothly interpolate node positions */
  _updatePositions() {
    const SPRING  = 0.14;
    const DAMPING = 0.72;

    const update = (node) => {
      if (!node) return;
      const dx = node.targetX - node.x;
      const dy = node.targetY - node.y;
      node.vx = (node.vx + dx * SPRING) * DAMPING;
      node.vy = (node.vy + dy * SPRING) * DAMPING;
      node.x += node.vx;
      node.y += node.vy;
      update(node.left);
      update(node.right);
    };
    update(this.bst.root);

    /* Fading nodes */
    this.fadingNodes.forEach(n => { n.alpha = Math.max(0, n.alpha - 0.04); });
    this.fadingNodes = this.fadingNodes.filter(n => n.alpha > 0);
  }

  _draw(ts) {
    const { ctx } = this;
    const W = this.canvas.width;
    const H = this.canvas.height;

    /* HiDPI scale */
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    /* Background */
    const isDark = document.documentElement.classList.contains('dark');
    ctx.fillStyle = isDark ? '#090d12' : '#f0f4f9';
    ctx.fillRect(0, 0, this.lw, this.lh);

    /* Grid */
    this._drawGrid(isDark);

    if (!this.bst.root && !this.fadingNodes.length) {
      this._drawEmptyHint(isDark);
      return;
    }

    /* Edges */
    this._drawEdges(this.bst.root, isDark);

    /* Fading nodes (edges not drawn for them) */
    this.fadingNodes.forEach(n => this._drawNode(n, ts, isDark));

    /* Live nodes (level-order so children drawn on top of parent edges) */
    this.bst.levelOrder().forEach(n => this._drawNode(n, ts, isDark));
  }

  _drawGrid(isDark) {
    const { ctx } = this;
    const step = 40;
    ctx.strokeStyle = isDark ? 'rgba(48,54,61,.4)' : 'rgba(175,185,195,.35)';
    ctx.lineWidth   = 0.5;
    for (let x = 0; x < this.lw; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.lh); ctx.stroke();
    }
    for (let y = 0; y < this.lh; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.lw, y); ctx.stroke();
    }
  }

  _drawEmptyHint(isDark) {
    const { ctx } = this;
    ctx.fillStyle   = isDark ? 'rgba(125,133,144,.35)' : 'rgba(101,109,118,.35)';
    ctx.font        = '16px system-ui, sans-serif';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🌱 Insert a node to begin', this.lw / 2, this.lh / 2);
  }

  _drawEdges(node, isDark) {
    if (!node) return;
    const draw = (n) => {
      if (!n) return;
      if (n.left)  this._drawEdge(n, n.left,  isDark);
      if (n.right) this._drawEdge(n, n.right, isDark);
      draw(n.left);
      draw(n.right);
    };
    draw(node);
  }

  _drawEdge(parent, child, isDark) {
    const { ctx } = this;
    const highlighted = parent.state !== 'normal' || child.state !== 'normal';
    const base = isDark ? 'rgba(48,54,61,.9)' : 'rgba(130,140,150,.8)';
    ctx.beginPath();
    ctx.moveTo(parent.x, parent.y);
    ctx.lineTo(child.x,  child.y);
    ctx.strokeStyle = highlighted ? this._stateColor(parent.state === 'normal' ? child.state : parent.state) : base;
    ctx.lineWidth   = highlighted ? 2.5 : 1.5;
    ctx.stroke();
  }

  _drawNode(node, ts, isDark) {
    const { ctx } = this;
    const r   = this.NODE_RADIUS * node.scale;
    const x   = node.x;
    const y   = node.y;
    const col = this._nodeColors(node, isDark);

    ctx.globalAlpha = node.alpha;

    /* Glow / pulse for highlighted states */
    if (node.state !== 'normal' && node.alpha > 0.1) {
      const pulse = 0.5 + 0.5 * Math.sin(ts * 0.006);
      ctx.save();
      ctx.shadowBlur  = 18 + 12 * pulse;
      ctx.shadowColor = col.glow;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = col.fill;
      ctx.fill();
      ctx.restore();
    }

    /* Circle fill */
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);

    /* Gradient for depth */
    const grad = ctx.createRadialGradient(x - r * .3, y - r * .3, r * .05, x, y, r);
    grad.addColorStop(0, col.highlight);
    grad.addColorStop(1, col.fill);
    ctx.fillStyle = grad;
    ctx.fill();

    /* Border */
    ctx.strokeStyle = col.border;
    ctx.lineWidth   = 2.2;
    ctx.stroke();

    /* Value text */
    const fontSize = Math.max(9, Math.min(14, r * 0.65));
    ctx.fillStyle    = col.text;
    ctx.font         = `700 ${fontSize}px 'Courier New', monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.value, x, y);

    ctx.globalAlpha = 1;
  }

  /* Map state → hex color */
  _stateColor(state) {
    const map = {
      normal:    '#388bfd',
      comparing: '#d29922',
      found:     '#2ea043',
      new:       '#2ea043',
      deleting:  '#cf222e',
      traversal: '#8957e5',
      path:      '#e36209',
    };
    return map[state] || map.normal;
  }

  _nodeColors(node, isDark) {
    const s = node.state;
    const palette = {
      normal:    { fill: isDark ? '#1f6feb' : '#0969da', highlight: isDark ? '#388bfd' : '#218bff',
                   border: isDark ? '#388bfd' : '#0550ae', glow: '#388bfd', text: '#fff' },
      comparing: { fill: '#9a6700', highlight: '#d29922', border: '#bb8009',  glow: '#d29922', text: '#fff' },
      found:     { fill: '#1a7f37', highlight: '#2ea043', border: '#2ea043',  glow: '#2ea043', text: '#fff' },
      new:       { fill: '#1a7f37', highlight: '#4ac26b', border: '#2ea043',  glow: '#4ac26b', text: '#fff' },
      deleting:  { fill: '#a40e26', highlight: '#cf222e', border: '#cf222e',  glow: '#cf222e', text: '#fff' },
      traversal: { fill: '#6639ba', highlight: '#8957e5', border: '#8957e5',  glow: '#8957e5', text: '#fff' },
      path:      { fill: '#953800', highlight: '#e36209', border: '#e36209',  glow: '#e36209', text: '#fff' },
    };
    return palette[s] || palette.normal;
  }

  /* ══════════════════════════════════════
     LAYOUT — calculate node positions
     ══════════════════════════════════════ */

  _calcPositions() {
    const n = this.bst.nodeCount;
    if (!n || !this.bst.root) return;

    /* Assign in-order indices */
    let idx = 0;
    const assignIdx = (node) => {
      if (!node) return;
      assignIdx(node.left);
      node._iidx = idx++;
      assignIdx(node.right);
    };
    assignIdx(this.bst.root);

    /* Adaptive sizing */
    const h        = this.bst.height();
    const W        = this.lw   || 600;
    const H        = this.lh   || 400;
    const padding  = 36;
    const xSpacing = Math.max(38, (W - padding * 2) / Math.max(n, 1));
    const ySpacing = Math.max(52, Math.min(84, (H - 60) / Math.max(h + 1, 1)));

    this.NODE_RADIUS = Math.max(13, Math.min(24, xSpacing / 2 - 5, ySpacing / 2 - 6));

    const assignPos = (node, depth) => {
      if (!node) return;
      const tx = padding + node._iidx * xSpacing + xSpacing / 2;
      const ty = 44 + depth * ySpacing;

      node.targetX = tx;
      node.targetY = ty;

      /* Snap new nodes to parent or canvas center */
      if (node.x === 0 && node.y === 0) { node.x = tx; node.y = ty; }

      assignPos(node.left,  depth + 1);
      assignPos(node.right, depth + 1);
    };
    assignPos(this.bst.root, 0);
  }

  /* ══════════════════════════════════════
     ANIMATION ENGINE
     ══════════════════════════════════════ */

  /* Base delay (ms) per step at current speed */
  _delay() {
    /* speed 1 → 1800ms  |  speed 10 → 100ms */
    return Math.round(1900 - this.speed * 180);
  }

  /* Async sleep that respects pause and step-through mode */
  _sleep(ms) {
    return new Promise(resolve => {
      if (this.stepMode) {
        /* In step-through mode: resolve immediately but record resolver so
           the *next* call to _step() fires it. This means we pause BEFORE
           the highlight is shown until the user clicks Step. */
        this.stepResolve = resolve;
        return;
      }

      const start = Date.now();
      const tick  = () => {
        if (this.isPaused) {
          /* While paused, store the resolve so Resume can call it */
          this.pauseResolve = () => { this.pauseResolve = null; setTimeout(tick, 50); };
          return;
        }
        const elapsed = Date.now() - start;
        if (elapsed >= ms) resolve();
        else setTimeout(tick, ms - elapsed);
      };
      tick();
    });
  }

  /* Highlight nodes with state, update status, wait */
  async _highlight(nodes, state, message, duration) {
    /* Reset previously highlighted nodes */
    this._highlighted.forEach(n => { if (n) n.state = 'normal'; });
    this._highlighted = nodes.filter(Boolean);
    this._highlighted.forEach(n => { n.state = state; });

    if (message) this._setStatus(message);
    await this._sleep(duration !== undefined ? duration : this._delay());
  }

  /* Reset all node states to normal */
  _resetAll() {
    this.bst.inorder().forEach(n => { n.state = 'normal'; n.scale = 1; });
    this._highlighted = [];
  }

  /* Update metrics panel */
  _updateMetrics() {
    const b = this.bst;
    document.getElementById('m-height').textContent = b.nodeCount ? b.height() : '—';
    document.getElementById('m-nodes' ).textContent = b.nodeCount;
    document.getElementById('m-min'   ).textContent = b.nodeCount ? b.min()    : '—';
    document.getElementById('m-max'   ).textContent = b.nodeCount ? b.max()    : '—';
    document.getElementById('m-bf'    ).textContent = b.nodeCount ? b.balanceFactor() : '—';
    document.getElementById('m-cmp'   ).textContent = this.comparisons;

    const badge = document.getElementById('balance-badge');
    if (!b.nodeCount) {
      badge.textContent = 'Empty Tree';
      badge.className   = 'balance-badge neutral';
    } else if (b.isBalanced()) {
      badge.textContent = '✅ Balanced';
      badge.className   = 'balance-badge balanced';
    } else {
      badge.textContent = '⚠️ Unbalanced';
      badge.className   = 'balance-badge unbalanced';
    }
  }

  _setStatus(msg) {
    document.getElementById('status-msg').textContent = msg;
  }

  _lockUI()   { this.isAnimating = true;  this._setButtonsDisabled(true);  }
  _unlockUI() { this.isAnimating = false; this._setButtonsDisabled(false); }

  _setButtonsDisabled(disabled) {
    ['btn-insert','btn-delete','btn-search',
     'btn-inorder','btn-preorder','btn-postorder','btn-levelorder',
     'btn-random','btn-clear'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = disabled;
    });
  }

  /* ══════════════════════════════════════
     OPERATION: INSERT
     ══════════════════════════════════════ */
  async animateInsert(value) {
    if (this.isAnimating) return;
    this._lockUI();
    this.comparisons = 0;
    this._setStatus(`Inserting ${value}…`);

    /* Animate traversal manually so we can show comparisons */
    let curr    = this.bst.root;
    let prevNode = null;

    while (curr) {
      this.comparisons++;
      const dir = value < curr.value ? 'left ⬅' : value > curr.value ? 'right ➡' : 'equal';
      await this._highlight(
        [curr], 'comparing',
        `Comparing ${value} with ${curr.value}  →  go ${dir}  (cmp #${this.comparisons})`
      );
      if (value === curr.value) {
        await this._highlight([curr], 'comparing', `⚠️ ${value} already exists — no duplicates allowed.`, 1400);
        this._resetAll();
        this._unlockUI();
        this._updateMetrics();
        return;
      }
      prevNode = curr;
      curr = value < curr.value ? curr.left : curr.right;
    }

    /* Insert into BST */
    const { newNode } = this.bst.insert(value);
    if (!newNode) { this._unlockUI(); return; }

    this._calcPositions();

    /* Snap new node to parent position before spring moves it */
    if (prevNode) { newNode.x = prevNode.x; newNode.y = prevNode.y; }

    /* Pop-in scale animation */
    newNode.scale = 0;
    const STEPS = 12;
    for (let i = 1; i <= STEPS; i++) {
      newNode.scale = i / STEPS;
      await this._sleep(18);
    }
    newNode.scale = 1;

    await this._highlight(
      [newNode], 'new',
      `✅ Inserted ${value} at depth ${this.bst.height(this.bst.root) - this.bst.height(newNode) + 1}`,
      900
    );

    this._resetAll();
    this._updateMetrics();
    this._unlockUI();
  }

  /* ══════════════════════════════════════
     OPERATION: DELETE
     ══════════════════════════════════════ */
  async animateDelete(value) {
    if (this.isAnimating) return;
    this._lockUI();
    this.comparisons = 0;
    this._setStatus(`Deleting ${value}…`);

    /* Walk to the target node, animating comparisons */
    let curr   = this.bst.root;
    let target = null;

    while (curr) {
      this.comparisons++;
      await this._highlight([curr], 'comparing',
        `Comparing ${value} with ${curr.value}  (cmp #${this.comparisons})`);

      if (curr.value === value) { target = curr; break; }
      curr = value < curr.value ? curr.left : curr.right;
    }

    if (!target) {
      this._resetAll();
      await this._highlight([], 'normal', `❌ ${value} not found in tree.`, 1200);
      this._unlockUI();
      this._updateMetrics();
      return;
    }

    await this._highlight([target], 'deleting',
      `Found ${value}. Preparing to delete…`, 700);

    const hasLeft  = !!target.left;
    const hasRight = !!target.right;

    if (!hasLeft && !hasRight) {
      /* ─ Leaf ─ */
      await this._highlight([target], 'deleting', `${value} is a leaf — removing directly.`, 700);

      target.alpha = 1;
      this.fadingNodes.push(target);

      this.bst.delete(value);
      this._calcPositions();

    } else if (!hasLeft || !hasRight) {
      /* ─ One child ─ */
      const child = target.left || target.right;
      await this._highlight([target, child], 'deleting',
        `${value} has one child (${child.value}) — child takes this position.`, 900);

      target.alpha = 1;
      this.fadingNodes.push(target);

      this.bst.delete(value);
      this._calcPositions();

    } else {
      /* ─ Two children: in-order successor ─ */
      await this._highlight([target], 'deleting',
        `${value} has two children — finding in-order successor…`, 700);

      /* Walk to successor */
      let succ = target.right;
      await this._highlight([succ], 'path', 'Moving to right subtree…', 550);
      while (succ.left) {
        succ = succ.left;
        await this._highlight([succ], 'path', `Going left to find minimum… (${succ.value})`, 550);
      }

      await this._highlight([succ], 'found', `In-order successor: ${succ.value}`, 800);

      await this._highlight([target, succ], 'traversal',
        `Replacing ${target.value} with successor ${succ.value}…`, 800);

      /* Perform actual deletion (updates target.value in-place) */
      const capturedFade  = succ;
      capturedFade.alpha  = 1;

      this.bst.delete(value);          /* modifies target.value to successor */
      capturedFade.alpha  = 1;
      this.fadingNodes.push(capturedFade);

      this._calcPositions();

      await this._highlight([target], 'new',
        `${target.value} now holds the successor value. Successor node removed.`, 900);
    }

    await this._sleep(400);
    this._resetAll();
    this._updateMetrics();
    this._unlockUI();
    this._setStatus(`✅ Deleted ${value} successfully.`);
  }

  /* ══════════════════════════════════════
     OPERATION: SEARCH
     ══════════════════════════════════════ */
  async animateSearch(value) {
    if (this.isAnimating) return;
    this._lockUI();
    this.comparisons = 0;

    const pathNodes = [];
    let curr        = this.bst.root;
    let prevNode    = null;

    while (curr) {
      this.comparisons++;
      pathNodes.push(curr);

      /* Manually manage highlight so path nodes stay 'path' colored */
      this._highlighted.forEach(n => { if (n) n.state = 'normal'; });
      this._highlighted = [curr];
      curr.state = 'comparing';
      if (prevNode) prevNode.state = 'path';   // re-apply after reset

      this._setStatus(
        `Searching for ${value} — comparing with ${curr.value}  (cmp #${this.comparisons})`);
      await this._sleep(this._delay());

      if (curr.value === value) break;

      prevNode = curr;
      curr     = value < curr.value ? curr.left : curr.right;
    }

    if (curr && curr.value === value) {
      /* Re-colour path nodes orange, found node green */
      pathNodes.slice(0, -1).forEach(n => { n.state = 'path'; });
      curr.state = 'found';
      this._highlighted = [];
      this._setStatus(`🎯 Found ${value} after ${this.comparisons} comparison(s)!`);
      await this._sleep(1200);
    } else {
      /* Not found — highlight whole path red */
      pathNodes.forEach(n => { n.state = 'deleting'; });
      this._highlighted = [];
      this._setStatus(`❌ ${value} not found. Searched ${this.comparisons} node(s).`);
      await this._sleep(1300);
    }

    this._resetAll();
    this._updateMetrics();
    this._unlockUI();
  }

  /* ══════════════════════════════════════
     TRAVERSALS
     ══════════════════════════════════════ */
  async animateTraversal(type) {
    if (this.isAnimating) return;
    if (!this.bst.root) {
      this._setStatus('Tree is empty — insert nodes first.'); return;
    }
    this._lockUI();
    this.comparisons = 0;

    let nodes;
    switch (type) {
      case 'inorder':    nodes = this.bst.inorder();    break;
      case 'preorder':   nodes = this.bst.preorder();   break;
      case 'postorder':  nodes = this.bst.postorder();  break;
      case 'levelorder': nodes = this.bst.levelOrder(); break;
      default: nodes = [];
    }

    /* Show banner */
    const banner  = document.getElementById('traversal-banner');
    const label   = document.getElementById('traversal-label');
    const valsCon = document.getElementById('traversal-values');
    label.textContent = `${type.replace('order','‑order')} traversal`;
    valsCon.innerHTML = '';
    banner.classList.remove('hidden');

    /* Pre-create value pills */
    const pills = nodes.map(n => {
      const span = document.createElement('span');
      span.className   = 'tval';
      span.textContent = n.value;
      valsCon.appendChild(span);
      return span;
    });

    /* Animate each node visit */
    for (let i = 0; i < nodes.length; i++) {
      this.comparisons = i + 1;
      await this._highlight([nodes[i]], 'traversal',
        `${type}: visiting ${nodes[i].value}  (step ${i + 1}/${nodes.length})`);
      nodes[i].state = 'traversal';

      pills[i].classList.add('active');
      await this._sleep(this._delay() * 0.4);
      pills[i].classList.remove('active');
      pills[i].classList.add('done');
    }

    this._updateMetrics();
    this._resetAll();
    this._setStatus(`${type} traversal complete: [${nodes.map(n => n.value).join(', ')}]`);

    /* Keep banner visible for a moment */
    await this._sleep(1800);
    banner.classList.add('hidden');
    this._unlockUI();
  }

  /* ══════════════════════════════════════
     STEP-THROUGH & PLAYBACK CONTROLS
     ══════════════════════════════════════ */

  /** Called when user clicks "Step" button */
  step() {
    if (this.stepResolve) {
      const fn = this.stepResolve;
      this.stepResolve = null;
      fn();
    }
  }

  /** Pause / Resume */
  togglePause() {
    this.isPaused = !this.isPaused;
    const btn = document.getElementById('btn-pause');
    if (this.isPaused) {
      btn.textContent = '▶ Resume';
      this._setStatus('⏸ Animation paused.');
    } else {
      btn.textContent = '⏸ Pause';
      this._setStatus('▶ Resuming…');
      if (this.pauseResolve) this.pauseResolve();
    }
  }

  /** Replay last animated operation */
  async replay() {
    if (this.isAnimating || !this.replayFn) {
      this._setStatus('Nothing to replay yet.'); return;
    }
    this._resetAll();
    await this.replayFn();
  }

  /* ══════════════════════════════════════
     UTILITY OPERATIONS
     ══════════════════════════════════════ */

  async randomTree() {
    if (this.isAnimating) return;
    this._lockUI();
    this.bst  = new BST();
    this.fadingNodes = [];
    this.comparisons = 0;

    /* Generate 8–12 unique random values */
    const count  = 8 + Math.floor(Math.random() * 5);
    const values = new Set();
    while (values.size < count) values.add(Math.floor(Math.random() * 99) + 1);

    this._setStatus('Generating random tree…');
    this._calcPositions();
    this._unlockUI();

    for (const v of values) {
      await this.animateInsert(v);
    }
    this._setStatus(`Random tree with ${this.bst.nodeCount} nodes created.`);
  }

  clearTree() {
    if (this.isAnimating) return;
    this.bst.levelOrder().forEach(n => {
      n.alpha = 1;
      this.fadingNodes.push(n);
    });
    this.bst         = new BST();
    this.comparisons = 0;
    this.replayFn    = null;
    this._calcPositions();
    this._updateMetrics();
    this._setStatus('Tree cleared.');
    document.getElementById('traversal-banner').classList.add('hidden');
  }

  exportJSON() {
    const json = JSON.stringify(this.bst.toJSON(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'bst-tree.json';
    a.click();
    URL.revokeObjectURL(url);
    this._setStatus('Tree exported as bst-tree.json');
  }

  exportImage() {
    /* Render one clean frame to an off-screen canvas (no HiDPI multiplier needed) */
    const a    = document.createElement('a');
    a.href     = this.canvas.toDataURL('image/png');
    a.download = 'bst-tree.png';
    a.click();
    this._setStatus('Tree exported as bst-tree.png');
  }

  /* ══════════════════════════════════════
     DOM EVENT WIRING
     ══════════════════════════════════════ */
  _setupDOM() {
    /* Helper: get & trim node-input value */
    const getVal = () => {
      const v = parseInt(document.getElementById('node-input').value, 10);
      return isNaN(v) ? null : v;
    };
    const clearInput = () => { document.getElementById('node-input').value = ''; };

    /* Insert */
    document.getElementById('btn-insert').addEventListener('click', () => {
      const v = getVal();
      if (v === null) { this._setStatus('⚠️ Please enter a numeric value.'); return; }
      clearInput();
      this.replayFn = () => this.animateInsert(v);
      this.animateInsert(v);
    });

    /* Delete */
    document.getElementById('btn-delete').addEventListener('click', () => {
      const v = getVal();
      if (v === null) { this._setStatus('⚠️ Please enter a numeric value.'); return; }
      clearInput();
      this.replayFn = () => this.animateDelete(v);
      this.animateDelete(v);
    });

    /* Search */
    document.getElementById('btn-search').addEventListener('click', () => {
      const v = getVal();
      if (v === null) { this._setStatus('⚠️ Please enter a numeric value.'); return; }
      this.replayFn = () => this.animateSearch(v);
      this.animateSearch(v);
    });

    /* Allow Enter key in input */
    document.getElementById('node-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('btn-insert').click();
    });

    /* Traversals */
    ['inorder','preorder','postorder','levelorder'].forEach(t => {
      document.getElementById(`btn-${t}`).addEventListener('click', () => {
        this.replayFn = () => this.animateTraversal(t);
        this.animateTraversal(t);
      });
    });

    /* Random / Clear / Export */
    document.getElementById('btn-random'     ).addEventListener('click', () => this.randomTree());
    document.getElementById('btn-clear'      ).addEventListener('click', () => this.clearTree());
    document.getElementById('btn-export-json').addEventListener('click', () => this.exportJSON());
    document.getElementById('btn-export-img' ).addEventListener('click', () => this.exportImage());

    /* Playback controls */
    document.getElementById('btn-step'  ).addEventListener('click', () => this.step());
    document.getElementById('btn-pause' ).addEventListener('click', () => this.togglePause());
    document.getElementById('btn-replay').addEventListener('click', () => this.replay());

    /* Speed slider */
    const slider  = document.getElementById('speed-slider');
    const display = document.getElementById('speed-display');
    slider.addEventListener('input', () => {
      this.speed          = parseInt(slider.value, 10);
      display.textContent = `${this.speed}×`;
    });

    /* Step-through mode */
    document.getElementById('step-mode').addEventListener('change', e => {
      this.stepMode = e.target.checked;
      this._setStatus(this.stepMode
        ? 'Step-through mode ON — click ⏭ Step to advance.'
        : 'Step-through mode OFF.');
    });

    /* Theme toggle */
    const root       = document.documentElement;
    const themeBtn   = document.getElementById('theme-toggle');
    themeBtn.addEventListener('click', () => {
      const isDark = root.classList.toggle('dark');
      root.classList.toggle('light', !isDark);
      themeBtn.textContent = isDark ? '🌙' : '☀️';
    });

    /* Initial theme class */
    root.classList.add('dark');
  }
}

/* ═══════════════════════════════════════
   Bootstrap
   ═══════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  window._bstViz = new BSTVisualizer();
});

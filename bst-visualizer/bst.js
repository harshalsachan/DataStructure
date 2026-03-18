/**
 * Binary Search Tree — data structure implementation
 * Supports insert, delete, search, and all standard traversals.
 */

class BSTNode {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
  }
}

class BST {
  constructor() {
    this.root = null;
    this._size = 0;
  }

  /**
   * Insert a value. Returns { path, inserted }.
   * path[] = values compared on the way down (NOT including the new node).
   */
  insert(value) {
    const path = [];
    let inserted = false;
    this.root = this._insert(this.root, value, path, () => { inserted = true; });
    return { path, inserted };
  }

  _insert(node, value, path, onInsert) {
    if (!node) {
      onInsert();
      this._size++;
      return new BSTNode(value);
    }
    path.push(node.value);
    if (value < node.value) {
      node.left = this._insert(node.left, value, path, onInsert);
    } else if (value > node.value) {
      node.right = this._insert(node.right, value, path, onInsert);
    }
    // duplicate → no-op
    return node;
  }

  /**
   * Delete a value. Returns { path, deleted }.
   * path[] = values visited on the way to the target (including target).
   */
  delete(value) {
    const path = [];
    let deleted = false;
    this.root = this._delete(this.root, value, path, (flag) => { deleted = flag; });
    if (deleted) this._size--;
    return { path, deleted };
  }

  _delete(node, value, path, onResult) {
    if (!node) { onResult(false); return null; }
    path.push(node.value);
    if (value < node.value) {
      node.left = this._delete(node.left, value, path, onResult);
    } else if (value > node.value) {
      node.right = this._delete(node.right, value, path, onResult);
    } else {
      onResult(true);
      if (!node.left) return node.right;
      if (!node.right) return node.left;
      // Two children: replace with inorder successor
      let successor = node.right;
      while (successor.left) successor = successor.left;
      node.value = successor.value;
      // Delete the successor from the right subtree (no size change — counted above)
      node.right = this._deleteNode(node.right, successor.value);
    }
    return node;
  }

  /** Internal delete that doesn't track path or adjust _size (used for successor removal). */
  _deleteNode(node, value) {
    if (!node) return null;
    if (value < node.value) {
      node.left = this._deleteNode(node.left, value);
    } else if (value > node.value) {
      node.right = this._deleteNode(node.right, value);
    } else {
      if (!node.left) return node.right;
      if (!node.right) return node.left;
      let successor = node.right;
      while (successor.left) successor = successor.left;
      node.value = successor.value;
      node.right = this._deleteNode(node.right, successor.value);
    }
    return node;
  }

  /**
   * Search for a value. Returns { found, path, comparisons }.
   * path[] includes every node compared, and includes the target if found.
   */
  search(value) {
    const path = [];
    let comparisons = 0;
    let node = this.root;
    while (node) {
      path.push(node.value);
      comparisons++;
      if (value === node.value) return { found: true, path, comparisons };
      node = value < node.value ? node.left : node.right;
    }
    return { found: false, path, comparisons };
  }

  // ── Traversals ──────────────────────────────────────────────────────────────

  inorder() {
    const result = [];
    const visit = (n) => { if (!n) return; visit(n.left); result.push(n.value); visit(n.right); };
    visit(this.root);
    return result;
  }

  preorder() {
    const result = [];
    const visit = (n) => { if (!n) return; result.push(n.value); visit(n.left); visit(n.right); };
    visit(this.root);
    return result;
  }

  postorder() {
    const result = [];
    const visit = (n) => { if (!n) return; visit(n.left); visit(n.right); result.push(n.value); };
    visit(this.root);
    return result;
  }

  levelOrder() {
    if (!this.root) return [];
    const result = [];
    const queue = [this.root];
    while (queue.length) {
      const node = queue.shift();
      result.push(node.value);
      if (node.left)  queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    return result;
  }

  // ── Metrics ─────────────────────────────────────────────────────────────────

  height() { return this._height(this.root); }
  _height(n) { return n ? 1 + Math.max(this._height(n.left), this._height(n.right)) : 0; }

  size() { return this._size; }

  isBalanced() { return this._balHeight(this.root) !== -1; }
  _balHeight(n) {
    if (!n) return 0;
    const l = this._balHeight(n.left);
    if (l === -1) return -1;
    const r = this._balHeight(n.right);
    if (r === -1) return -1;
    if (Math.abs(l - r) > 1) return -1;
    return 1 + Math.max(l, r);
  }

  clear() { this.root = null; this._size = 0; }

  // ── Serialization ────────────────────────────────────────────────────────────

  toJSON() { return JSON.stringify(this._toObj(this.root), null, 2); }
  _toObj(n) {
    if (!n) return null;
    return { value: n.value, left: this._toObj(n.left), right: this._toObj(n.right) };
  }

  /**
   * Load from a plain object (e.g. parsed JSON).
   * The object must have the shape { value, left?, right? }.
   */
  fromObj(obj) {
    this.clear();
    const build = (o) => {
      if (!o) return null;
      const node = new BSTNode(o.value);
      this._size++;
      node.left = build(o.left);
      node.right = build(o.right);
      return node;
    };
    this.root = build(obj);
  }
}

# DataStructure

A collection of interactive data structure visualizers.

## BST Visualizer

**[`bst-visualizer/index.html`](bst-visualizer/index.html)** — a fully animated, browser-based Binary Search Tree visualizer. Open the file directly in any modern browser (or serve the folder with any static HTTP server).

### Features

| Category | Details |
|---|---|
| **Operations** | Insert, Delete (with inorder-successor replacement), Search |
| **Traversals** | Inorder · Preorder · Postorder · Level-order (BFS) |
| **Animations** | Step-by-step node highlighting; pop-in for new nodes; fade-out for deletions; shake on "not found" |
| **Colour coding** | Blue = default · Green = inserted/found · Red = deleting/not found · Yellow = search path · Orange = traversal current · Purple = traversal visited |
| **Metrics bar** | Live tree height, node count, balance status, comparison count |
| **Export** | Download tree as **JSON** or **PNG image** |
| **Themes** | Dark / Light toggle (persists per session) |
| **Responsive** | Adapts to desktop and mobile viewports |

### Quick start

```bash
cd bst-visualizer
python3 -m http.server 8080
# open http://localhost:8080 in your browser
```

Or simply open `bst-visualizer/index.html` directly in your browser (no build step required).
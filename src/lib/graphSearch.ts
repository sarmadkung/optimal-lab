// Breadth-first and depth-first search on one small undirected graph.
// BFS keeps a queue (first in, first out), so it visits nodes in rings of distance.
// DFS keeps a stack (last in, first out), so it dives down one branch before backing up.

export type GraphNode = { id: string; x: number; y: number };

export const NODES: GraphNode[] = [
  { id: "A", x: 50, y: 10 },
  { id: "B", x: 22, y: 36 },
  { id: "C", x: 78, y: 36 },
  { id: "D", x: 10, y: 66 },
  { id: "E", x: 38, y: 66 },
  { id: "F", x: 64, y: 66 },
  { id: "G", x: 90, y: 66 },
  { id: "H", x: 24, y: 92 },
  { id: "I", x: 76, y: 92 },
];

export const EDGES: [string, string][] = [
  ["A", "B"], ["A", "C"], ["B", "D"], ["B", "E"], ["C", "F"], ["C", "G"], ["D", "H"], ["E", "H"], ["F", "I"], ["G", "I"],
];

export const neighbours = (id: string) =>
  EDGES.flatMap(([a, b]) => (a === id ? [b] : b === id ? [a] : [])).sort();

export type Algo = "bfs" | "dfs";

export type SearchFrame = {
  /** node taken from the frontier this step (null for the first frame) */
  current: string | null;
  visited: string[];
  /** queue for BFS (front first), stack for DFS (top last) */
  frontier: string[];
  /** how each node was first reached, to draw the search tree */
  parent: Record<string, string>;
  found: boolean;
};

export function search(algo: Algo, start = "A", target = "G"): SearchFrame[] {
  return algo === "bfs" ? bfs(start, target) : dfs(start, target);
}

// BFS marks a node when it is queued, so nothing joins the queue twice and the first
// time a node is reached is along a shortest path.
function bfs(start: string, target: string): SearchFrame[] {
  const frontier = [start];
  const seen = new Set([start]);
  const visited: string[] = [];
  const parent: Record<string, string> = {};
  const frames: SearchFrame[] = [{ current: null, visited: [], frontier: [...frontier], parent: {}, found: false }];
  while (frontier.length) {
    const current = frontier.shift()!;
    visited.push(current);
    const found = current === target;
    if (!found) {
      for (const n of neighbours(current)) {
        if (seen.has(n)) continue;
        seen.add(n);
        parent[n] = current;
        frontier.push(n);
      }
    }
    frames.push({ current, visited: [...visited], frontier: [...frontier], parent: { ...parent }, found });
    if (found) break;
  }
  return frames;
}

// Iterative DFS marks a node when it is popped. The latest node to push a neighbour
// becomes its parent, which is what makes the path follow the dive, not the shortest route.
function dfs(start: string, target: string): SearchFrame[] {
  const frontier = [start];
  const visited: string[] = [];
  const parent: Record<string, string> = {};
  const frames: SearchFrame[] = [{ current: null, visited: [], frontier: [...frontier], parent: {}, found: false }];
  while (frontier.length) {
    const current = frontier.pop()!;
    if (visited.includes(current)) continue; // a stale copy: already explored
    visited.push(current);
    const found = current === target;
    if (!found) {
      // Push in reverse so the alphabetically first neighbour is explored first.
      for (const n of [...neighbours(current)].reverse()) {
        if (visited.includes(n)) continue;
        parent[n] = current;
        frontier.push(n);
      }
    }
    frames.push({ current, visited: [...visited], frontier: [...frontier], parent: { ...parent }, found });
    if (found) break;
  }
  return frames;
}

/** Path from start to node through the search tree. */
export function pathTo(node: string, parent: Record<string, string>) {
  const path = [node];
  while (parent[path[0]]) path.unshift(parent[path[0]]);
  return path;
}

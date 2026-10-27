import { getActiveRoute } from "./navigationHistory";

const STORAGE_KEY = "app-scroll-v1";
const MAX_ROUTES = 40;

type Snapshot = Record<string, number>;

const memory = new Map<string, Snapshot>();
let loaded = false;
let persistTimer = 0;
let restoring = false;
let listening = false;

function loadMemory() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, Snapshot>;
    if (!parsed || typeof parsed !== "object") return;
    for (const [route, snapshot] of Object.entries(parsed)) {
      if (snapshot && typeof snapshot === "object") memory.set(route, snapshot);
    }
  } catch {
    // private mode / unavailable
  }
}

function persistSoon() {
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    try {
      const entries = [...memory.entries()].slice(-MAX_ROUTES);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
    } catch {
      // ignore quota / private mode
    }
  }, 200);
}

export function elementPath(root: HTMLElement, element: HTMLElement): string {
  if (element === root) return "main";
  const steps: string[] = [];
  let node: HTMLElement | null = element;
  while (node && node !== root) {
    const parent: HTMLElement | null = node.parentElement;
    if (!parent) return "main";
    steps.push(String(Array.prototype.indexOf.call(parent.children, node)));
    node = parent;
  }
  return `main/${steps.reverse().join("/")}`;
}

function resolvePath(root: HTMLElement, path: string): HTMLElement | null {
  if (path === "main") return root;
  if (!path.startsWith("main/")) return null;
  let node: HTMLElement = root;
  for (const step of path.slice("main/".length).split("/")) {
    const child = node.children[Number(step)];
    if (!(child instanceof HTMLElement)) return null;
    node = child;
  }
  return node;
}

function remember(route: string, path: string, top: number) {
  if (!route || restoring) return;
  loadMemory();
  const snapshot = memory.get(route) ?? {};
  if (snapshot[path] === top) return;
  snapshot[path] = top;
  memory.set(route, snapshot);
  persistSoon();
}

function rememberVisible(route: string, root: HTMLElement) {
  const nodes: HTMLElement[] = [root];
  root.querySelectorAll("*").forEach((node) => {
    if (node instanceof HTMLElement) nodes.push(node);
  });
  for (const element of nodes) {
    if (element === root || element.scrollHeight > element.clientHeight + 1) {
      remember(route, elementPath(root, element), element.scrollTop);
    }
  }
}

export function installScrollMemory() {
  if (listening || typeof document === "undefined") return;
  listening = true;
  loadMemory();

  document.addEventListener(
    "scroll",
    (event) => {
      if (restoring) return;
      const target = event.target;
      const root = document.querySelector("main");
      if (!(root instanceof HTMLElement)) return;
      const element = target === document ? root : target;
      if (!(element instanceof HTMLElement)) return;
      if (element !== root && !root.contains(element)) return;
      remember(getActiveRoute(), elementPath(root, element), element.scrollTop);
    },
    true,
  );

  document.addEventListener(
    "pointerdown",
    () => {
      const root = document.querySelector("main");
      if (root instanceof HTMLElement) rememberVisible(getActiveRoute(), root);
    },
    true,
  );
}

export function restoreScroll(route: string, root: HTMLElement): () => void {
  loadMemory();
  const snapshot = memory.get(route);
  if (!snapshot || Object.keys(snapshot).length === 0) return () => {};

  let stopped = false;
  const apply = () => {
    if (stopped) return true;
    restoring = true;
    let settled = true;
    for (const [path, top] of Object.entries(snapshot)) {
      const element = resolvePath(root, path);
      if (!element) {
        settled = false;
        continue;
      }
      if (top > 0 && element.scrollHeight < element.clientHeight + top) settled = false;
      if (element.scrollTop !== top) element.scrollTop = top;
    }
    return settled;
  };

  apply();
  const observer = new MutationObserver(() => {
    if (apply()) stop();
  });
  observer.observe(root, { childList: true, subtree: true });
  const done = window.setTimeout(stop, 2500);

  function stop() {
    if (stopped) return;
    stopped = true;
    observer.disconnect();
    window.clearTimeout(done);
    restoring = false;
  }

  return stop;
}

export function resetScrollMemoryForTests() {
  memory.clear();
  loaded = false;
  restoring = false;
}

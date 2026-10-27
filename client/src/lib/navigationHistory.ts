/**
 * In-app page stack. Back uses this to return to the previous page.
 * A refreshed or freshly opened page has no previous entry, so Back falls
 * back to that page's parent route.
 */

export type NavigationKind = "init" | "push" | "replace" | "pop";

let stack: string[] = [];
let pending: NavigationKind | null = null;
let trackedPath = "";
let lastKind: NavigationKind = "init";
let installed = false;

export function fullLocation(pathname: string, search: string): string {
  const query = search.startsWith("?") ? search.slice(1) : search;
  return query ? `${pathname}?${query}` : pathname;
}

export function getLastNavigationKind(): NavigationKind {
  return lastKind;
}

export function getActiveRoute(): string {
  return trackedPath;
}

export function canGoBackInApp(): boolean {
  return stack.length > 1;
}

function collapseTop() {
  while (stack.length > 1 && stack[stack.length - 1] === stack[stack.length - 2]) {
    stack.pop();
  }
}

/** Record the route currently on screen. Safe to call on every render. */
export function trackLocation(fullPath: string): NavigationKind {
  installNavigationHistory();
  if (fullPath === trackedPath && pending === null) return lastKind;

  const kind: NavigationKind = pending ?? (stack.length === 0 ? "init" : "push");
  pending = null;
  trackedPath = fullPath;

  if (kind === "replace") {
    if (stack.length === 0) stack = [fullPath];
    else stack[stack.length - 1] = fullPath;
    collapseTop();
  } else if (kind === "pop") {
    const index = stack.lastIndexOf(fullPath);
    if (index >= 0) stack = stack.slice(0, index + 1);
    else stack.push(fullPath);
  } else if (kind === "init") {
    stack = [fullPath];
  } else if (stack[stack.length - 1] !== fullPath) {
    stack.push(fullPath);
  }

  lastKind = kind;
  return kind;
}

export function installNavigationHistory() {
  if (installed || typeof window === "undefined" || typeof history === "undefined") return;
  installed = true;

  const push = history.pushState.bind(history);
  const replace = history.replaceState.bind(history);
  history.pushState = function (this: History, ...args: Parameters<History["pushState"]>) {
    if (pending !== "pop") pending = "push";
    return push(...args);
  };
  history.replaceState = function (this: History, ...args: Parameters<History["replaceState"]>) {
    if (pending !== "pop") pending = "replace";
    return replace(...args);
  };
  window.addEventListener("popstate", () => {
    pending = "pop";
  });
}

/** Browser Back when this session has a previous page. */
export function backInApp(): boolean {
  installNavigationHistory();
  if (!canGoBackInApp()) return false;
  pending = "pop";
  window.history.back();
  return true;
}

export function resetNavigationHistoryForTests() {
  stack = [];
  pending = null;
  trackedPath = "";
  lastKind = "init";
}

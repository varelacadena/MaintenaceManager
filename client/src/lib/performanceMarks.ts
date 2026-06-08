export function markRouteNavigation(path: string) {
  if (typeof performance === "undefined") return;
  try {
    performance.mark(`route:${path}:start`);
  } catch {
    // ignore duplicate marks
  }
}

export function measureRouteNavigation(path: string) {
  if (typeof performance === "undefined") return;
  try {
    performance.mark(`route:${path}:end`);
    performance.measure(`route-nav:${path}`, `route:${path}:start`, `route:${path}:end`);
  } catch {
    // marks may be missing on first paint
  }
}

export function markFirstContentPaint(label: string) {
  if (typeof performance === "undefined") return;
  try {
    performance.mark(`fcp:${label}`);
  } catch {
    // ignore
  }
}

/** Wouter location setter (second tuple item from useLocation). */
export type SetLocationFn = (
  to: string,
  options?: { replace?: boolean },
) => void;

/** Navigate away from a completed or abandoned workflow without leaving a stale history entry. */
export function exitTo(setLocation: SetLocationFn, to: string): void {
  setLocation(to, { replace: true });
}

/**
 * Preferred parent route for the global Back control and similar exits.
 * Uses explicit routes instead of browser history so completed workflows are not reopened.
 */
export function getParentRoute(pathname: string, role?: string): string {
  const path = pathname.split("?")[0].replace(/\/$/, "") || "/";
  const isAdmin = role === "admin";

  if (/^\/vehicle-checkin-verify\/[^/]+/.test(path)) {
    return "/vehicles?tab=reservations";
  }
  if (/^\/vehicle-checkin\/[^/]+/.test(path)) {
    return isAdmin ? "/vehicles?tab=reservations" : "/my-reservations";
  }
  if (/^\/vehicle-checkout\/[^/]+/.test(path)) {
    return isAdmin ? "/vehicles?tab=reservations" : "/my-reservations";
  }
  if (/^\/vehicle-reservation-details\/[^/]+/.test(path)) {
    return isAdmin ? "/vehicles?tab=reservations" : "/my-reservations";
  }
  if (path === "/vehicle-reservations") {
    return "/vehicles?tab=reservations";
  }

  if (/^\/vehicles\/[^/]+\/edit$/.test(path)) {
    return path.replace(/\/edit$/, "");
  }
  if (/^\/vehicles\/[^/]+$/.test(path)) {
    return "/vehicles";
  }
  if (path === "/vehicles") {
    return "/";
  }

  if (/^\/tasks\/[^/]+\/edit$/.test(path)) {
    return path.replace(/\/edit$/, "");
  }
  if (path === "/tasks/new") {
    return "/work";
  }
  if (/^\/tasks\/[^/]+$/.test(path)) {
    return "/work";
  }

  if (path === "/new-request") {
    return "/requests";
  }
  if (/^\/requests\/[^/]+$/.test(path)) {
    return "/requests";
  }

  if (/^\/projects\/[^/]+$/.test(path)) {
    return "/work?tab=projects";
  }

  if (/^\/properties\/[^/]+$/.test(path)) {
    return "/properties";
  }
  if (/^\/equipment\/[^/]+\/work-history$/.test(path)) {
    return "/properties";
  }

  if (path === "/my-reservations") {
    return isAdmin ? "/" : "/work";
  }
  if (path === "/grab") {
    return "/work";
  }
  if (path === "/work") {
    return "/";
  }

  if (path === "/inventory" || path.startsWith("/analytics")) {
    return "/";
  }
  if (
    path === "/users" ||
    path === "/vendors" ||
    path === "/calendar" ||
    path === "/settings" ||
    path === "/email-management" ||
    path === "/resources"
  ) {
    return "/";
  }

  return "/";
}

/** Routes that render their own page-level Back/close button should not also show the global header Back. */
export function hasPageBackControl(pathname: string, role?: string): boolean {
  const path = pathname.split("?")[0].replace(/\/$/, "") || "/";

  if (/^\/tasks\/[^/]+$/.test(path)) {
    return true;
  }

  if (/^\/vehicle-checkin-verify\/[^/]+/.test(path)) {
    return true;
  }

  if (role !== "admin" && /^\/requests\/[^/]+$/.test(path)) {
    return true;
  }

  return false;
}

/** Global header Back: route-aware exit, with browser fallback only when already at the mapped parent. */
export function goBack(
  setLocation: SetLocationFn,
  pathname: string,
  role?: string,
): void {
  const path = pathname.split("?")[0].replace(/\/$/, "") || "/";
  const parent = getParentRoute(pathname, role);

  if (parent === path) {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      exitTo(setLocation, "/");
    }
    return;
  }

  exitTo(setLocation, parent);
}

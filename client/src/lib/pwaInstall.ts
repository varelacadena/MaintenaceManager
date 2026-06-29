export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let capturedPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<() => void>();

function notifyPromptListeners() {
  promptListeners.forEach((listener) => listener());
}

function handleBeforeInstallPrompt(event: Event) {
  event.preventDefault();
  capturedPrompt = event as BeforeInstallPromptEvent;
  notifyPromptListeners();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
}

export function getCapturedInstallPrompt(): BeforeInstallPromptEvent | null {
  return capturedPrompt;
}

export function clearCapturedInstallPrompt(): void {
  capturedPrompt = null;
}

export function subscribeToInstallPrompt(listener: () => void): () => void {
  promptListeners.add(listener);
  return () => {
    promptListeners.delete(listener);
  };
}

export function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

export function isInStandaloneMode(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

export const PWA_INSTALL_DISMISSED_KEY = "pwa-install-dismissed";
export const PWA_INSTALL_DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function readInstallDismissed(): boolean {
  const wasDismissed = localStorage.getItem(PWA_INSTALL_DISMISSED_KEY);
  if (!wasDismissed) return false;

  const dismissedAt = parseInt(wasDismissed, 10);
  if (Date.now() - dismissedAt < PWA_INSTALL_DISMISS_TTL_MS) {
    return true;
  }

  localStorage.removeItem(PWA_INSTALL_DISMISSED_KEY);
  return false;
}

export function writeInstallDismissed(): void {
  localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, Date.now().toString());
}

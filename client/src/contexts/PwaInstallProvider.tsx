import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearCapturedInstallPrompt,
  getCapturedInstallPrompt,
  isAndroid,
  isInStandaloneMode,
  isIos,
  readInstallDismissed,
  subscribeToInstallPrompt,
  writeInstallDismissed,
  type BeforeInstallPromptEvent,
} from "@/lib/pwaInstall";

interface PwaInstallContextValue {
  canPrompt: boolean;
  showNativePrompt: boolean;
  showIosInstructions: boolean;
  showAndroidInstructions: boolean;
  install: () => Promise<boolean>;
  dismiss: () => void;
  isStandalone: boolean;
}

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => getCapturedInstallPrompt(),
  );
  const [isIosDevice] = useState(isIos);
  const [isAndroidDevice] = useState(isAndroid);
  const [isStandalone, setIsStandalone] = useState(isInStandaloneMode);
  const [dismissed, setDismissed] = useState(readInstallDismissed);

  useEffect(() => {
    setIsStandalone(isInStandaloneMode());

    return subscribeToInstallPrompt(() => {
      setDeferredPrompt(getCapturedInstallPrompt());
    });
  }, []);

  const install = useCallback(async () => {
    const prompt = deferredPrompt ?? getCapturedInstallPrompt();
    if (!prompt) return false;

    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    clearCapturedInstallPrompt();
    setDeferredPrompt(null);
    return outcome === "accepted";
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    writeInstallDismissed();
  }, []);

  const showNativePrompt = !!deferredPrompt;
  const showIosInstructions = isIosDevice && !deferredPrompt;
  const showAndroidInstructions = isAndroidDevice && !deferredPrompt;
  const canPrompt =
    !isStandalone &&
    !dismissed &&
    (showNativePrompt || showIosInstructions || showAndroidInstructions);

  const value = useMemo(
    () => ({
      canPrompt,
      showNativePrompt,
      showIosInstructions,
      showAndroidInstructions,
      install,
      dismiss,
      isStandalone,
    }),
    [
      canPrompt,
      showNativePrompt,
      showIosInstructions,
      showAndroidInstructions,
      install,
      dismiss,
      isStandalone,
    ],
  );

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}

export function usePwaInstallContext(): PwaInstallContextValue {
  const context = useContext(PwaInstallContext);
  if (!context) {
    throw new Error("usePwaInstallContext must be used within PwaInstallProvider");
  }
  return context;
}

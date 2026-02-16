import { usePwaInstall } from "@/hooks/usePwaInstall";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X, Share, Plus } from "lucide-react";
import { useState } from "react";

export default function PwaInstallBanner() {
  const { canPrompt, showNativePrompt, showIosInstructions, install, dismiss } =
    usePwaInstall();
  const [showIosSteps, setShowIosSteps] = useState(false);

  if (!canPrompt) return null;

  const handleInstall = async () => {
    if (showNativePrompt) {
      await install();
    } else if (showIosInstructions) {
      setShowIosSteps(true);
    }
  };

  if (showIosSteps) {
    return (
      <div className="px-3 pt-3" data-testid="pwa-ios-instructions">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">Add to Home Screen</p>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowIosSteps(false)}
                data-testid="button-close-ios-steps"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-medium shrink-0">
                  1
                </span>
                <span className="flex items-center gap-1">
                  Tap the Share button
                  <Share className="w-3.5 h-3.5 inline shrink-0" />
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-medium shrink-0">
                  2
                </span>
                <span className="flex items-center gap-1">
                  Scroll down and tap "Add to Home Screen"
                  <Plus className="w-3.5 h-3.5 inline shrink-0" />
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-medium shrink-0">
                  3
                </span>
                <span>Tap "Add" to confirm</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setShowIosSteps(false);
                dismiss();
              }}
              data-testid="button-dismiss-ios-steps"
            >
              Got it, don't show again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-3 pt-3" data-testid="pwa-install-banner">
      <Card>
        <CardContent className="p-3 flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 shrink-0">
            <Download className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Install Hartland App</p>
            <p className="text-xs text-muted-foreground">
              Quick access from your home screen
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              onClick={handleInstall}
              data-testid="button-pwa-install"
            >
              Install
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={dismiss}
              data-testid="button-pwa-dismiss"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

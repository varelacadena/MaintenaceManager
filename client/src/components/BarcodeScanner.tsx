import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Camera, X, Keyboard } from "lucide-react";

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (value: string) => void;
  title?: string;
  description?: string;
}

export function BarcodeScanner({
  open,
  onOpenChange,
  onScan,
  title = "Scan Barcode",
  description = "Point your camera at a barcode or QR code",
}: BarcodeScannerProps) {
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>("");
  const [manualEntry, setManualEntry] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (!open) {
      stopScanner();
      setManualEntry(false);
      setManualValue("");
      setError("");
      return;
    }

    if (manualEntry) return;

    startScanner();

    return () => {
      stopScanner();
    };
  }, [open, manualEntry]);

  async function startScanner() {
    if (isStarting) return;
    setIsStarting(true);
    setError("");

    try {
      const { Html5QrcodeScanner, Html5QrcodeScanType } = await import("html5-qrcode");

      if (scannerRef.current) {
        try { await scannerRef.current.clear(); } catch {}
        scannerRef.current = null;
      }

      const scanner = new Html5QrcodeScanner(
        "barcode-scanner-container",
        {
          fps: 10,
          qrbox: { width: 250, height: 180 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true,
        },
        false
      );

      scanner.render(
        (decodedText: string) => {
          onScan(decodedText);
          onOpenChange(false);
        },
        (errorMessage: string) => {
          // Scan errors are expected (no code in frame) — only show persistent errors
          if (errorMessage.includes("NotFoundException") || errorMessage.includes("No MultiFormat Readers")) {
            return;
          }
        }
      );

      scannerRef.current = scanner;
    } catch (err: any) {
      if (err?.message?.includes("Permission") || err?.message?.includes("NotAllowed")) {
        setError("Camera permission denied. Please allow camera access or use manual entry below.");
      } else if (err?.message?.includes("NotFound") || err?.message?.includes("no camera")) {
        setError("No camera found on this device. Please use manual entry below.");
      } else {
        setError("Could not start camera scanner. Please use manual entry below.");
      }
      setManualEntry(true);
    } finally {
      setIsStarting(false);
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
  }

  function handleManualSubmit() {
    const value = manualValue.trim();
    if (!value) return;
    onScan(value);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) stopScanner(); onOpenChange(val); }}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-barcode-scanner">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!manualEntry && (
            <div
              ref={containerRef}
              className="rounded-md overflow-hidden border"
            >
              <div id="barcode-scanner-container" />
              {isStarting && (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  Starting camera...
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setManualEntry(!manualEntry)}
              data-testid="button-toggle-manual-entry"
            >
              <Keyboard className="h-4 w-4 mr-2" />
              {manualEntry ? "Use Camera Instead" : "Enter Code Manually"}
            </Button>

            {manualEntry && (
              <div className="flex gap-2">
                <Input
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value)}
                  placeholder="Enter barcode or QR code value"
                  onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                  data-testid="input-manual-barcode"
                  autoFocus
                />
                <Button
                  onClick={handleManualSubmit}
                  disabled={!manualValue.trim()}
                  data-testid="button-submit-manual-barcode"
                >
                  Find
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

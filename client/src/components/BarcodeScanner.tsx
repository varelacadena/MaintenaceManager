import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard, FlipHorizontal, AlertCircle, ScanLine } from "lucide-react";

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
  title = "Scan Code",
  description,
}: BarcodeScannerProps) {
  const html5QrcodeRef = useRef<any>(null);
  const [error, setError] = useState<string>("");
  const [manualEntry, setManualEntry] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [isFront, setIsFront] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const startedRef = useRef(false);

  const stopScanner = useCallback(async () => {
    startedRef.current = false;
    if (html5QrcodeRef.current) {
      try { await html5QrcodeRef.current.stop(); } catch {}
      try { await html5QrcodeRef.current.clear(); } catch {}
      html5QrcodeRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const startScanner = useCallback(async (front: boolean) => {
    if (startedRef.current) return;
    startedRef.current = true;
    setError("");

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      if (html5QrcodeRef.current) {
        try { await html5QrcodeRef.current.stop(); } catch {}
        try { await html5QrcodeRef.current.clear(); } catch {}
        html5QrcodeRef.current = null;
      }

      const el = document.getElementById("qr-reader-native");
      if (!el) { startedRef.current = false; return; }

      const qr = new Html5Qrcode("qr-reader-native");
      html5QrcodeRef.current = qr;

      await qr.start(
        { facingMode: front ? "user" : "environment" },
        {
          fps: 12,
          qrbox: { width: Math.min(250, window.innerWidth - 80), height: 150 },
          aspectRatio: 1.5,
        },
        (decodedText: string) => {
          onScan(decodedText);
          onOpenChange(false);
        },
        () => {}
      );
      setIsRunning(true);
    } catch (err: any) {
      startedRef.current = false;
      const msg = err?.message || "";
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        setError("Camera access was denied. Please allow camera permissions and try again.");
      } else if (msg.includes("NotFound") || msg.includes("no camera") || msg.includes("Requested device")) {
        setError("No camera found on this device.");
      } else {
        setError("Could not start camera scanner.");
      }
      setManualEntry(true);
    }
  }, [onScan, onOpenChange]);

  useEffect(() => {
    if (!open) {
      stopScanner();
      setManualEntry(false);
      setManualValue("");
      setError("");
      return;
    }
    if (!manualEntry) {
      const timer = setTimeout(() => startScanner(isFront), 150);
      return () => clearTimeout(timer);
    }
  }, [open, manualEntry]);

  const handleFlipCamera = async () => {
    const next = !isFront;
    setIsFront(next);
    await stopScanner();
    setTimeout(() => {
      startedRef.current = false;
      startScanner(next);
    }, 150);
  };

  function handleManualSubmit() {
    const value = manualValue.trim();
    if (!value) return;
    onScan(value);
    onOpenChange(false);
  }

  const boxW = Math.min(250, window.innerWidth - 80);
  const boxH = 150;

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) stopScanner(); onOpenChange(val); }}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden w-full max-w-sm rounded-2xl"
        data-testid="dialog-barcode-scanner"
      >
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ScanLine className="h-4 w-4 text-muted-foreground" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Camera viewport */}
        {!manualEntry && (
          <div className="relative bg-black" style={{ height: 220 }}>
            <div id="qr-reader-native" className="w-full h-full" />

            {/* Custom scanning frame */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative" style={{ width: boxW, height: boxH }}>
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br" />
                {/* Animated scan line */}
                <div className="animate-scan-line left-2 right-2 h-0.5 bg-primary/90 rounded-full shadow-[0_0_8px_2px_hsl(var(--primary)/0.5)]" />
              </div>
            </div>

            {/* Flip camera */}
            <Button
              size="icon"
              variant="ghost"
              className="absolute bottom-2 right-2 bg-black/40 text-white hover:bg-black/60 rounded-full"
              onClick={handleFlipCamera}
              data-testid="button-flip-camera"
            >
              <FlipHorizontal className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 mx-4 mt-3 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Bottom controls */}
        <div className="px-4 py-4 space-y-3">
          {manualEntry ? (
            <>
              <p className="text-sm text-muted-foreground">Enter the code value below:</p>
              <div className="flex gap-2">
                <Input
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value)}
                  placeholder="Barcode or QR code value"
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
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground text-xs"
                onClick={() => {
                  setManualEntry(false);
                  setError("");
                  startedRef.current = false;
                  setTimeout(() => startScanner(isFront), 150);
                }}
              >
                Try camera again
              </Button>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {description || "Point at a barcode — it scans automatically"}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-muted-foreground"
                onClick={() => { stopScanner(); setManualEntry(true); }}
                data-testid="button-toggle-manual-entry"
              >
                <Keyboard className="h-3.5 w-3.5 mr-1" />
                Manual
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

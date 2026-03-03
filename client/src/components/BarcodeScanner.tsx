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

declare global {
  interface Window {
    BarcodeDetector?: any;
  }
}

export function BarcodeScanner({
  open,
  onOpenChange,
  onScan,
  title = "Scan Code",
  description,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<any>(null);
  const jsQRRef = useRef<any>(null);
  const activeRef = useRef(false);
  const isFrontRef = useRef(false);

  const [error, setError] = useState<string>("");
  const [manualEntry, setManualEntry] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [isFront, setIsFront] = useState(false);

  const stopCamera = useCallback(() => {
    activeRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const scanFrame = useCallback(() => {
    if (!activeRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w === 0 || h === 0) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    ctx.drawImage(video, 0, 0, w, h);

    const runDetection = async () => {
      if (!activeRef.current) return;

      try {
        if (detectorRef.current) {
          const results = await detectorRef.current.detect(canvas);
          if (results && results.length > 0) {
            const code = results[0].rawValue;
            if (code) {
              activeRef.current = false;
              onScan(code);
              onOpenChange(false);
              return;
            }
          }
        } else if (jsQRRef.current) {
          const imageData = ctx.getImageData(0, 0, w, h);
          const result = jsQRRef.current(imageData.data, w, h);
          if (result && result.data) {
            activeRef.current = false;
            onScan(result.data);
            onOpenChange(false);
            return;
          }
        }
      } catch {
      }

      if (activeRef.current) {
        rafRef.current = requestAnimationFrame(scanFrame);
      }
    };

    runDetection();
  }, [onScan, onOpenChange]);

  const startCamera = useCallback(async (front: boolean) => {
    setError("");
    activeRef.current = true;
    isFrontRef.current = front;

    try {
      if (window.BarcodeDetector) {
        const formats = await window.BarcodeDetector.getSupportedFormats();
        detectorRef.current = new window.BarcodeDetector({ formats });
      } else {
        if (!jsQRRef.current) {
          const mod = await import("jsqr");
          jsQRRef.current = mod.default;
        }
        detectorRef.current = null;
      }
    } catch {
      if (!jsQRRef.current) {
        try {
          const mod = await import("jsqr");
          jsQRRef.current = mod.default;
        } catch {
        }
      }
      detectorRef.current = null;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: front ? "user" : "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (!activeRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      rafRef.current = requestAnimationFrame(scanFrame);
    } catch (err: any) {
      activeRef.current = false;
      const msg = err?.message || "";
      if (msg.includes("Permission") || msg.includes("NotAllowed") || err?.name === "NotAllowedError") {
        setError("Camera access was denied. Please allow camera permissions and try again.");
      } else if (msg.includes("NotFound") || err?.name === "NotFoundError") {
        setError("No camera found on this device.");
      } else {
        setError("Could not start camera. Check that no other app is using it.");
      }
      setManualEntry(true);
    }
  }, [scanFrame]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setManualEntry(false);
      setManualValue("");
      setError("");
      return;
    }
    if (!manualEntry) {
      const timer = setTimeout(() => startCamera(isFront), 250);
      return () => clearTimeout(timer);
    }
  }, [open, manualEntry]);

  const handleFlipCamera = async () => {
    const next = !isFront;
    setIsFront(next);
    isFrontRef.current = next;
    stopCamera();
    setTimeout(() => startCamera(next), 150);
  };

  function handleManualSubmit() {
    const value = manualValue.trim();
    if (!value) return;
    onScan(value);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) stopCamera();
        onOpenChange(val);
      }}
    >
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

        {!manualEntry && (
          <div className="relative bg-black" style={{ height: 220 }}>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
            <canvas ref={canvasRef} className="hidden" />

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative" style={{ width: 240, height: 150 }}>
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br" />
                <div className="animate-scan-line left-2 right-2 h-0.5 bg-primary/90 rounded-full shadow-[0_0_8px_2px_hsl(var(--primary)/0.5)]" />
              </div>
            </div>

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

        {error && (
          <div className="flex items-start gap-2 mx-4 mt-3 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

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
                  setTimeout(() => startCamera(isFrontRef.current), 300);
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
                onClick={() => {
                  stopCamera();
                  setManualEntry(true);
                }}
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

import { useEffect, useRef, useState } from "react";
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

type CameraSession = {
  stream: MediaStream;
  front: boolean;
};

let cameraSession: CameraSession | null = null;
let detectorPromise: Promise<any | null> | null = null;
let jsQRModule: any = null;

function parkCamera() {
  cameraSession?.stream.getVideoTracks().forEach((track) => {
    track.enabled = false;
  });
}

function dropCamera() {
  cameraSession?.stream.getTracks().forEach((track) => track.stop());
  cameraSession = null;
}

function reusableStream(front: boolean): MediaStream | null {
  if (!cameraSession || cameraSession.front !== front) return null;
  const track = cameraSession.stream.getVideoTracks()[0];
  if (!track || track.readyState !== "live") {
    dropCamera();
    return null;
  }
  track.enabled = true;
  return cameraSession.stream;
}

async function openCamera(front: boolean): Promise<MediaStream> {
  const existing = reusableStream(front);
  if (existing) return existing;
  dropCamera();
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: front ? "user" : "environment" },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  });
  cameraSession = { stream, front };
  return stream;
}

function loadDetector(): Promise<any | null> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      if (!window.BarcodeDetector) return null;
      try {
        const formats = await window.BarcodeDetector.getSupportedFormats();
        return new window.BarcodeDetector({ formats });
      } catch {
        return null;
      }
    })();
  }
  return detectorPromise;
}

async function loadJsQR() {
  if (!jsQRModule) {
    const mod = await import("jsqr");
    jsQRModule = mod.default;
  }
  return jsQRModule;
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", dropCamera);
}

const SCAN_INTERVAL_MS = 160;

export function BarcodeScanner({
  open,
  onOpenChange,
  onScan,
  title = "Scan Code",
  description,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const busyRef = useRef(false);
  const frontRef = useRef(false);
  const runRef = useRef(0);
  const onScanRef = useRef(onScan);
  const onOpenChangeRef = useRef(onOpenChange);
  onScanRef.current = onScan;
  onOpenChangeRef.current = onOpenChange;

  const [error, setError] = useState("");
  const [manualEntry, setManualEntry] = useState(false);
  const [manualValue, setManualValue] = useState("");

  function stopLoop() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function finish(code: string) {
    activeRef.current = false;
    stopLoop();
    parkCamera();
    if (videoRef.current) videoRef.current.srcObject = null;
    onScanRef.current(code);
    onOpenChangeRef.current(false);
  }

  function scheduleScan(delay = SCAN_INTERVAL_MS) {
    stopLoop();
    if (!activeRef.current) return;
    timerRef.current = window.setTimeout(() => {
      void scanOnce();
    }, delay);
  }

  async function scanOnce() {
    if (!activeRef.current || busyRef.current) return;
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0) {
      scheduleScan(80);
      return;
    }

    busyRef.current = true;
    try {
      const detector = await loadDetector();
      if (!activeRef.current) return;
      if (detector) {
        const results = await detector.detect(video);
        const code = results?.[0]?.rawValue;
        if (code) {
          finish(code);
          return;
        }
      } else {
        const jsQR = await loadJsQR();
        const canvas = canvasRef.current;
        if (!jsQR || !canvas || !activeRef.current) return;
        const crop = 0.72;
        const sourceWidth = Math.round(video.videoWidth * crop);
        const sourceHeight = Math.round(video.videoHeight * crop);
        const sourceX = Math.round((video.videoWidth - sourceWidth) / 2);
        const sourceY = Math.round((video.videoHeight - sourceHeight) / 2);
        const scale = Math.min(1, 420 / Math.max(sourceWidth, sourceHeight));
        const width = Math.max(1, Math.round(sourceWidth * scale));
        const height = Math.max(1, Math.round(sourceHeight * scale));
        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
        const image = ctx.getImageData(0, 0, width, height);
        const result = jsQR(image.data, width, height, { inversionAttempts: "dontInvert" });
        if (result?.data) {
          finish(result.data);
          return;
        }
      }
    } catch (scanErr) {
      console.warn("Barcode scan frame error:", scanErr);
    } finally {
      busyRef.current = false;
    }

    if (activeRef.current) scheduleScan();
  }

  async function startCamera(front: boolean) {
    const run = ++runRef.current;
    setError("");
    activeRef.current = true;
    frontRef.current = front;
    try {
      const stream = await openCamera(front);
      if (run !== runRef.current || !activeRef.current) {
        if (!activeRef.current) parkCamera();
        return;
      }
      const video = videoRef.current;
      if (video) {
        if (video.srcObject !== stream) video.srcObject = stream;
        try {
          await video.play();
        } catch {
          // autoPlay still starts the preview once the stream is attached
        }
      }
      if (run !== runRef.current || !activeRef.current) {
        if (!activeRef.current) parkCamera();
        return;
      }
      scheduleScan(40);
    } catch (err: any) {
      activeRef.current = false;
      const msg = err?.message || "";
      if (msg.includes("Permission") || msg.includes("NotAllowed") || err?.name === "NotAllowedError") {
        setError("Camera access was denied. Allow the camera once in the browser prompt, then scan again.");
      } else if (msg.includes("NotFound") || err?.name === "NotFoundError") {
        setError("No camera found on this device.");
      } else {
        setError("Could not start camera. Check that no other app is using it.");
      }
      setManualEntry(true);
    }
  }

  useEffect(() => {
    if (!open) {
      activeRef.current = false;
      stopLoop();
      parkCamera();
      if (videoRef.current) videoRef.current.srcObject = null;
      setManualEntry(false);
      setManualValue("");
      setError("");
      return;
    }
    if (manualEntry) {
      activeRef.current = false;
      stopLoop();
      parkCamera();
      return;
    }
    void startCamera(frontRef.current);
    return () => {
      runRef.current += 1;
      activeRef.current = false;
      stopLoop();
    };
  }, [open, manualEntry]);

  async function handleFlipCamera() {
    const next = !frontRef.current;
    frontRef.current = next;
    stopLoop();
    await startCamera(next);
  }

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
        if (!val) {
          activeRef.current = false;
          stopLoop();
          parkCamera();
        }
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
          <div className="relative aspect-square w-full overflow-hidden bg-black">
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              playsInline
              muted
              autoPlay
            />
            <canvas ref={canvasRef} className="hidden" />

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative aspect-square w-[72%] max-w-[260px]">
                <div className="absolute inset-0 rounded-2xl shadow-[0_0_0_999px_rgba(0,0,0,0.55)]" />
                <div className="absolute top-0 left-0 h-7 w-7 border-l-2 border-t-2 border-white rounded-tl-md" />
                <div className="absolute top-0 right-0 h-7 w-7 border-r-2 border-t-2 border-white rounded-tr-md" />
                <div className="absolute bottom-0 left-0 h-7 w-7 border-b-2 border-l-2 border-white rounded-bl-md" />
                <div className="absolute bottom-0 right-0 h-7 w-7 border-b-2 border-r-2 border-white rounded-br-md" />
                <div className="scan-frame absolute inset-3 overflow-hidden">
                  <div className="animate-scan-line h-0.5 bg-primary/90 shadow-[0_0_8px_2px_hsl(var(--primary)/0.5)]" />
                </div>
              </div>
            </div>

            <Button
              size="icon"
              variant="ghost"
              className="absolute bottom-2 right-2 bg-black/40 text-white hover:bg-black/60 rounded-full"
              onClick={() => void handleFlipCamera()}
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
                }}
                data-testid="button-toggle-manual-entry"
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
                  activeRef.current = false;
                  stopLoop();
                  parkCamera();
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

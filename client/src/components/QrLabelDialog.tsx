import { useId, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { Printer, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AssetTagLabel } from "@/components/AssetTagLabel";
import { QrPrintSizeSelector } from "@/components/QrPrintSizeSelector";
import { useToast } from "@/hooks/use-toast";
import type { AssetTagFields } from "@/lib/equipmentQrLabel";
import { printAssetTagLabel, printQrLabelFromArea, QR_PRINT_SIZE_PX, type QrPrintSize } from "@/lib/printQrLabel";

export type QrLabelLines = {
  primary: string;
  secondary?: string;
  serialNumber?: string;
};

interface QrLabelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  qrValue: string;
  label?: QrLabelLines;
  assetTag?: AssetTagFields;
  caption?: string;
  scanHint?: string;
  testIdPrefix?: string;
}

export function QrLabelDialog({
  open,
  onOpenChange,
  title,
  qrValue,
  label,
  assetTag,
  caption,
  scanHint,
  testIdPrefix = "qr-label",
}: QrLabelDialogProps) {
  const { toast } = useToast();
  const printAreaId = useId().replace(/:/g, "");
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<QrPrintSize>("medium");
  const qrSize = QR_PRINT_SIZE_PX[size];
  const description = assetTag?.id ?? label?.primary ?? title;

  const handlePrint = () => {
    const printArea = printAreaRef.current;
    if (!printArea) return;

    const qrHtml = printArea.querySelector("svg")?.outerHTML ?? "";
    if (assetTag && !qrHtml) return;

    const printed = assetTag
      ? printAssetTagLabel({
          title: `${assetTag.id} asset tag`,
          qrHtml,
          fields: assetTag,
        })
      : printQrLabelFromArea(printArea, {
          title: `${label?.primary ?? title} QR`,
          size,
        });

    if (!printed) {
      toast({
        title: "Popup blocked",
        description: "Allow popups to print labels.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={assetTag ? "max-w-lg text-center" : "max-w-sm text-center"} data-testid={`dialog-${testIdPrefix}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {assetTag ? (
            <div id={printAreaId} ref={printAreaRef} className="w-full">
              <AssetTagLabel fields={assetTag} qrValue={qrValue} />
            </div>
          ) : (
            <div className="bg-white p-4 rounded-md border" id={printAreaId} ref={printAreaRef}>
              <QRCode value={qrValue} size={qrSize} />
              <div className="mt-2 text-center">
                <p className="text-sm font-semibold font-mono text-black tracking-wide">{label?.primary}</p>
                {label?.secondary && (
                  <p className="text-xs text-gray-600 mt-1">{label.secondary}</p>
                )}
                {label?.serialNumber && (
                  <p className="text-xs text-gray-500 mt-1">SN: {label.serialNumber}</p>
                )}
              </div>
            </div>
          )}

          {!assetTag && (
            <div className="space-y-2 w-full">
              <p className="text-xs text-muted-foreground">Print size</p>
              <QrPrintSizeSelector value={size} onChange={setSize} />
            </div>
          )}

          {caption && (
            <p className="text-xs text-muted-foreground px-2">{caption}</p>
          )}
          {scanHint && (
            <p className="text-xs text-muted-foreground px-2">{scanHint}</p>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              data-testid={`button-print-${testIdPrefix}`}
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Print Label
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              data-testid={`button-close-${testIdPrefix}`}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

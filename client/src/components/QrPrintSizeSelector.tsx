import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { QrPrintSize } from "@/lib/printQrLabel";

type QrPrintSizeSelectorProps = {
  value: QrPrintSize;
  onChange: (size: QrPrintSize) => void;
};

export function QrPrintSizeSelector({ value, onChange }: QrPrintSizeSelectorProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as QrPrintSize);
      }}
      size="sm"
      className="justify-center"
    >
      <ToggleGroupItem value="small" aria-label="Small print size">
        Small
      </ToggleGroupItem>
      <ToggleGroupItem value="medium" aria-label="Medium print size">
        Medium
      </ToggleGroupItem>
      <ToggleGroupItem value="large" aria-label="Large print size">
        Large
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

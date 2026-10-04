import QRCode from "react-qr-code";
import type { AssetTagFields } from "@/lib/equipmentQrLabel";

const ROWS: { key: keyof AssetTagFields; label: string; mono: boolean }[] = [
  { key: "id", label: "ID", mono: true },
  { key: "name", label: "NAME", mono: false },
  { key: "location", label: "LOC", mono: false },
  { key: "category", label: "CAT", mono: true },
];

export function AssetTagLabel({ fields, qrValue }: { fields: AssetTagFields; qrValue: string }) {
  return (
    <div
      className="mx-auto flex w-full max-w-[400px] flex-col overflow-hidden border border-black bg-white text-black"
      style={{ aspectRatio: "2 / 1" }}
      data-testid="asset-tag-label"
    >
        <div className="flex h-[16.8%] shrink-0 items-center justify-center border-b border-black text-[13px] font-bold tracking-widest">
          ASSET TAG
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            {ROWS.map((row, index) => (
              <div
                key={row.key}
                className={`flex min-h-0 flex-1 ${index < ROWS.length - 1 ? "border-b border-black" : ""}`}
              >
                <div className="flex w-[17%] items-center justify-center border-r border-black text-[9px] font-bold tracking-wide">
                  {row.label}
                </div>
                <div
                  className={`flex min-w-0 flex-1 items-center px-1.5 text-[11px] font-bold ${row.mono ? "font-mono text-[9px]" : ""}`}
                >
                  <span className="truncate" data-testid={`asset-tag-${row.key}`}>
                    {fields[row.key]}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex w-[38%] items-center justify-center border-l border-black">
            <QRCode value={qrValue} size={256} style={{ width: "85%", height: "auto" }} />
          </div>
        </div>
    </div>
  );
}

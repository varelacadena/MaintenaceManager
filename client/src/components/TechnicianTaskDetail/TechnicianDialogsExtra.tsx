import { Check, X } from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { format } from "date-fns";
import type { Task, User as UserType } from "@shared/schema";

export interface TechnicianDialogsExtraProps {
  isPreviousWorkOpen: boolean;
  setIsPreviousWorkOpen: (v: boolean) => void;
  previousWork: Task[];
  users: UserType[];
  safeNavigate: (path: string) => void;
  isScanEquipmentOpen: boolean;
  setIsScanEquipmentOpen: (v: boolean) => void;
  handleEquipmentScan: (value: string) => void;
  isScanPartOpen: boolean;
  setIsScanPartOpen: (v: boolean) => void;
  handleScanPart: (value: string) => void;
  setIsPartModalOpen: (v: boolean) => void;
}

export function TechnicianDialogsExtra({
  isPreviousWorkOpen,
  setIsPreviousWorkOpen,
  previousWork,
  users,
  safeNavigate,
  isScanEquipmentOpen,
  setIsScanEquipmentOpen,
  handleEquipmentScan,
  isScanPartOpen,
  setIsScanPartOpen,
  handleScanPart,
  setIsPartModalOpen,
}: TechnicianDialogsExtraProps) {
  return (
    <>
      {isPreviousWorkOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          onClick={() => setIsPreviousWorkOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full sm:max-w-lg max-h-[80vh] overflow-y-auto bg-background rounded-t-2xl sm:rounded-2xl p-5 pb-7"
            onClick={(e) => e.stopPropagation()}
            data-testid="sheet-previous-work"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-foreground">
                Previous Work
              </p>
              <button onClick={() => setIsPreviousWorkOpen(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-2">
              {previousWork.map((prevTask) => {
                const completedBy = users.find(u => u.id === prevTask.assignedToId);
                return (
                  <button
                    key={prevTask.id}
                    className="w-full text-left p-3 rounded-lg bg-muted/50 border border-border"
                    onClick={() => {
                      setIsPreviousWorkOpen(false);
                      safeNavigate(`/tasks/${prevTask.id}`);
                    }}
                    data-testid={`previous-work-item-${prevTask.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">
                          {prevTask.name}
                        </p>
                        {prevTask.description && (
                          <p className="text-xs mt-0.5 line-clamp-2 text-muted-foreground">
                            {prevTask.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {completedBy && (
                            <span className="text-xs flex items-center gap-1 text-muted-foreground">
                              {completedBy.firstName} {completedBy.lastName}
                            </span>
                          )}
                          {prevTask.updatedAt && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(prevTask.updatedAt), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                      </div>
                      <Check className="w-4 h-4 shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <BarcodeScanner
        open={isScanEquipmentOpen}
        onOpenChange={setIsScanEquipmentOpen}
        onScan={handleEquipmentScan}
        title="Scan Equipment"
        description="Scan an equipment QR code"
      />
      <BarcodeScanner
        open={isScanPartOpen}
        onOpenChange={(v) => {
          setIsScanPartOpen(v);
          if (!v) setIsPartModalOpen(true);
        }}
        onScan={(value) => {
          handleScanPart(value);
          setIsPartModalOpen(true);
        }}
        title="Scan Part"
        description="Scan a barcode to find this part"
      />
    </>
  );
}

import {
  Phone,
  CircleDollarSign,
  Package,
  History,
  FileText,
  ChevronRight,
} from "lucide-react";
import type { Task, PartUsed, Quote } from "@shared/schema";

interface TechnicianMoreTabProps {
  task: Task;
  contactName: string;
  contactPhone: string;
  contactInitials: string;
  existingQuote: Quote | null;
  parts: PartUsed[];
  previousWork: Task[];
  allTaskResources: any[];
  resourceDocs: number;
  resourceVids: number;
  setIsEstimateSheetOpen: (v: boolean) => void;
  setIsPartModalOpen: (v: boolean) => void;
  setIsPreviousWorkOpen: (v: boolean) => void;
  setIsResourcesOpen: (v: boolean) => void;
}

export function TechnicianMoreTab({
  task,
  contactName,
  contactPhone,
  contactInitials,
  existingQuote,
  parts,
  previousWork,
  allTaskResources,
  resourceDocs,
  resourceVids,
  setIsEstimateSheetOpen,
  setIsPartModalOpen,
  setIsPreviousWorkOpen,
  setIsResourcesOpen,
}: TechnicianMoreTabProps) {
  return (
    <>
      {(contactName || contactPhone) && (
        <div
          className="p-3 rounded-xl bg-background border border-border"
          data-testid="card-contact"
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center shrink-0 text-white text-xs font-medium rounded-full bg-emerald-600"
              style={{ width: 34, height: 34 }}
            >
              {contactInitials || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">
                {contactName}
              </p>
              {contactPhone && (
                <p className="text-xs text-muted-foreground">
                  Tap to call &middot; {contactPhone}
                </p>
              )}
            </div>
            {contactPhone && (
              <a
                href={`tel:${contactPhone}`}
                className="flex items-center justify-center shrink-0 rounded-full bg-primary/10"
                style={{ width: 30, height: 30 }}
                data-testid="button-call-contact"
              >
                <Phone className="w-3.5 h-3.5 text-primary" />
              </a>
            )}
          </div>
        </div>
      )}

      <div
        className="p-3 rounded-xl bg-background border border-border"
        data-testid="card-actions"
      >
        {task.requiresEstimate && (
          <button
            className="flex items-center gap-3 w-full py-3 text-left border-b border-border"
            onClick={() => setIsEstimateSheetOpen(true)}
            data-testid="action-estimate"
          >
            <div
              className="flex items-center justify-center shrink-0 bg-amber-50 dark:bg-amber-950/30 rounded-lg"
              style={{ width: 32, height: 32 }}
            >
              <CircleDollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Estimate / Quote
              </p>
              {existingQuote && (
                <p className="text-xs text-muted-foreground">
                  {task.estimateStatus === "waiting_approval"
                    ? `Pending approval \u00B7 $${(existingQuote.estimatedCost || 0).toFixed(2)}`
                    : task.estimateStatus === "approved"
                      ? `Approved \u00B7 $${(existingQuote.estimatedCost || 0).toFixed(2)}`
                      : `$${(existingQuote.estimatedCost || 0).toFixed(2)}`}
                </p>
              )}
            </div>
            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
          </button>
        )}

        <button
          className="flex items-center gap-3 w-full py-3 text-left border-b border-border"
          onClick={() => setIsPartModalOpen(true)}
          data-testid="action-parts"
        >
          <div
            className="flex items-center justify-center shrink-0 bg-primary/10 rounded-lg"
            style={{ width: 32, height: 32 }}
          >
            <Package className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              Parts Used
            </p>
          </div>
          <span
            className={`text-xs shrink-0 ${parts.length > 0 ? "text-primary" : "text-muted-foreground"}`}
          >
            {parts.length > 0 ? `${parts.length} added` : "None"}
          </span>
          <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
        </button>

        {previousWork.length > 0 && (
          <button
            className="flex items-center gap-3 w-full py-3 text-left border-b border-border"
            onClick={() => setIsPreviousWorkOpen(true)}
            data-testid="action-previous-work"
          >
            <div
              className="flex items-center justify-center shrink-0 bg-green-50 dark:bg-green-950/30 rounded-lg"
              style={{ width: 32, height: 32 }}
            >
              <History className="w-4 h-4 text-green-700 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Previous Work
              </p>
            </div>
            <span
              className="flex items-center justify-center text-xs font-medium shrink-0 px-2 py-0.5 rounded-full bg-primary/10 text-primary"
            >
              {previousWork.length}
            </span>
            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
          </button>
        )}

        {allTaskResources.length > 0 && (
          <button
            className="flex items-center gap-3 w-full py-3 text-left"
            onClick={() => setIsResourcesOpen(true)}
            data-testid="action-resources"
          >
            <div
              className="flex items-center justify-center shrink-0 bg-muted rounded-lg"
              style={{ width: 32, height: 32 }}
            >
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Resources
              </p>
            </div>
            <span className="text-xs shrink-0 text-muted-foreground">
              {resourceDocs > 0 && `${resourceDocs} doc${resourceDocs !== 1 ? "s" : ""}`}
              {resourceDocs > 0 && resourceVids > 0 && " \u00B7 "}
              {resourceVids > 0 && `${resourceVids} vid`}
            </span>
            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
          </button>
        )}
      </div>

      {parts.length > 0 && (
        <div
          className="p-3 rounded-xl bg-background border border-border"
          data-testid="card-parts-list"
        >
          <p
            className="text-xs uppercase font-medium mb-2 text-muted-foreground"
            style={{ letterSpacing: "0.05em" }}
          >
            Parts Added
          </p>
          <div className="space-y-2">
            {parts.map((part) => (
              <div
                key={part.id}
                className="flex items-center justify-between py-1.5 border-b border-border/50"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {part.partName}
                  </p>
                  {part.notes && (
                    <p className="text-xs text-muted-foreground">
                      {part.notes}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-foreground">
                    Qty: {part.quantity}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ${Number(part.cost).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

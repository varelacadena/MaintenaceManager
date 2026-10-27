import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { downloadAnalyticsExport } from "@/lib/analyticsExportDownload";
import { useAnalyticsFilters } from "./useAnalyticsFilters";
import { EXPORT_TYPES, SHEETS_BY_TAB, TASK_DATE_TABS } from "./reportCatalog";

function SheetPicker({
  sheets,
  selected,
  onChange,
}: {
  sheets: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const label =
    selected.length === sheets.length ? "All sheets" : selected.length === 0 ? "No sheets" : `${selected.length} sheets`;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="h-11 w-full min-w-0 justify-between font-normal md:h-9 md:w-auto md:min-w-[11rem]" data-testid="report-sheets">
          <span className="truncate">{label}</span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(18rem,calc(100vw-1.5rem))] p-2" align="start" collisionPadding={12}>
        <div className="max-h-64 overflow-auto space-y-1">
          {sheets.map((sheet) => {
            const checked = selected.includes(sheet);
            return (
              <label key={sheet} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
                <Checkbox
                  aria-label={sheet}
                  checked={checked}
                  onClick={(event) => event.stopPropagation()}
                  onCheckedChange={(value) => {
                    if (value) onChange(selected.includes(sheet) ? selected : [...selected, sheet]);
                    else onChange(selected.filter((name) => name !== sheet));
                  }}
                />
                <span className="flex-1">{sheet}</span>
                {checked && <Check className="h-3.5 w-3.5" />}
              </label>
            );
          })}
        </div>
        <div className="flex justify-end pt-2">
          <Button type="button" size="sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function ReportsBuilder() {
  const { activeTab, view, filters, buildQueryString, roleFilter } = useAnalyticsFilters();
  const { toast } = useToast();
  const sheets = SHEETS_BY_TAB[activeTab];
  const [selected, setSelected] = useState<string[]>(sheets);
  const [reader, setReader] = useState<"me" | "department" | "agency">("department");
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeCost, setIncludeCost] = useState(true);
  const [includeStudents, setIncludeStudents] = useState(false);
  const [includePhotos, setIncludePhotos] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSelected(SHEETS_BY_TAB[activeTab]);
  }, [activeTab]);

  useEffect(() => {
    setIncludeCost(reader !== "agency");
  }, [reader]);

  const basisLabel = useMemo(() => {
    if (filters.dateBasis === "completed") return "Completed in the period";
    if (filters.dateBasis === "due") return "Due in the period";
    if (filters.dateBasis === "created") return "Created in the period";
    return "Active in the period";
  }, [filters.dateBasis]);

  const download = async () => {
    setBusy(true);
    try {
      const params = new URLSearchParams(
        buildQueryString(activeTab === "technicians" && roleFilter !== "all" ? { roleType: roleFilter } : undefined),
      );
      if (view === "xlsx" && selected.length > 0 && selected.length < sheets.length) {
        params.set("sheets", selected.join(","));
      }
      if (view === "pdf" && !includeCharts) params.set("charts", "0");
      if (!includeCost) params.set("cost", "0");
      if (activeTab === "technicians" && includeStudents) params.set("students", "1");
      if (view === "pdf" && includePhotos && (activeTab === "work-orders" || activeTab === "technicians" || activeTab === "facilities")) {
        params.set("photos", "1");
      }
      await downloadAnalyticsExport(EXPORT_TYPES[activeTab], view === "pdf" ? "pdf" : "xlsx", params.toString());
    } catch (error) {
      toast({
        title: "Could not download report",
        description: error instanceof Error ? error.message : "Export failed",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 max-w-3xl" data-testid="reports-builder">
      <p className="text-sm text-muted-foreground">
        {view === "pdf"
          ? "The PDF is a written report. The period, what the dates mean, and the property are printed on the cover."
          : "The spreadsheet is tables only. Each checked sheet is a tab in the file."}
      </p>
      <p className="text-sm">
        {TASK_DATE_TABS.includes(activeTab) ? (
          <>
            Dates mean <span className="font-medium">{basisLabel}</span>
            {filters.startDate || filters.endDate
              ? ` · ${filters.startDate || "…"} to ${filters.endDate || "…"}`
              : " · all dates"}
          </>
        ) : filters.startDate || filters.endDate ? (
          <>
            Period <span className="font-medium">{filters.startDate || "…"} to {filters.endDate || "…"}</span>
          </>
        ) : (
          "All dates"
        )}
      </p>
      {view === "xlsx" && (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-muted-foreground">Sheets</span>
          <SheetPicker sheets={sheets} selected={selected} onChange={setSelected} />
        </div>
      )}
      {view === "pdf" && (
        <div className="grid grid-cols-2 items-end gap-2 md:flex md:flex-wrap">
          <label className="col-span-2 flex min-w-0 flex-col gap-1 md:col-span-1">
            <span className="text-[11px] font-medium text-muted-foreground">Reader</span>
            <Select value={reader} onValueChange={(value) => setReader(value as typeof reader)}>
              <SelectTrigger className="h-11 w-full min-w-0 md:h-9 md:w-[12rem]" data-testid="report-reader">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="me">Me</SelectItem>
                <SelectItem value="department">Another department</SelectItem>
                <SelectItem value="agency">An agency</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="flex items-center gap-2 h-9 text-sm">
            <Checkbox checked={includeCharts} onCheckedChange={(value) => setIncludeCharts(value === true)} />
            Charts
          </label>
          <label className="flex items-center gap-2 h-9 text-sm">
            <Checkbox
              checked={includeCost}
              onCheckedChange={(value) => setIncludeCost(value === true)}
              data-testid="report-cost"
            />
            Cost
          </label>
          {activeTab === "technicians" && (
            <label className="col-span-2 flex items-center gap-2 text-sm md:col-span-1">
              <Checkbox checked={includeStudents} onCheckedChange={(value) => setIncludeStudents(value === true)} />
              Student hours and recaps
            </label>
          )}
          {(activeTab === "work-orders" || activeTab === "technicians" || activeTab === "facilities") && (
            <label className="col-span-2 flex items-center gap-2 text-sm md:col-span-1">
              <Checkbox
                checked={includePhotos}
                onCheckedChange={(value) => setIncludePhotos(value === true)}
                data-testid="report-photos"
              />
              Photos from finished jobs
            </label>
          )}
        </div>
      )}
      {view === "xlsx" && activeTab === "technicians" && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={includeStudents} onCheckedChange={(value) => setIncludeStudents(value === true)} />
          Student hours and recaps
        </label>
      )}
      <Button type="button" className="h-11 w-full md:h-10 md:w-auto" onClick={() => void download()} disabled={busy || (view === "xlsx" && selected.length === 0)} data-testid="report-download">
        {busy ? "Preparing…" : view === "pdf" ? "Download PDF" : "Download spreadsheet"}
      </Button>
    </div>
  );
}

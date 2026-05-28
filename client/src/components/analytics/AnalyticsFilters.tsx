import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Download, Filter, X, Calendar, ChevronDown, FileSpreadsheet, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { serviceRequestStatusFilterOptions } from "@/lib/serviceRequestLabels";

interface Property {
  id: string;
  name: string;
  type: string;
}

interface Area {
  id: string;
  name: string;
}

interface Space {
  id: string;
  name: string;
  propertyId: string;
  floor: string | null;
}

interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string;
  role: string;
}

export interface FilterState {
  startDate: string;
  endDate: string;
  propertyId: string;
  spaceId: string;
  areaId: string;
  technicianId: string;
  status: string;
  urgency: string;
}

export type StatusFilterVariant = "work-order" | "request" | "project";

const STATUS_OPTIONS: Record<StatusFilterVariant, { value: string; label: string }[]> = {
  "work-order": [
    { value: "not_started", label: "Not Started" },
    { value: "needs_estimate", label: "Needs Estimate" },
    { value: "waiting_approval", label: "Waiting Approval" },
    { value: "ready", label: "Ready" },
    { value: "in_progress", label: "In Progress" },
    { value: "on_hold", label: "On Hold" },
    { value: "completed", label: "Completed" },
  ],
  request: serviceRequestStatusFilterOptions,
  project: [
    { value: "planning", label: "Planning" },
    { value: "in_progress", label: "In Progress" },
    { value: "on_hold", label: "On Hold" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ],
};

const PRIORITY_OPTIONS: Record<"task" | "project", { value: string; label: string }[]> = {
  task: [
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
  ],
  project: [
    { value: "critical", label: "Critical" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
  ],
};

interface AnalyticsFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onExport?: (format: string) => void | Promise<void>;
  exportLoading?: boolean;
  showTechnicianFilter?: boolean;
  showStatusFilter?: boolean;
  statusFilterVariant?: StatusFilterVariant;
  showUrgencyFilter?: boolean;
  urgencyFilterVariant?: "task" | "project";
  exportOptions?: string[];
}

const datePresets = [
  { label: "Today", getValue: () => {
    const today = new Date().toISOString().split('T')[0];
    return { startDate: today, endDate: today };
  }},
  { label: "Last 7 Days", getValue: () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
  }},
  { label: "Last 30 Days", getValue: () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
  }},
  { label: "This Month", getValue: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
  }},
  { label: "Last Month", getValue: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
  }},
  { label: "This Year", getValue: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    return { startDate: start.toISOString().split('T')[0], endDate: now.toISOString().split('T')[0] };
  }},
  { label: "All Time", getValue: () => ({ startDate: "", endDate: "" }) },
];

export default function AnalyticsFilters({
  filters,
  onFilterChange,
  onExport,
  exportLoading = false,
  showTechnicianFilter = false,
  showStatusFilter = false,
  statusFilterVariant = "work-order",
  showUrgencyFilter = false,
  urgencyFilterVariant = "task",
  exportOptions = [],
}: AnalyticsFiltersProps) {
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: areas = [] } = useQuery<Area[]>({
    queryKey: ["/api/areas"],
  });

  const { data: allSpaces = [] } = useQuery<Space[]>({
    queryKey: ["/api/spaces"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const technicians = users.filter(u => u.role === "technician" || u.role === "admin");

  // Filter spaces by selected property (only show if a building is selected)
  const selectedProperty = properties.find(p => p.id === filters.propertyId);
  const isBuilding = selectedProperty?.type === "building";
  const filteredSpaces = isBuilding 
    ? allSpaces.filter(s => s.propertyId === filters.propertyId)
    : [];

  const updateFilter = (key: keyof FilterState, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const applyDatePreset = (preset: typeof datePresets[0]) => {
    const { startDate, endDate } = preset.getValue();
    onFilterChange({ ...filters, startDate, endDate });
  };

  const clearFilters = () => {
    onFilterChange({
      startDate: "",
      endDate: "",
      propertyId: "",
      spaceId: "",
      areaId: "",
      technicianId: "",
      status: "",
      urgency: "",
    });
  };

  const handlePropertyChange = (value: string) => {
    // Clear spaceId when property changes
    onFilterChange({ ...filters, propertyId: value === "all" ? "" : value, spaceId: "" });
  };

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'startDate' || key === 'endDate') return false;
    return value !== "";
  }).length;

  const hasDateFilter = filters.startDate || filters.endDate;
  const hasActiveFilters = activeFiltersCount > 0 || hasDateFilter;

  const getDateLabel = () => {
    if (!filters.startDate && !filters.endDate) return "All Time";
    if (filters.startDate && filters.endDate) {
      if (filters.startDate === filters.endDate) {
        return new Date(filters.startDate).toLocaleDateString();
      }
      return `${new Date(filters.startDate).toLocaleDateString()} - ${new Date(filters.endDate).toLocaleDateString()}`;
    }
    if (filters.startDate) return `From ${new Date(filters.startDate).toLocaleDateString()}`;
    return `Until ${new Date(filters.endDate).toLocaleDateString()}`;
  };

  const labelForStatus = (value: string) =>
    STATUS_OPTIONS[statusFilterVariant].find((o) => o.value === value)?.label ??
    value.replace(/_/g, " ");

  const labelForPriority = (value: string) =>
    PRIORITY_OPTIONS[urgencyFilterVariant].find((o) => o.value === value)?.label ?? value;

  type ChipItem = { key: keyof FilterState | "date"; label: string };
  const activeChips: ChipItem[] = [];
  if (hasDateFilter) {
    activeChips.push({ key: "date", label: getDateLabel() });
  }
  if (filters.propertyId) {
    activeChips.push({
      key: "propertyId",
      label: properties.find((p) => p.id === filters.propertyId)?.name ?? "Property",
    });
  }
  if (filters.spaceId) {
    activeChips.push({
      key: "spaceId",
      label: allSpaces.find((s) => s.id === filters.spaceId)?.name ?? "Space",
    });
  }
  if (filters.areaId) {
    activeChips.push({
      key: "areaId",
      label: areas.find((a) => a.id === filters.areaId)?.name ?? "Area",
    });
  }
  if (filters.technicianId) {
    const tech = technicians.find((t) => t.id === filters.technicianId);
    activeChips.push({
      key: "technicianId",
      label:
        tech?.firstName && tech?.lastName
          ? `${tech.firstName} ${tech.lastName}`
          : (tech?.username ?? "Technician"),
    });
  }
  if (filters.status) {
    activeChips.push({ key: "status", label: labelForStatus(filters.status) });
  }
  if (filters.urgency) {
    activeChips.push({ key: "urgency", label: labelForPriority(filters.urgency) });
  }

  const removeChip = (key: ChipItem["key"]) => {
    if (key === "date") {
      onFilterChange({ ...filters, startDate: "", endDate: "" });
    } else {
      updateFilter(key, "");
    }
  };

  return (
    <div className="space-y-2 mb-4">
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-9 gap-2"
            data-testid="button-date-filter"
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">{getDateLabel()}</span>
            <span className="sm:hidden">Date</span>
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] p-3" align="start">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {datePresets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  className="text-xs justify-start"
                  onClick={() => applyDatePreset(preset)}
                  data-testid={`button-preset-${preset.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div className="border-t pt-3 space-y-2">
              <Label className="text-xs text-muted-foreground">Custom Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="startDate" className="text-xs">From</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filters.startDate}
                    onChange={e => updateFilter("startDate", e.target.value)}
                    data-testid="input-start-date"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className="text-xs">To</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filters.endDate}
                    onChange={e => updateFilter("endDate", e.target.value)}
                    data-testid="input-end-date"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant={activeFiltersCount > 0 ? "default" : "outline"}
            size="sm" 
            className="h-9 gap-2"
            data-testid="button-filters"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(18rem,calc(100vw-2rem))] p-3" align="start">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Filters</span>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-2 text-xs">
                  <X className="w-3 h-3 mr-1" />
                  Clear all
                </Button>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="property" className="text-xs">Property</Label>
                <Select value={filters.propertyId || "all"} onValueChange={handlePropertyChange}>
                  <SelectTrigger id="property" data-testid="select-property" className="h-8 text-xs">
                    <SelectValue placeholder="All Properties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Properties</SelectItem>
                    {properties.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isBuilding && filteredSpaces.length > 0 && (
                <div className="space-y-1">
                  <Label htmlFor="space" className="text-xs">Space</Label>
                  <Select value={filters.spaceId || "all"} onValueChange={v => updateFilter("spaceId", v === "all" ? "" : v)}>
                    <SelectTrigger id="space" data-testid="select-space" className="h-8 text-xs">
                      <SelectValue placeholder="All Spaces" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Spaces</SelectItem>
                      {filteredSpaces.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}{s.floor ? ` (Floor ${s.floor})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="area" className="text-xs">Area / Department</Label>
                <Select value={filters.areaId || "all"} onValueChange={v => updateFilter("areaId", v === "all" ? "" : v)}>
                  <SelectTrigger id="area" data-testid="select-area" className="h-8 text-xs">
                    <SelectValue placeholder="All Areas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Areas</SelectItem>
                    {areas.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showTechnicianFilter && (
                <div className="space-y-1">
                  <Label htmlFor="technician" className="text-xs">Technician</Label>
                  <Select value={filters.technicianId || "all"} onValueChange={v => updateFilter("technicianId", v === "all" ? "" : v)}>
                    <SelectTrigger id="technician" data-testid="select-technician" className="h-8 text-xs">
                      <SelectValue placeholder="All Technicians" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Technicians</SelectItem>
                      {technicians.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.firstName && t.lastName ? `${t.firstName} ${t.lastName}` : t.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {showStatusFilter && (
                <div className="space-y-1">
                  <Label htmlFor="status" className="text-xs">Status</Label>
                  <Select value={filters.status || "all"} onValueChange={v => updateFilter("status", v === "all" ? "" : v)}>
                    <SelectTrigger id="status" data-testid="select-status" className="h-8 text-xs">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {STATUS_OPTIONS[statusFilterVariant].map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {showUrgencyFilter && (
                <div className="space-y-1">
                  <Label htmlFor="urgency" className="text-xs">Priority</Label>
                  <Select value={filters.urgency || "all"} onValueChange={v => updateFilter("urgency", v === "all" ? "" : v)}>
                    <SelectTrigger id="urgency" data-testid="select-urgency" className="h-8 text-xs">
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      {PRIORITY_OPTIONS[urgencyFilterVariant].map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {hasActiveFilters && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={clearFilters} 
          className="h-9 px-2 text-muted-foreground"
          data-testid="button-clear-filters"
        >
          <X className="w-4 h-4" />
          <span className="sr-only">Clear filters</span>
        </Button>
      )}

      <div className="flex-1" />

      {exportOptions.length > 0 && onExport && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2"
              data-testid="button-export"
              disabled={exportLoading}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">{exportLoading ? "Preparing…" : "Download Report"}</span>
              <span className="sm:hidden">{exportLoading ? "…" : "Export"}</span>
              <ChevronDown className="w-3 h-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(14rem,calc(100vw-2rem))] p-2" align="end">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground px-2 py-1">Uses your active filters</p>
              {exportOptions.includes("xlsx") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => void onExport("xlsx")}
                  disabled={exportLoading}
                  data-testid="button-export-xlsx"
                >
                  <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
                  Excel — full detail (.xlsx)
                </Button>
              )}
              {exportOptions.includes("pdf") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => void onExport("pdf")}
                  disabled={exportLoading}
                  data-testid="button-export-pdf"
                >
                  <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                  PDF — charts & narrative
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>

    {activeChips.length > 0 && (
      <div className="flex flex-wrap items-center gap-1.5" data-testid="active-filter-chips">
        <span className="text-xs text-muted-foreground mr-1">Applied:</span>
        {activeChips.map((chip) => (
          <Badge
            key={chip.key}
            variant="secondary"
            className="text-xs font-normal gap-1 pr-1"
          >
            {chip.label}
            <button
              type="button"
              className="rounded-sm hover:bg-muted p-0.5"
              onClick={() => removeChip(chip.key)}
              aria-label={`Remove ${chip.label} filter`}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
    )}
    </div>
  );
}

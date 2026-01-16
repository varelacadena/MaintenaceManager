import { useState } from "react";
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
import { Download, Filter, X, Calendar, ChevronDown, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { exportToPdfWithCharts } from "@/lib/pdfExport";

interface Property {
  id: string;
  name: string;
}

interface Area {
  id: string;
  name: string;
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
  areaId: string;
  technicianId: string;
  status: string;
  urgency: string;
}

interface AnalyticsFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onExport?: (format: string) => void;
  showTechnicianFilter?: boolean;
  showStatusFilter?: boolean;
  showUrgencyFilter?: boolean;
  exportOptions?: string[];
  reportTitle?: string;
  chartContainerId?: string;
  tableData?: {
    headers: string[];
    rows: (string | number)[][];
  };
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
  showTechnicianFilter = false,
  showStatusFilter = false,
  showUrgencyFilter = false,
  exportOptions = [],
  reportTitle = "Analytics Report",
  chartContainerId,
  tableData,
}: AnalyticsFiltersProps) {
  const [isExporting, setIsExporting] = useState(false);

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: areas = [] } = useQuery<Area[]>({
    queryKey: ["/api/areas"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const technicians = users.filter(u => u.role === "maintenance" || u.role === "admin");

  const updateFilter = (key: keyof FilterState, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const handlePdfExportWithCharts = async () => {
    if (!chartContainerId) {
      onExport?.("pdf");
      return;
    }

    setIsExporting(true);
    try {
      await exportToPdfWithCharts({
        title: reportTitle,
        chartContainerId,
        tableData,
        filters: {
          "Date Range": filters.startDate && filters.endDate 
            ? `${filters.startDate} to ${filters.endDate}` 
            : filters.startDate || filters.endDate || "All Time",
        },
      });
    } catch (error) {
      console.error("PDF export error:", error);
    } finally {
      setIsExporting(false);
    }
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
      areaId: "",
      technicianId: "",
      status: "",
      urgency: "",
    });
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

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
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
        <PopoverContent className="w-80 p-3" align="start">
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
        <PopoverContent className="w-72 p-3" align="start">
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
                <Label htmlFor="property" className="text-xs">Property / Building</Label>
                <Select value={filters.propertyId || "all"} onValueChange={v => updateFilter("propertyId", v === "all" ? "" : v)}>
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
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
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
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
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
            <Button variant="outline" size="sm" className="h-9 gap-2" data-testid="button-export">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download Report</span>
              <span className="sm:hidden">Export</span>
              <ChevronDown className="w-3 h-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="end">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground px-2 py-1">Download complete report</p>
              {exportOptions.includes("xlsx") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => onExport("xlsx")}
                  data-testid="button-export-xlsx"
                >
                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                  Excel Spreadsheet (.xlsx)
                </Button>
              )}
              {exportOptions.includes("pdf") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={handlePdfExportWithCharts}
                  disabled={isExporting}
                  data-testid="button-export-pdf"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 text-red-600 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4 text-red-600" />
                  )}
                  {isExporting ? "Generating PDF..." : "PDF with Charts (.pdf)"}
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

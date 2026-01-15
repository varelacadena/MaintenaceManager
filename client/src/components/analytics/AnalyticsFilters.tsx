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
import { Download, X } from "lucide-react";

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
}

export default function AnalyticsFilters({
  filters,
  onFilterChange,
  onExport,
  showTechnicianFilter = false,
  showStatusFilter = false,
  showUrgencyFilter = false,
  exportOptions = [],
}: AnalyticsFiltersProps) {
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

  const hasActiveFilters = Object.values(filters).some(v => v !== "");

  return (
    <div className="bg-card border rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">Filters</span>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters" className="h-7 px-2 text-xs">
              <X className="w-3 h-3 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {exportOptions.length > 0 && onExport && (
          <div className="flex gap-2">
            {exportOptions.map(option => (
              <Button
                key={option}
                variant="outline"
                size="sm"
                onClick={() => onExport(option)}
                data-testid={`button-export-${option}`}
                className="h-7 px-2 sm:px-3 text-xs"
              >
                <Download className="w-3 h-3 sm:mr-1" />
                <span className="hidden sm:inline">{option.toUpperCase()}</span>
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className="space-y-1 sm:space-y-2">
          <Label htmlFor="startDate" className="text-xs">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={filters.startDate}
            onChange={e => updateFilter("startDate", e.target.value)}
            data-testid="input-start-date"
            className="h-8 sm:h-9 text-xs sm:text-sm"
          />
        </div>

        <div className="space-y-1 sm:space-y-2">
          <Label htmlFor="endDate" className="text-xs">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={filters.endDate}
            onChange={e => updateFilter("endDate", e.target.value)}
            data-testid="input-end-date"
            className="h-8 sm:h-9 text-xs sm:text-sm"
          />
        </div>

        <div className="space-y-1 sm:space-y-2">
          <Label htmlFor="property" className="text-xs">Property</Label>
          <Select value={filters.propertyId} onValueChange={v => updateFilter("propertyId", v === "all" ? "" : v)}>
            <SelectTrigger id="property" data-testid="select-property" className="h-8 sm:h-9 text-xs sm:text-sm">
              <SelectValue placeholder="All" />
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

        <div className="space-y-1 sm:space-y-2">
          <Label htmlFor="area" className="text-xs">Area</Label>
          <Select value={filters.areaId} onValueChange={v => updateFilter("areaId", v === "all" ? "" : v)}>
            <SelectTrigger id="area" data-testid="select-area" className="h-8 sm:h-9 text-xs sm:text-sm">
              <SelectValue placeholder="All" />
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
          <div className="space-y-1 sm:space-y-2">
            <Label htmlFor="technician" className="text-xs">Technician</Label>
            <Select value={filters.technicianId} onValueChange={v => updateFilter("technicianId", v === "all" ? "" : v)}>
              <SelectTrigger id="technician" data-testid="select-technician" className="h-8 sm:h-9 text-xs sm:text-sm">
                <SelectValue placeholder="All" />
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
          <div className="space-y-1 sm:space-y-2">
            <Label htmlFor="status" className="text-xs">Status</Label>
            <Select value={filters.status} onValueChange={v => updateFilter("status", v === "all" ? "" : v)}>
              <SelectTrigger id="status" data-testid="select-status" className="h-8 sm:h-9 text-xs sm:text-sm">
                <SelectValue placeholder="All" />
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
          <div className="space-y-1 sm:space-y-2">
            <Label htmlFor="urgency" className="text-xs">Urgency</Label>
            <Select value={filters.urgency} onValueChange={v => updateFilter("urgency", v === "all" ? "" : v)}>
              <SelectTrigger id="urgency" data-testid="select-urgency" className="h-8 sm:h-9 text-xs sm:text-sm">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Urgencies</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}

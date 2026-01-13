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
import { Calendar, Download, Filter, X } from "lucide-react";

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
  onExport?: (type: string) => void;
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
  const [isExpanded, setIsExpanded] = useState(false);

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
    <div className="bg-card border rounded-lg p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            data-testid="button-toggle-filters"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
                {Object.values(filters).filter(v => v !== "").length}
              </span>
            )}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
              <X className="w-4 h-4 mr-1" />
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
              >
                <Download className="w-4 h-4 mr-2" />
                Export {option.toUpperCase()}
              </Button>
            ))}
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={filters.startDate}
              onChange={e => updateFilter("startDate", e.target.value)}
              data-testid="input-start-date"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={filters.endDate}
              onChange={e => updateFilter("endDate", e.target.value)}
              data-testid="input-end-date"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="property">Property</Label>
            <Select value={filters.propertyId} onValueChange={v => updateFilter("propertyId", v === "all" ? "" : v)}>
              <SelectTrigger id="property" data-testid="select-property">
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

          <div className="space-y-2">
            <Label htmlFor="area">Department/Area</Label>
            <Select value={filters.areaId} onValueChange={v => updateFilter("areaId", v === "all" ? "" : v)}>
              <SelectTrigger id="area" data-testid="select-area">
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
            <div className="space-y-2">
              <Label htmlFor="technician">Technician</Label>
              <Select value={filters.technicianId} onValueChange={v => updateFilter("technicianId", v === "all" ? "" : v)}>
                <SelectTrigger id="technician" data-testid="select-technician">
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
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={filters.status} onValueChange={v => updateFilter("status", v === "all" ? "" : v)}>
                <SelectTrigger id="status" data-testid="select-status">
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
            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency</Label>
              <Select value={filters.urgency} onValueChange={v => updateFilter("urgency", v === "all" ? "" : v)}>
                <SelectTrigger id="urgency" data-testid="select-urgency">
                  <SelectValue placeholder="All Urgencies" />
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
      )}
    </div>
  );
}

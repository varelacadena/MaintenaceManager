import { useState, type ReactNode } from "react";
import { format, parse } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { CalendarIcon, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FilterState } from "@/components/analytics/AnalyticsFilters";
import {
  useAnalyticsFilters,
  type AnalyticsView,
  type ReportTab,
  type RoleFilter,
} from "./useAnalyticsFilters";
import { DATE_NOTE, PROPERTY_TABS, TASK_DATE_TABS } from "./reportCatalog";

const AREAS: { id: ReportTab; label: string }[] = [
  { id: "work-orders", label: "Work orders" },
  { id: "technicians", label: "Team" },
  { id: "facilities", label: "Property" },
  { id: "key-metrics", label: "Overview" },
  { id: "assets", label: "Equipment" },
  { id: "fleet", label: "Fleet" },
  { id: "inventory", label: "Inventory" },
  { id: "requests", label: "Requests" },
  { id: "alerts", label: "Alerts" },
  { id: "projects", label: "Projects" },
];

const VIEWS: { id: AnalyticsView; label: string }[] = [
  { id: "analytics", label: "Analytics" },
  { id: "xlsx", label: "Spreadsheet" },
  { id: "pdf", label: "PDF" },
];

function parseDay(value: string): Date | undefined {
  if (!value) return undefined;
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatDay(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function rangeLabel(start: string, end: string): string {
  const from = parseDay(start);
  const to = parseDay(end);
  if (from && to) return `${format(from, "MMM d, yyyy")} – ${format(to, "MMM d, yyyy")}`;
  if (from) return `From ${format(from, "MMM d, yyyy")}`;
  if (to) return `Until ${format(to, "MMM d, yyyy")}`;
  return "All dates";
}

function BuildingPicker({
  properties,
  value,
  onChange,
}: {
  properties: { id: string; name: string }[];
  value: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? value.split(",").filter(Boolean) : [];
  const label =
    selected.length === 0
      ? "All buildings"
      : selected.length === 1
        ? properties.find((property) => property.id === selected[0])?.name ?? "1 building"
        : `${selected.length} buildings`;

  const toggle = (id: string, checked: boolean) => {
    const next = checked ? [...selected, id] : selected.filter((item) => item !== id);
    onChange(next.join(","));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full min-w-0 justify-between px-3 font-normal md:h-9 md:w-[12.5rem]"
          data-testid="analytics-property"
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(18rem,calc(100vw-1.5rem))] p-2" align="start" collisionPadding={12}>
        <div className="max-h-[min(16rem,50vh)] overflow-auto space-y-1">
          {properties.map((property) => {
            const checked = selected.includes(property.id);
            return (
              <label key={property.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
                <Checkbox
                  aria-label={property.name}
                  checked={checked}
                  onClick={(event) => event.stopPropagation()}
                  onCheckedChange={(next) => toggle(property.id, next === true)}
                />
                <span className="min-w-0 flex-1 truncate">{property.name}</span>
                {checked && <Check className="h-3.5 w-3.5 shrink-0" />}
              </label>
            );
          })}
        </div>
        <div className="flex justify-between gap-2 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            All buildings
          </Button>
          <Button type="button" size="sm" onClick={() => setOpen(false)} data-testid="analytics-property-done">
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function personName(person: { firstName: string | null; lastName: string | null; username: string }): string {
  return [person.firstName, person.lastName].filter(Boolean).join(" ") || person.username;
}

function PeoplePicker({
  people,
  value,
  onChange,
}: {
  people: { id: string; name: string }[];
  value: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? value.split(",").filter(Boolean) : [];
  const label =
    selected.length === 0
      ? "Everyone"
      : selected.length === 1
        ? people.find((person) => person.id === selected[0])?.name ?? "1 person"
        : `${selected.length} people`;

  const toggle = (id: string, checked: boolean) => {
    const next = checked ? [...selected, id] : selected.filter((item) => item !== id);
    onChange(next.join(","));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full min-w-0 justify-between px-3 font-normal md:h-9 md:w-[12.5rem]"
          data-testid="analytics-people"
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(18rem,calc(100vw-1.5rem))] p-2" align="start" collisionPadding={12}>
        <div className="max-h-[min(16rem,50vh)] overflow-auto space-y-1">
          {people.map((person) => {
            const checked = selected.includes(person.id);
            return (
              <label key={person.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
                <Checkbox
                  aria-label={person.name}
                  checked={checked}
                  onClick={(event) => event.stopPropagation()}
                  onCheckedChange={(next) => toggle(person.id, next === true)}
                />
                <span className="min-w-0 flex-1 truncate">{person.name}</span>
                {checked && <Check className="h-3.5 w-3.5 shrink-0" />}
              </label>
            );
          })}
        </div>
        <div className="flex justify-between gap-2 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            Everyone
          </Button>
          <Button type="button" size="sm" onClick={() => setOpen(false)} data-testid="analytics-people-done">
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Field({
  label,
  children,
  testId,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  testId: string;
  wide?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex min-w-0 flex-col gap-1 md:w-auto md:min-w-[9.5rem]",
        wide ? "col-span-2" : "col-span-1",
      )}
      data-testid={testId}
    >
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function PeriodPicker({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (next: FilterState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Date | undefined>(parseDay(filters.startDate));
  const from = parseDay(filters.startDate);
  const to = parseDay(filters.endDate);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setAnchor(undefined);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full min-w-0 justify-between px-3 font-normal md:h-9 md:w-[15.5rem]"
          data-testid="analytics-period"
        >
          <span className="truncate">{rangeLabel(filters.startDate, filters.endDate)}</span>
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(22rem,calc(100vw-1.5rem))] p-3"
        align="center"
        collisionPadding={12}
      >
        <Calendar
          className="w-full p-0"
          classNames={{
            months: "flex w-full flex-col",
            month: "w-full space-y-2",
            caption: "relative mb-1 flex items-center justify-center pt-1",
            caption_label: "text-sm font-semibold",
            table: "w-full border-collapse",
            head_row: "flex w-full",
            head_cell: "flex-1 rounded-md text-[10px] font-semibold uppercase text-muted-foreground",
            row: "mt-1 flex w-full",
            cell: "relative h-9 min-w-0 flex-1 p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md [&:has([aria-selected].day-range-end)]:rounded-r-md",
            day: "inline-flex h-9 w-full items-center justify-center rounded-md p-0 text-sm font-normal aria-selected:opacity-100 hover:bg-accent",
          }}
          mode="range"
          selected={from || to ? { from, to } : undefined}
          onDayClick={(day) => {
            if (!anchor) {
              setAnchor(day);
              onChange({ ...filters, startDate: formatDay(day), endDate: formatDay(day) });
              return;
            }
            const start = anchor <= day ? anchor : day;
            const end = anchor <= day ? day : anchor;
            setAnchor(undefined);
            onChange({ ...filters, startDate: formatDay(start), endDate: formatDay(end) });
          }}
        />
        <div className="flex justify-between gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setAnchor(undefined);
              onChange({ ...filters, startDate: "", endDate: "" });
            }}
          >
            Clear
          </Button>
          <Button type="button" size="sm" onClick={() => setOpen(false)} data-testid="analytics-period-done">
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function AnalyticsToolbar() {
  const { activeTab, setActiveTab, view, setView, filters, setFilters, roleFilter, setRoleFilter } =
    useAnalyticsFilters();
  const { data: properties = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/properties"],
  });
  const { data: users = [] } = useQuery<{ id: string; firstName: string | null; lastName: string | null; username: string; role: string }[]>({
    queryKey: ["/api/users"],
  });
  const showBasis = TASK_DATE_TABS.includes(activeTab);
  const showProperty = PROPERTY_TABS.includes(activeTab);
  const showPeople = activeTab === "work-orders" || activeTab === "technicians" || activeTab === "facilities";
  const people = users
    .filter((user) => {
      if (activeTab === "technicians" && roleFilter === "technician") return user.role === "technician";
      if (activeTab === "technicians" && roleFilter === "student") return user.role === "student";
      return user.role === "technician" || user.role === "student" || user.role === "admin";
    })
    .map((user) => ({ id: user.id, name: personName(user) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const note = DATE_NOTE[activeTab];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 items-end gap-2 md:flex md:flex-wrap">
        <Field label="View" testId="analytics-view">
          <Select value={view} onValueChange={(value) => setView(value as AnalyticsView)}>
            <SelectTrigger className="h-11 w-full min-w-0 md:h-9 md:w-[10.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIEWS.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Area" testId="analytics-area">
          <Select value={activeTab} onValueChange={(value) => setActiveTab(value as ReportTab)}>
            <SelectTrigger className="h-11 w-full min-w-0 md:h-9 md:w-[11.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AREAS.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {showProperty && (
          <Field label="Buildings" testId="analytics-property-field">
            <BuildingPicker
              properties={properties}
              value={filters.propertyId}
              onChange={(propertyId) => setFilters({ ...filters, propertyId })}
            />
          </Field>
        )}
        {activeTab === "technicians" && (
          <Field label="Group" testId="analytics-role">
            <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as RoleFilter)}>
              <SelectTrigger className="h-11 w-full min-w-0 md:h-9 md:w-[10.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone</SelectItem>
                <SelectItem value="technician">Technicians</SelectItem>
                <SelectItem value="student">Students</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}
        {showPeople && (
          <Field label="People" testId="analytics-people-field">
            <PeoplePicker
              people={people}
              value={filters.technicianId}
              onChange={(technicianId) => setFilters({ ...filters, technicianId })}
            />
          </Field>
        )}
        {showBasis && (
          <Field label="Dates mean" testId="analytics-basis" wide>
            <Select
              value={filters.dateBasis}
              onValueChange={(value) =>
                setFilters({ ...filters, dateBasis: value as FilterState["dateBasis"] })
              }
            >
              <SelectTrigger className="h-11 w-full min-w-0 md:h-9 md:w-[13.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active in the period</SelectItem>
                <SelectItem value="completed">Completed in the period</SelectItem>
                <SelectItem value="due">Due in the period</SelectItem>
                <SelectItem value="created">Created in the period</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}
        <Field label="Period" testId="analytics-period-field" wide>
          <PeriodPicker filters={filters} onChange={setFilters} />
        </Field>
      </div>
      {note && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <ChevronDown className="h-3 w-3" />
          {note}
        </p>
      )}
    </div>
  );
}

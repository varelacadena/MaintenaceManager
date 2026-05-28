import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useLocation, useSearch } from "wouter";
import type { FilterState } from "@/components/analytics/AnalyticsFilters";
import { filtersDifferForTab, sanitizeFiltersForTab } from "./analyticsFilterRules";

export type ReportTab =
  | "key-metrics"
  | "work-orders"
  | "technicians"
  | "assets"
  | "facilities"
  | "fleet"
  | "inventory"
  | "requests"
  | "alerts"
  | "projects";

export type RoleFilter = "all" | "technician" | "student";

const VALID_TABS: ReportTab[] = [
  "key-metrics",
  "work-orders",
  "technicians",
  "assets",
  "facilities",
  "fleet",
  "inventory",
  "requests",
  "alerts",
  "projects",
];

const FILTER_KEYS: (keyof FilterState)[] = [
  "startDate",
  "endDate",
  "propertyId",
  "spaceId",
  "areaId",
  "technicianId",
  "status",
  "urgency",
];

export const EMPTY_FILTERS: FilterState = {
  startDate: "",
  endDate: "",
  propertyId: "",
  spaceId: "",
  areaId: "",
  technicianId: "",
  status: "",
  urgency: "",
};

function parseFilters(params: URLSearchParams): FilterState {
  return {
    startDate: params.get("startDate") ?? "",
    endDate: params.get("endDate") ?? "",
    propertyId: params.get("propertyId") ?? "",
    spaceId: params.get("spaceId") ?? "",
    areaId: params.get("areaId") ?? "",
    technicianId: params.get("technicianId") ?? "",
    status: params.get("status") ?? "",
    urgency: params.get("urgency") ?? "",
  };
}

function parseTab(params: URLSearchParams): ReportTab {
  const tab = params.get("tab");
  if (tab && VALID_TABS.includes(tab as ReportTab)) {
    return tab as ReportTab;
  }
  return "key-metrics";
}

function parseRole(params: URLSearchParams): RoleFilter {
  const role = params.get("role");
  if (role === "technician" || role === "student") return role;
  return "all";
}

/** Optional status / priority / technician overrides when jumping from Overview KPIs. */
export type ReportScopePatch = Partial<
  Pick<FilterState, "status" | "urgency" | "technicianId">
> & {
  /** Clear status, priority, and technician before applying patch (default true). */
  resetScope?: boolean;
};

interface AnalyticsFilterContextValue {
  activeTab: ReportTab;
  setActiveTab: (tab: ReportTab) => void;
  navigateToReport: (tab: ReportTab, scope?: ReportScopePatch) => void;
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  clearFilters: () => void;
  roleFilter: RoleFilter;
  setRoleFilter: (role: RoleFilter) => void;
  buildQueryString: (extra?: Record<string, string>) => string;
}

function writeFiltersToParams(next: URLSearchParams, filterState: FilterState) {
  FILTER_KEYS.forEach((key) => {
    const value = filterState[key];
    if (value) next.set(key, value);
    else next.delete(key);
  });
}

const AnalyticsFilterContext = createContext<AnalyticsFilterContextValue | null>(null);

export function AnalyticsFilterProvider({ children }: { children: ReactNode }) {
  const search = useSearch();
  const [, setLocation] = useLocation();

  const params = useMemo(() => new URLSearchParams(search), [search]);
  const activeTab = useMemo(() => parseTab(params), [params]);
  const filters = useMemo(() => parseFilters(params), [params]);
  const roleFilter = useMemo(() => parseRole(params), [params]);

  const setAnalyticsUrl = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(search);
      mutate(next);

      FILTER_KEYS.forEach((key) => {
        if (!next.get(key)) next.delete(key);
      });
      if (!next.get("role") || next.get("role") === "all") next.delete("role");
      if (!next.get("tab") || next.get("tab") === "key-metrics") next.delete("tab");

      const qs = next.toString();
      setLocation(qs ? `/analytics?${qs}` : "/analytics", { replace: true });
    },
    [search, setLocation],
  );

  const setActiveTab = useCallback(
    (tab: ReportTab) => {
      setAnalyticsUrl((next) => {
        if (tab === "key-metrics") next.delete("tab");
        else next.set("tab", tab);
        const sanitized = sanitizeFiltersForTab(tab, parseFilters(next));
        writeFiltersToParams(next, sanitized);
      });
    },
    [setAnalyticsUrl],
  );

  const navigateToReport = useCallback(
    (tab: ReportTab, scope?: ReportScopePatch) => {
      setAnalyticsUrl((next) => {
        if (tab === "key-metrics") next.delete("tab");
        else next.set("tab", tab);

        const resetScope = scope?.resetScope !== false;
        let merged = parseFilters(next);
        if (resetScope) {
          merged = { ...merged, status: "", urgency: "", technicianId: "" };
        }
        if (scope?.status !== undefined) merged.status = scope.status;
        if (scope?.urgency !== undefined) merged.urgency = scope.urgency;
        if (scope?.technicianId !== undefined) merged.technicianId = scope.technicianId;

        writeFiltersToParams(next, sanitizeFiltersForTab(tab, merged));
      });
    },
    [setAnalyticsUrl],
  );

  const setFilters = useCallback(
    (nextFilters: FilterState) => {
      setAnalyticsUrl((next) => {
        FILTER_KEYS.forEach((key) => {
          const value = nextFilters[key];
          if (value) next.set(key, value);
          else next.delete(key);
        });
      });
    },
    [setAnalyticsUrl],
  );

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, [setFilters]);

  useEffect(() => {
    if (!filtersDifferForTab(activeTab, filters)) return;
    setFilters(sanitizeFiltersForTab(activeTab, filters));
  }, [activeTab, filters, setFilters]);

  const setRoleFilter = useCallback(
    (role: RoleFilter) => {
      setAnalyticsUrl((next) => {
        if (role === "all") next.delete("role");
        else next.set("role", role);
      });
    },
    [setAnalyticsUrl],
  );

  const buildQueryString = useCallback(
    (extra?: Record<string, string>) => {
      const query = new URLSearchParams();
      FILTER_KEYS.forEach((key) => {
        const value = filters[key];
        if (value) query.append(key, value);
      });
      if (extra) {
        Object.entries(extra).forEach(([key, value]) => {
          if (value) query.append(key, value);
        });
      }
      return query.toString();
    },
    [filters],
  );

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      navigateToReport,
      filters,
      setFilters,
      clearFilters,
      roleFilter,
      setRoleFilter,
      buildQueryString,
    }),
    [
      activeTab,
      setActiveTab,
      navigateToReport,
      filters,
      setFilters,
      clearFilters,
      roleFilter,
      setRoleFilter,
      buildQueryString,
    ],
  );

  return (
    <AnalyticsFilterContext.Provider value={value}>{children}</AnalyticsFilterContext.Provider>
  );
}

export function useAnalyticsFilters(): AnalyticsFilterContextValue {
  const context = useContext(AnalyticsFilterContext);
  if (!context) {
    throw new Error("useAnalyticsFilters must be used within AnalyticsFilterProvider");
  }
  return context;
}

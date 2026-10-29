import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CountBarChart, StatusPieChart } from "@/components/analytics/AnalyticsCharts";
import { useAnalyticsFilters } from "./useAnalyticsFilters";

function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatWhen(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function MobileJobs({
  rows,
  empty,
}: {
  rows: { key: string; title: string; href: string; meta: string }[];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground sm:hidden">{empty}</p>;
  }
  return (
    <div className="divide-y sm:hidden">
      {rows.map((row) => (
        <div key={row.key} className="py-2">
          <Link href={row.href} className="text-sm font-medium underline">
            {row.title}
          </Link>
          <p className="text-xs text-muted-foreground">{row.meta}</p>
        </div>
      ))}
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function Loading() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-16" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new Error("Could not load analytics");
  return response.json() as Promise<T>;
}

interface WorkOrderOverview {
  totalWorkOrders: number;
  completedWorkOrders: number;
  onHoldWorkOrders: number;
  completionRate: number;
  overdueWorkOrders: number;
  avgResolutionTimeHours: number;
  laborCost: number;
  partsCost: number;
  storeCost: number;
  totalCost: number;
  byStatus: { status: string; count: number }[];
  detailedRecords: {
    id: string;
    name: string;
    status: string;
    assignedToName: string;
    propertyName: string;
    estimatedCompletionDate: string | null;
    actualCompletionDate: string | null;
  }[];
}

interface TechnicianRow {
  technicianId: string;
  technicianName: string;
  tasksCompleted: number;
  tasksAssigned: number;
  totalHoursLogged: number;
  completionRate: number;
  taskDetails: { taskId: string; taskName: string; status: string; propertyName: string; completionDate: string | null }[];
}

interface FacilityRow {
  propertyId: string;
  propertyName: string;
  totalWorkOrders: number;
  completedWorkOrders: number;
  openWorkOrders: number;
  totalMaintenanceCost: number;
  workOrderDetails: {
    taskId: string;
    taskName: string;
    status: string;
    assignedToName: string;
    completionDate: string | null;
  }[];
}

function WorkOrderFocus({ query }: { query: string }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["/api/analytics/work-orders", query],
    queryFn: () => fetchJson<WorkOrderOverview>(`/api/analytics/work-orders?${query}`),
  });
  if (isLoading) return <Loading />;
  if (isError || !data) {
    return (
      <button type="button" className="text-sm underline" onClick={() => void refetch()}>
        Could not load work orders. Try again.
      </button>
    );
  }
  const open = Math.max(0, data.totalWorkOrders - data.completedWorkOrders);
  const rows = data.detailedRecords.slice(0, 25);
  return (
    <div className="space-y-3" data-testid="analytics-focus-orders">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
        <Figure label="Work orders" value={String(data.totalWorkOrders)} />
        <Figure label="Completion" value={`${data.completionRate}%`} />
        <Figure label="Still open" value={String(open)} />
        <Figure label="On hold" value={String(data.onHoldWorkOrders)} />
        <Figure label="Past due" value={String(data.overdueWorkOrders)} />
        <Figure label="Avg hours to finish" value={String(data.avgResolutionTimeHours)} />
        <Figure label="Total cost" value={data.totalCost.toLocaleString("en-US", { style: "currency", currency: "USD" })} />
      </div>
      <StatusPieChart data={data.byStatus} title="Status" formatStatusLabel={statusLabel} />
      <Card>
        <CardHeader className="p-3 pb-0">
          <CardTitle className="text-sm">Jobs in this view</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <MobileJobs
            empty="No work orders match these filters."
            rows={rows.map((row) => ({
              key: row.id,
              title: row.name,
              href: `/tasks/${row.id}`,
              meta: `${statusLabel(row.status)} · ${row.propertyName} · ${row.assignedToName || "Unassigned"} · Due ${formatWhen(row.estimatedCompletionDate)}`,
            }))}
          />
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      No work orders match these filters.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link href={`/tasks/${row.id}`} className="underline">
                        {row.name}
                      </Link>
                    </TableCell>
                    <TableCell>{statusLabel(row.status)}</TableCell>
                    <TableCell>{row.propertyName}</TableCell>
                    <TableCell>{row.assignedToName || "Unassigned"}</TableCell>
                    <TableCell>{formatWhen(row.estimatedCompletionDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TeamFocus({ query }: { query: string }) {
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["/api/analytics/technicians", query],
    queryFn: () => fetchJson<TechnicianRow[]>(`/api/analytics/technicians?${query}`),
  });
  if (isLoading) return <Loading />;
  if (isError) {
    return (
      <button type="button" className="text-sm underline" onClick={() => void refetch()}>
        Could not load the team. Try again.
      </button>
    );
  }
  const finished = data.reduce((sum, person) => sum + person.tasksCompleted, 0);
  const assigned = data.reduce((sum, person) => sum + person.tasksAssigned, 0);
  const hours = Math.round(data.reduce((sum, person) => sum + person.totalHoursLogged, 0) * 10) / 10;
  const jobs = data.flatMap((person) =>
    person.taskDetails.map((task) => ({ ...task, person: person.technicianName })),
  );
  return (
    <div className="space-y-3" data-testid="analytics-focus-team">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Figure label="People" value={String(data.length)} />
        <Figure label="Finished" value={String(finished)} />
        <Figure label="Still open" value={String(Math.max(0, assigned - finished))} />
        <Figure label="Hours logged" value={`${hours}h`} />
      </div>
      <CountBarChart
        title="Finished jobs"
        data={[...data]
          .sort((a, b) => b.tasksCompleted - a.tasksCompleted)
          .slice(0, 8)
          .map((person) => ({ name: person.technicianName, value: person.tasksCompleted }))}
      />
      <Card>
        <CardHeader className="p-3 pb-0">
          <CardTitle className="text-sm">Recent jobs</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <MobileJobs
            empty="No jobs match these filters."
            rows={jobs.slice(0, 25).map((job) => ({
              key: `${job.person}-${job.taskId}`,
              title: job.taskName,
              href: `/tasks/${job.taskId}`,
              meta: `${job.person} · ${statusLabel(job.status)} · ${job.propertyName}`,
            }))}
          />
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Property</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.slice(0, 25).map((job) => (
                  <TableRow key={`${job.person}-${job.taskId}`}>
                    <TableCell>{job.person}</TableCell>
                    <TableCell>
                      <Link href={`/tasks/${job.taskId}`} className="underline">
                        {job.taskName}
                      </Link>
                    </TableCell>
                    <TableCell>{statusLabel(job.status)}</TableCell>
                    <TableCell>{job.propertyName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PropertyFocus({ query }: { query: string }) {
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["/api/analytics/facilities", query],
    queryFn: () => fetchJson<FacilityRow[]>(`/api/analytics/facilities?${query}`),
  });
  if (isLoading) return <Loading />;
  if (isError) {
    return (
      <button type="button" className="text-sm underline" onClick={() => void refetch()}>
        Could not load properties. Try again.
      </button>
    );
  }
  const jobs = data.reduce((sum, property) => sum + property.totalWorkOrders, 0);
  const open = data.reduce((sum, property) => sum + property.openWorkOrders, 0);
  const cost = data.reduce((sum, property) => sum + property.totalMaintenanceCost, 0);
  const rows = data.flatMap((property) =>
    property.workOrderDetails.map((job) => ({ ...job, property: property.propertyName })),
  );
  const ranked = [...data].sort((a, b) => b.totalWorkOrders - a.totalWorkOrders);
  return (
    <div className="space-y-3" data-testid="analytics-focus-property">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Figure label="Properties" value={String(data.length)} />
        <Figure label="Jobs" value={String(jobs)} />
        <Figure label="Still open" value={String(open)} />
        <Figure label="Parts and labor" value={`$${cost.toLocaleString()}`} />
      </div>
      <CountBarChart
        title={ranked.length > 8 ? "Top properties" : "Jobs by property"}
        data={ranked.slice(0, 8).map((property) => ({ name: property.propertyName, value: property.totalWorkOrders }))}
      />
      <Card>
        <CardHeader className="p-3 pb-0">
          <CardTitle className="text-sm">Jobs in this view</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <MobileJobs
            empty="No jobs match these filters."
            rows={rows.slice(0, 25).map((job) => ({
              key: `${job.property}-${job.taskId}`,
              title: job.taskName,
              href: `/tasks/${job.taskId}`,
              meta: `${job.property} · ${statusLabel(job.status)} · ${job.assignedToName || "Unassigned"}`,
            }))}
          />
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 25).map((job) => (
                  <TableRow key={job.taskId}>
                    <TableCell>{job.property}</TableCell>
                    <TableCell>
                      <Link href={`/tasks/${job.taskId}`} className="underline">
                        {job.taskName}
                      </Link>
                    </TableCell>
                    <TableCell>{statusLabel(job.status)}</TableCell>
                    <TableCell>{job.assignedToName || "Unassigned"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AnalyticsFocus() {
  const { activeTab, buildQueryString, roleFilter } = useAnalyticsFilters();
  const query = buildQueryString(activeTab === "technicians" && roleFilter !== "all" ? { roleType: roleFilter } : undefined);
  if (activeTab === "work-orders") return <WorkOrderFocus query={query} />;
  if (activeTab === "technicians") return <TeamFocus query={query} />;
  if (activeTab === "facilities") return <PropertyFocus query={query} />;
  return null;
}

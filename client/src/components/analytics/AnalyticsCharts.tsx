import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const STATUS_COLORS: Record<string, string> = {
  completed: "hsl(142, 76%, 36%)",
  in_progress: "hsl(221, 83%, 53%)",
  on_hold: "hsl(45, 93%, 47%)",
  not_started: "hsl(0, 0%, 60%)",
  needs_estimate: "hsl(262, 83%, 58%)",
  waiting_approval: "hsl(280, 65%, 60%)",
  ready: "hsl(173, 58%, 39%)",
  pending: "hsl(45, 93%, 47%)",
  under_review: "hsl(221, 83%, 53%)",
  converted_to_task: "hsl(142, 76%, 36%)",
  rejected: "hsl(0, 84%, 60%)",
  planning: "hsl(0, 0%, 60%)",
  cancelled: "hsl(0, 84%, 60%)",
  available: "hsl(142, 76%, 36%)",
  in_use: "hsl(221, 83%, 53%)",
  needs_maintenance: "hsl(0, 84%, 60%)",
  needs_cleaning: "hsl(45, 93%, 47%)",
  out_of_service: "hsl(0, 0%, 45%)",
  reserved: "hsl(173, 58%, 39%)",
};

const URGENCY_COLORS: Record<string, string> = {
  high: "hsl(0, 84%, 60%)",
  medium: "hsl(45, 93%, 47%)",
  low: "hsl(142, 76%, 36%)",
};

interface StatusChartProps {
  data: { status: string; count: number }[];
  title?: string;
  formatStatusLabel?: (status: string) => string;
}

export function StatusPieChart({
  data,
  title = "Work Orders by Status",
  formatStatusLabel,
}: StatusChartProps) {
  const chartData = data.map(d => ({
    name: formatStatusLabel
      ? formatStatusLabel(d.status)
      : d.status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()),
    value: d.count,
    color: STATUS_COLORS[d.status] || COLORS[0],
  }));

  const total = chartData.reduce((acc, d) => acc + d.value, 0);

  return (
    <Card data-testid="chart-status-pie">
      <CardHeader className="p-3 sm:p-4 pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <ResponsiveContainer width="100%" height={180} className="sm:hidden">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value} (${((value/total)*100).toFixed(0)}%)`, '']} />
            </PieChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="100%" height={220} className="hidden sm:block">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-2 sm:hidden">
            {chartData.map((entry, index) => (
              <div key={index} className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface UrgencyChartProps {
  data: { urgency: string; count: number }[];
  title?: string;
  formatUrgencyLabel?: (urgency: string) => string;
}

export function UrgencyBarChart({
  data,
  title = "Work Orders by Urgency",
  formatUrgencyLabel,
}: UrgencyChartProps) {
  const chartData = data.map(d => ({
    name: formatUrgencyLabel
      ? formatUrgencyLabel(d.urgency)
      : d.urgency.charAt(0).toUpperCase() + d.urgency.slice(1),
    value: d.count,
    fill: URGENCY_COLORS[d.urgency] || COLORS[0],
  }));

  return (
    <Card data-testid="chart-urgency-bar">
      <CardHeader className="p-3 sm:p-4 pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        <ResponsiveContainer width="100%" height={180} className="sm:hidden">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" width={55} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height={220} className="hidden sm:block">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={80} />
            <Tooltip />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface TrendChartProps {
  data: { month: string; count: number; completed: number }[];
  title?: string;
}

interface ServiceRequestTrendProps {
  data: { month: string; submitted: number; converted: number }[];
  title?: string;
  /** Legend / series name for converted count (ops label: Approved) */
  convertedSeriesLabel?: string;
}

export function ServiceRequestTrendChart({
  data,
  title = "Monthly request volume",
  convertedSeriesLabel = "Approved",
}: ServiceRequestTrendProps) {
  const chartData = data.map((d) => {
    const label = d.month.includes("-") ? d.month.split("-")[1] : d.month;
    return {
      name: label,
      Submitted: d.submitted,
      [convertedSeriesLabel]: d.converted,
    };
  });

  return (
    <Card data-testid="chart-request-trend">
      <CardHeader className="p-3 sm:p-4 pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: "10px" }} />
            <Line type="monotone" dataKey="Submitted" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey={convertedSeriesLabel} stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function MonthlyTrendChart({ data, title = "Monthly Work Order Trend" }: TrendChartProps) {
  const chartData = data.map(d => ({
    name: d.month.substring(0, 3),
    Created: d.count,
    Completed: d.completed,
  }));

  return (
    <Card data-testid="chart-monthly-trend">
      <CardHeader className="p-3 sm:p-4 pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        <ResponsiveContainer width="100%" height={200} className="sm:hidden">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} />
            <YAxis tick={{ fontSize: 9 }} width={30} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <Line type="monotone" dataKey="Created" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="Completed" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height={280} className="hidden sm:block">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Created" stroke="hsl(var(--chart-1))" strokeWidth={2} />
            <Line type="monotone" dataKey="Completed" stroke="hsl(var(--chart-2))" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface PropertyChartProps {
  data: { propertyName: string; count: number }[];
  title?: string;
}

export function PropertyBarChart({ data, title = "Work Orders by Property" }: PropertyChartProps) {
  const chartData = data.slice(0, 6).map(d => ({
    name: d.propertyName.length > 10 ? d.propertyName.substring(0, 10) + "..." : d.propertyName,
    fullName: d.propertyName,
    value: d.count,
  }));

  return (
    <Card data-testid="chart-property-bar">
      <CardHeader className="p-3 sm:p-4 pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        <ResponsiveContainer width="100%" height={200} className="sm:hidden">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 9 }} />
            <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 9 }} />
            <Tooltip formatter={(value, name, props) => [value, props.payload.fullName]} />
            <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height={280} className="hidden sm:block">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value, name, props) => [value, props.payload.fullName]} />
            <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface TechnicianChartProps {
  data: { technicianName: string; tasksCompleted: number; totalHoursLogged: number }[];
  title?: string;
}

export function TechnicianPerformanceChart({ data, title = "Technician Performance" }: TechnicianChartProps) {
  const chartData = data.slice(0, 6).map(d => ({
    name: d.technicianName.split(' ')[0].substring(0, 8),
    fullName: d.technicianName,
    "Tasks": d.tasksCompleted,
    "Hours": d.totalHoursLogged,
  }));

  return (
    <Card data-testid="chart-technician-performance">
      <CardHeader className="p-3 sm:p-4 pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        <ResponsiveContainer width="100%" height={200} className="sm:hidden">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} />
            <YAxis tick={{ fontSize: 9 }} width={30} />
            <Tooltip formatter={(value, name, props) => [value, `${name} (${props.payload.fullName})`]} />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <Bar dataKey="Tasks" fill="hsl(var(--chart-1))" />
            <Bar dataKey="Hours" fill="hsl(var(--chart-2))" />
          </BarChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height={280} className="hidden sm:block">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip formatter={(value, name, props) => [value, `${name} (${props.payload.fullName})`]} />
            <Legend />
            <Bar dataKey="Tasks" name="Tasks Completed" fill="hsl(var(--chart-1))" />
            <Bar dataKey="Hours" name="Hours Logged" fill="hsl(var(--chart-2))" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface WeeklyTrendData {
  week: string;
  created: number;
  completed: number;
  high: number;
}

interface WeeklyTrendChartProps {
  data: WeeklyTrendData[];
  title?: string;
}

interface CountBarChartProps {
  data: { name: string; value: number }[];
  title: string;
  testId?: string;
  layout?: "vertical" | "horizontal";
}

export function CountBarChart({
  data,
  title,
  testId = "chart-count-bar",
  layout = "vertical",
}: CountBarChartProps) {
  const chartData = data.map((d, i) => ({
    name: d.name.length > 14 ? `${d.name.slice(0, 14)}…` : d.name,
    fullName: d.name,
    value: d.value,
    fill: COLORS[i % COLORS.length],
  }));

  if (chartData.length === 0) return null;

  const isVertical = layout === "vertical";

  return (
    <Card data-testid={testId}>
      <CardHeader className="p-3 sm:p-4 pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        <ResponsiveContainer width="100%" height={isVertical ? 220 : 200}>
          <BarChart data={chartData} layout={isVertical ? "vertical" : "horizontal"}>
            <CartesianGrid strokeDasharray="3 3" horizontal={!isVertical} />
            {isVertical ? (
              <>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
              </>
            ) : (
              <>
                <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} />
                <YAxis tick={{ fontSize: 9 }} width={30} />
              </>
            )}
            <Tooltip formatter={(value, _name, props) => [value, props.payload.fullName]} />
            <Bar dataKey="value" radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export interface FunnelStageData {
  label: string;
  count: number;
  avgHoursInStage: number | null;
}

interface RequestFunnelChartProps {
  stages: FunnelStageData[];
  title?: string;
}

export function RequestFunnelChart({
  stages,
  title = "Request pipeline",
}: RequestFunnelChartProps) {
  const max = Math.max(...stages.map((s) => s.count), 1);

  return (
    <Card data-testid="chart-request-funnel">
      <CardHeader className="p-3 sm:p-4 pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
        {stages.map((stage) => (
          <div key={stage.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium">{stage.label}</span>
              <span className="text-muted-foreground">
                {stage.count}
                {stage.avgHoursInStage != null && ` · ~${stage.avgHoursInStage}h in stage`}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.max((stage.count / max) * 100, stage.count > 0 ? 4 : 0)}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

interface SimpleLineChartProps {
  data: { label: string; value: number }[];
  title: string;
  testId?: string;
  valueLabel?: string;
}

export function SimpleCountLineChart({
  data,
  title,
  testId = "chart-simple-line",
  valueLabel = "Count",
}: SimpleLineChartProps) {
  const chartData = data.map((d) => ({ name: d.label, [valueLabel]: d.value }));

  return (
    <Card data-testid={testId}>
      <CardHeader className="p-3 sm:p-4 pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey={valueLabel} stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function WeeklyTrendChart({ data, title = "Weekly Work Order Trends" }: WeeklyTrendChartProps) {
  const chartData = data.map(d => ({
    name: d.week.substring(5),
    Created: d.created,
    Completed: d.completed,
    "High": d.high,
  }));

  return (
    <Card data-testid="chart-weekly-trend">
      <CardHeader className="p-3 sm:p-4 pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        <ResponsiveContainer width="100%" height={200} className="sm:hidden">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 8 }} interval={0} />
            <YAxis tick={{ fontSize: 9 }} width={25} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: '9px' }} />
            <Line type="monotone" dataKey="Created" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="Completed" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="High" stroke="hsl(0, 84%, 60%)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height={280} className="hidden sm:block">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Created" stroke="hsl(var(--chart-1))" strokeWidth={2} />
            <Line type="monotone" dataKey="Completed" stroke="hsl(var(--chart-2))" strokeWidth={2} />
            <Line type="monotone" dataKey="High" name="High Priority" stroke="hsl(0, 84%, 60%)" strokeWidth={2} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

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
};

const URGENCY_COLORS: Record<string, string> = {
  high: "hsl(0, 84%, 60%)",
  medium: "hsl(45, 93%, 47%)",
  low: "hsl(142, 76%, 36%)",
};

interface BarChartData {
  name: string;
  value: number;
  [key: string]: any;
}

interface StatusChartProps {
  data: { status: string; count: number }[];
  title?: string;
}

export function StatusPieChart({ data, title = "Work Orders by Status" }: StatusChartProps) {
  const chartData = data.map(d => ({
    name: d.status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()),
    value: d.count,
    color: STATUS_COLORS[d.status] || COLORS[0],
  }));

  return (
    <Card data-testid="chart-status-pie">
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
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
      </CardContent>
    </Card>
  );
}

interface UrgencyChartProps {
  data: { urgency: string; count: number }[];
  title?: string;
}

export function UrgencyBarChart({ data, title = "Work Orders by Urgency" }: UrgencyChartProps) {
  const chartData = data.map(d => ({
    name: d.urgency.charAt(0).toUpperCase() + d.urgency.slice(1),
    value: d.count,
    fill: URGENCY_COLORS[d.urgency] || COLORS[0],
  }));

  return (
    <Card data-testid="chart-urgency-bar">
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
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

export function MonthlyTrendChart({ data, title = "Monthly Work Order Trend" }: TrendChartProps) {
  const chartData = data.map(d => ({
    name: d.month,
    Created: d.count,
    Completed: d.completed,
  }));

  return (
    <Card data-testid="chart-monthly-trend">
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
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
  const chartData = data.slice(0, 8).map(d => ({
    name: d.propertyName.length > 15 ? d.propertyName.substring(0, 15) + "..." : d.propertyName,
    value: d.count,
  }));

  return (
    <Card data-testid="chart-property-bar">
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
            <Tooltip />
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
  const chartData = data.slice(0, 10).map(d => ({
    name: d.technicianName.length > 12 ? d.technicianName.substring(0, 12) + "..." : d.technicianName,
    "Tasks Completed": d.tasksCompleted,
    "Hours Logged": d.totalHoursLogged,
  }));

  return (
    <Card data-testid="chart-technician-performance">
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Tasks Completed" fill="hsl(var(--chart-1))" />
            <Bar dataKey="Hours Logged" fill="hsl(var(--chart-2))" />
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

export function WeeklyTrendChart({ data, title = "Weekly Work Order Trends" }: WeeklyTrendChartProps) {
  const chartData = data.map(d => ({
    name: d.week,
    Created: d.created,
    Completed: d.completed,
    "High Priority": d.high,
  }));

  return (
    <Card data-testid="chart-weekly-trend">
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Created" stroke="hsl(var(--chart-1))" strokeWidth={2} />
            <Line type="monotone" dataKey="Completed" stroke="hsl(var(--chart-2))" strokeWidth={2} />
            <Line type="monotone" dataKey="High Priority" stroke="hsl(0, 84%, 60%)" strokeWidth={2} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

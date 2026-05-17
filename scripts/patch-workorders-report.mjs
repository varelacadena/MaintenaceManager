import fs from "fs";

const path = "client/src/pages/analytics/reports/WorkOrdersReport.tsx";
let s = fs.readFileSync(path, "utf8");

const startMarker = '      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">';
const idx = s.indexOf(startMarker);
const detailMarker = '            <CardTitle className="text-sm font-medium">Work Orders Detail</CardTitle>';
let end = s.indexOf(detailMarker);
if (end > 0) end = s.lastIndexOf("      <Card>", end);

const replacement = `      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {data && <StatusPieChart data={data.byStatus} title="Work order status" />}
        {data && <UrgencyBarChart data={data.byUrgency} title="Work orders by priority" />}
        <Card className="lg:col-span-1">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Performance metrics</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <CircleDashed className="w-4 h-4 text-gray-500" />
                <span className="text-sm">Not started</span>
              </div>
              <span className="font-semibold">{data?.notStartedWorkOrders || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <PauseCircle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm">On hold</span>
              </div>
              <span className="font-semibold">{data?.onHoldWorkOrders || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Avg time to start</span>
              </div>
              <span className="font-semibold">{data?.avgResponseTimeHours || 0}h</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-600" />
                <span className="text-sm">Avg resolution</span>
              </div>
              <span className="font-semibold">{data?.avgResolutionTimeHours || 0}h</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {data?.byTaskType && data.byTaskType.length > 0 && (
          <CountBarChart
            title="By work order type"
            testId="chart-task-type"
            data={data.byTaskType.map((t) => ({ name: formatTaskTypeLabel(t.taskType), value: t.count }))}
          />
        )}
        {data?.byCategory && data.byCategory.length > 0 && (
          <CountBarChart
            title="By request category"
            testId="chart-request-category"
            data={data.byCategory.map((c) => ({ name: c.category, value: c.count }))}
          />
        )}
        {data?.byRequesterRole && data.byRequesterRole.length > 0 && (
          <CountBarChart
            title="By requester role"
            testId="chart-requester-role"
            data={data.byRequesterRole.map((r) => ({ name: r.role, value: r.count }))}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data && <MonthlyTrendChart data={data.monthlyTrend} title="Monthly work order trend" />}
        {data && (
          <PropertyBarChart
            data={data.byProperty.map((p) => ({ propertyName: p.propertyName, count: p.count }))}
            title="Work orders by property"
          />
        )}
      </div>

`;

if (idx < 0 || end < 0) {
  console.error("markers not found", idx, end);
  process.exit(1);
}

s = s.slice(0, idx) + replacement + s.slice(end);
s = s.replace("            </motion.div>\n            <div className=\"flex items-center justify-between p-3 rounded-lg bg-muted/50\">\n              <div className=\"flex items-center gap-2\">\n                <Clock className=\"w-4 h-4 text-green-600\" />", "            </div>\n            <div className=\"flex items-center justify-between p-3 rounded-lg bg-muted/50\">\n              <div className=\"flex items-center gap-2\">\n                <Clock className=\"w-4 h-4 text-green-600\" />");
s = s.replace(
  /borderColor: URGENCY_COLORS\[record\.urgency\],\s*color: URGENCY_COLORS\[record\.urgency\],/,
  'borderColor: record.urgency === "high" ? "#ef4444" : record.urgency === "medium" ? "#eab308" : "#22c55e", color: record.urgency === "high" ? "#ef4444" : record.urgency === "medium" ? "#eab308" : "#22c55e",',
);

fs.writeFileSync(path, s);
console.log("patched");

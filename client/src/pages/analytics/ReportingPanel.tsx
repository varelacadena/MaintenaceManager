import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import {
  costByPropertyChart,
  tasksByPropertyChart,
  technicianHoursChart,
} from "@shared/plantServicesCharts";
import {
  formatHours,
  formatMoney,
  formatShortDate,
  type PlantServicesReport,
} from "@shared/plantServicesReport";
import { Button } from "@/components/ui/button";
import { useAnalyticsFilters, type ReportDocumentKind } from "./useAnalyticsFilters";

const DOCUMENTS: Record<ReportDocumentKind, { title: string; file: string }> = {
  "maintenance-record": { title: "Maintenance Record", file: "Word" },
  "work-report": { title: "Work Report", file: "Word" },
  "data-export": { title: "Data Export", file: "Excel" },
};

function useDebounced(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function reportingSearch(filters: { startDate: string; endDate: string; propertyId: string; technicianId: string }): string {
  const params = new URLSearchParams();
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.propertyId) params.set("propertyId", filters.propertyId);
  if (filters.technicianId) params.set("technicianId", filters.technicianId);
  return params.toString();
}

function ChartFigure({ svg, caption }: { svg: string; caption: string }) {
  const markup = svg.replace(/^<\?xml[^>]*>\s*/, "");
  return (
    <figure className="my-3">
      <div className="[&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: markup }} />
      <figcaption className="mt-1 text-center text-[9pt] italic text-[#595959]">{caption}</figcaption>
    </figure>
  );
}

function Paper({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-auto rounded-md border bg-neutral-100 p-3 md:p-6" data-testid="reporting-preview">
      <article
        className="mx-auto bg-white text-[#222] shadow-md"
        style={{
          width: "8.5in",
          minHeight: "11in",
          padding: "0.9in 1in",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: "10.5pt",
          lineHeight: 1.15,
        }}
      >
        {children}
      </article>
    </div>
  );
}

function Eyebrow() {
  return (
    <p className="mb-1 text-[9pt] font-bold tracking-[0.08em] text-[#595959]">HARTLAND COLLEGE | PLANT SERVICES</p>
  );
}

function DocTitle({ children, size }: { children: string; size: string }) {
  return (
    <h2 className="mb-2 font-bold text-[#1F3A5F]" style={{ fontSize: size }}>
      {children}
    </h2>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <h3 className="mb-2 mt-6 text-[14pt] font-bold text-[#1F3A5F]">{children}</h3>;
}

function MoneyTiles({ report }: { report: PlantServicesReport }) {
  const tiles = [
    [String(report.totals.tasks), report.totals.tasks === 1 ? "Task completed" : "Tasks completed"],
    [String(report.totals.properties), report.totals.properties === 1 ? "Property served" : "Properties served"],
    [formatHours(report.totals.hours), "Labor hours"],
    [formatMoney(report.totals.laborCost), "Labor cost"],
    [formatMoney(report.totals.materialsCost), "Parts and materials"],
    [formatMoney(report.totals.totalCost), "Total value"],
  ];
  return (
    <div className="my-3 grid grid-cols-3 gap-px border border-[#D0D5DD] bg-[#D0D5DD]">
      {tiles.map(([value, label]) => (
        <div key={label} className="bg-[#EAF0F7] px-2 py-3 text-center">
          <div className="text-[15pt] font-bold text-[#1F3A5F]">{value}</div>
          <div className="text-[8pt] text-[#595959]">{label}</div>
        </div>
      ))}
    </div>
  );
}

function NavyTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <table className="w-full border-collapse text-[10pt]">
      <thead>
        <tr>
          {headers.map((header) => (
            <th key={header} className="border border-[#1F3A5F] bg-[#1F3A5F] px-2 py-1.5 text-left font-bold text-white">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="border border-[#D0D5DD] px-2 py-1 align-top">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MaintenancePreview({ report }: { report: PlantServicesReport }) {
  return (
    <Paper>
      <Eyebrow />
      <DocTitle size="20pt">Maintenance Record</DocTitle>
      {report.buildings.length === 1 && report.buildings[0] && (
        <p className="mb-1">
          <span className="font-bold">Building / Area: </span>
          {report.buildings[0].propertyName}
        </p>
      )}
      <p className="mb-3">
        <span className="font-bold">Period: </span>
        {report.periodLabel}
      </p>
      {report.buildings.length === 0 && <p>{report.summary}</p>}
      {report.buildings.map((building) => (
        <section key={building.propertyName} className="mb-6">
          {report.buildings.length > 1 && (
            <p className="mb-2 mt-4">
              <span className="font-bold">Building / Area: </span>
              {building.propertyName}
            </p>
          )}
          <NavyTable
            headers={["Date", "Location", "Work Performed", "Performed By"]}
            rows={building.rows.map((row) => [row.date, row.location, row.workPerformed, row.performedBy])}
          />
        </section>
      ))}
    </Paper>
  );
}

function WorkReportPreview({ report }: { report: PlantServicesReport }) {
  const byTasks = [...report.properties].sort((a, b) => b.tasks - a.tasks || a.name.localeCompare(b.name));
  return (
    <Paper>
      <Eyebrow />
      <DocTitle size="22pt">Work Report</DocTitle>
      <p className="text-[12pt] text-[#404040]">{report.periodLabel}</p>
      <p className="mb-3 mt-1 text-[9pt] italic text-[#595959]">{report.preparedLabel}</p>
      <SectionTitle>1. Summary</SectionTitle>
      <p className="mb-2">{report.summary}</p>
      <MoneyTiles report={report} />
      {report.highlights && <p className="mt-3">{report.highlights}</p>}
      <SectionTitle>2. How the Work Was Spread</SectionTitle>
      <p>The charts below show where the team&apos;s time went and which properties needed the most work.</p>
      {!report.empty && (
        <>
          <ChartFigure
            svg={technicianHoursChart(report.technicians.map((person) => ({ name: person.name, hours: person.hours, tasks: person.tasks }))).svg}
            caption="Figure 1. Hours logged and tasks worked, by technician"
          />
          <ChartFigure
            svg={tasksByPropertyChart(byTasks.map((row) => ({ name: row.name, tasks: row.tasks }))).svg}
            caption="Figure 2. Tasks completed, by property"
          />
          <ChartFigure
            svg={costByPropertyChart(report.properties.map((row) => ({ name: row.name, laborCost: row.laborCost, materialsCost: row.materialsCost }))).svg}
            caption="Figure 3. Cost of work, by property"
          />
        </>
      )}
      <SectionTitle>3. Technician Contributions</SectionTitle>
      <p className="mb-3">
        Each technician&apos;s impact is shown three ways: how many tasks they worked on, how many hours they put in, and how many tasks they led. The lead on a task is the technician who logged the most hours on it.
      </p>
      {report.technicians.length > 0 && (
        <NavyTable
          headers={["Technician", "Tasks", "Hours", "% of Hours", "Labor Cost", "Tasks Led"]}
          rows={report.technicians.map((person) => [
            person.name,
            String(person.tasks),
            formatHours(person.hours),
            `${person.percentOfHours}%`,
            formatMoney(person.laborCost),
            String(person.tasksLed),
          ])}
        />
      )}
      {report.technicians.map((person) => (
        <section key={person.name}>
          <h4 className="mb-1 mt-4 text-[12pt] font-bold text-[#1F3A5F]">{person.name}</h4>
          <p>{person.narrative}</p>
        </section>
      ))}
      <SectionTitle>4. Completed Task Log</SectionTitle>
      <p className="mb-3">Value is labor plus parts and materials for each task.</p>
      <NavyTable
        headers={["Date", "Where", "What Was Done", "Technicians", "Value"]}
        rows={[
          ...report.taskLog.map((row) => [
            row.date,
            <span key={row.date + row.description}>
              {row.propertyName}
              {row.location && <span className="block text-[9pt] text-[#595959]">{row.location}</span>}
            </span>,
            row.description,
            row.technicians,
            formatMoney(row.value),
          ]),
          ["", "", "", <span key="total" className="font-bold">Total value of work completed</span>, <span key="value" className="font-bold">{formatMoney(report.totals.totalCost)}</span>],
        ]}
      />
      <SectionTitle>5. Notes</SectionTitle>
      {report.notes.map((note) => (
        <p key={note} className="mb-2">{note}</p>
      ))}
    </Paper>
  );
}

function SheetTable({ headers, rows, hideHeader = false }: { headers: string[]; rows: (string | number)[][]; hideHeader?: boolean }) {
  return (
    <div className="overflow-auto">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead>
          {!hideHeader && (
            <tr>
              {headers.map((header) => (
                <th key={header} className="whitespace-nowrap border border-[#1F3A5F] bg-[#1F3A5F] px-2 py-2 text-center text-[10pt] font-bold text-white">
                  {header}
                </th>
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td className="border border-[#D0D5DD] px-2 py-3 text-[#595959]" colSpan={headers.length}>
                No rows for this period.
              </td>
            </tr>
          )}
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border border-[#D0D5DD] px-2 py-1 align-top font-[Arial,Helvetica,sans-serif] text-[10pt]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DataExportPreview({ report }: { report: PlantServicesReport }) {
  const [sheet, setSheet] = useState("Summary");
  const sheets = ["Summary", "Tasks", "Technicians", "TimeEntries", "Purchases"];
  const properties = [...report.properties].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="overflow-hidden rounded-md border bg-white" data-testid="reporting-preview">
      <div className="flex gap-1 overflow-auto border-b bg-neutral-100 px-2 pt-2">
        {sheets.map((name) => (
          <button
            key={name}
            type="button"
            className={`rounded-t px-3 py-1.5 text-sm ${sheet === name ? "bg-white font-semibold text-[#1F3A5F]" : "text-muted-foreground"}`}
            onClick={() => setSheet(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="p-4 font-[Arial,Helvetica,sans-serif]">
        {sheet === "Summary" && (
          <div className="max-w-3xl space-y-4">
            <div>
              <h2 className="text-[14pt] font-bold text-[#1F3A5F]">Plant Services Work Data Export</h2>
              <p className="text-[9pt] italic text-[#595959]">Completed technician work for the selected period, buildings, and technicians.</p>
            </div>
            <div className="grid grid-cols-[12rem_8rem] gap-px text-[10pt]">
              <div className="font-bold">Report period start</div>
              <div className="bg-[#FFFF99] px-2 text-[#0000FF]">{report.startDate ? formatShortDate(report.startDate) : "All dates"}</div>
              <div className="font-bold">Report period end</div>
              <div className="bg-[#FFFF99] px-2 text-[#0000FF]">{report.endDate ? formatShortDate(report.endDate) : report.startDate ? "" : "All dates"}</div>
            </div>
            <div>
              <h3 className="mb-1 text-[11pt] font-bold text-[#1F3A5F]">Key Figures</h3>
              <SheetTable
                hideHeader
                headers={["Figure", "Value"]}
                rows={[
                  ["Tasks completed", String(report.totals.tasks)],
                  ["Labor hours", formatHours(report.totals.hours)],
                  ["Labor cost", formatMoney(report.totals.laborCost)],
                  ["Materials / parts", formatMoney(report.totals.materialsCost)],
                  ["Total cost", formatMoney(report.totals.totalCost)],
                ]}
              />
            </div>
            <div>
              <h3 className="mb-1 text-[11pt] font-bold text-[#1F3A5F]">By Technician</h3>
              <SheetTable
                headers={["Technician", "Tasks Worked", "Hours", "Labor Cost"]}
                rows={report.technicians.map((person) => [person.name, person.tasks, formatHours(person.hours), formatMoney(person.laborCost)])}
              />
            </div>
            <div>
              <h3 className="mb-1 text-[11pt] font-bold text-[#1F3A5F]">By Property</h3>
              <SheetTable
                headers={["Property", "Tasks", "Hours", "Total Cost"]}
                rows={properties.map((property) => [property.name, property.tasks, formatHours(property.hours), formatMoney(property.totalCost)])}
              />
            </div>
            <div>
              <h3 className="mb-1 text-[11pt] font-bold text-[#1F3A5F]">Notes</h3>
              <ul className="list-disc space-y-1 pl-5 text-[10pt]">
                <li>Tasks sheet: one row per completed job. Hours and costs are calculated from Time Entries and Purchases.</li>
                <li>Time Entries sheet: one row per technician per job. Labor cost = hours × $15.</li>
                <li>Purchases sheet: receipt totals tied to each job. Parts and materials are those totals.</li>
                {report.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {sheet === "Tasks" && (
          <SheetTable
            headers={["Date Completed", "Property", "Location", "Description", "Priority", "Status", "Technicians", "Labor Hours", "Labor Cost", "Materials / Parts", "Total Cost"]}
            rows={report.taskLog.map((row) => [row.date, row.propertyName, row.location, row.description, row.priority, row.status, row.technicians, formatHours(row.hours), formatMoney(row.laborCost), formatMoney(row.materialsCost), formatMoney(row.value)])}
          />
        )}
        {sheet === "Technicians" && (
          <SheetTable
            headers={["Technician", "Hourly Rate ($)"]}
            rows={report.technicianRates.map((person) => [person.name, formatMoney(person.hourlyRate)])}
          />
        )}
        {sheet === "TimeEntries" && (
          <SheetTable
            headers={["Date", "Property", "Location", "Description", "Technician", "Hours", "Hourly Rate", "Labor Cost"]}
            rows={report.timeEntries.map((row) => [row.date, row.propertyName, row.location, row.description, row.technician, formatHours(row.hours), formatMoney(row.hourlyRate), formatMoney(row.laborCost)])}
          />
        )}
        {sheet === "Purchases" && (
          <SheetTable
            headers={["Date", "Store", "Item", "Amount", "Property", "Location", "Work Performed"]}
            rows={report.purchases.map((row) => [row.date, row.storeName, row.item, formatMoney(row.amount), row.propertyName, row.location, row.description])}
          />
        )}
      </div>
    </div>
  );
}

export default function ReportingPanel() {
  const { filters, reportDocument } = useAnalyticsFilters();
  const search = useDebounced(reportingSearch(filters), 400);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const documentMeta = DOCUMENTS[reportDocument];
  const reportQuery = useQuery<PlantServicesReport>({
    queryKey: ["/api/analytics/reporting", search],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/reporting?${search}`, { credentials: "include" });
      if (!response.ok) throw new Error("Could not build the report");
      return response.json();
    },
  });

  const download = async () => {
    setDownloading(true);
    setDownloadError("");
    try {
      const params = new URLSearchParams(search);
      params.set("document", reportDocument);
      const response = await fetch(`/api/analytics/reporting/download?${params.toString()}`, { credentials: "include" });
      if (!response.ok) throw new Error("Could not download the document");
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "report";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Could not download the document");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{documentMeta.title}</p>
          <p className="text-xs text-muted-foreground">This is the {documentMeta.file} document. It updates when you change the filters.</p>
        </div>
        <Button type="button" onClick={() => void download()} disabled={downloading || !reportQuery.data} data-testid="reporting-download">
          <Download className="mr-2 h-4 w-4" />
          {downloading ? "Preparing…" : `Download ${documentMeta.file}`}
        </Button>
      </div>
      {downloadError && <p className="text-sm text-destructive">{downloadError}</p>}
      {reportQuery.isLoading && <p className="text-sm text-muted-foreground" data-testid="reporting-loading">Building the document…</p>}
      {reportQuery.isError && <p className="text-sm text-destructive">The document could not be built. Try the filters again.</p>}
      {reportQuery.data && reportDocument === "maintenance-record" && <MaintenancePreview report={reportQuery.data} />}
      {reportQuery.data && reportDocument === "work-report" && <WorkReportPreview report={reportQuery.data} />}
      {reportQuery.data && reportDocument === "data-export" && <DataExportPreview report={reportQuery.data} />}
    </div>
  );
}

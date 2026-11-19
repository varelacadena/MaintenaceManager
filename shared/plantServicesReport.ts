/** Completed technician work for the three reporting documents. */

export const LABOR_HOURLY_RATE = 15;

export const REPORT_NAVY = "1F3A5F";
export const REPORT_GREEN = "1F7A6B";
export const REPORT_GRAY = "595959";
export const REPORT_TILE = "EAF0F7";
export const REPORT_YELLOW = "FFFF99";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export interface ReportTaskInput {
  id: string;
  completedOn: string;
  propertyName: string;
  location: string;
  description: string;
  priority: string;
  status: string;
}

export interface ReportTimeInput {
  taskId: string;
  technicianId: string;
  technicianName: string;
  minutes: number;
}

export interface ReportPurchaseInput {
  taskId: string;
  purchasedOn: string;
  storeName: string;
  description: string;
  amount: number;
}

export interface ReportSource {
  startDate: string;
  endDate: string;
  preparedOn: string;
  tasks: ReportTaskInput[];
  time: ReportTimeInput[];
  purchases: ReportPurchaseInput[];
}

export interface MaintenanceRow {
  date: string;
  completedOn: string;
  location: string;
  workPerformed: string;
  performedBy: string;
}

export interface MaintenanceBuilding {
  propertyName: string;
  rows: MaintenanceRow[];
}

export interface TechnicianContribution {
  name: string;
  tasks: number;
  hours: number;
  percentOfHours: number;
  laborCost: number;
  tasksLed: number;
  narrative: string;
}

export interface TaskLogRow {
  completedOn: string;
  date: string;
  propertyName: string;
  location: string;
  description: string;
  technicians: string;
  priority: string;
  status: string;
  hours: number;
  laborCost: number;
  materialsCost: number;
  value: number;
}

export interface PropertyRollup {
  name: string;
  tasks: number;
  hours: number;
  laborCost: number;
  materialsCost: number;
  totalCost: number;
}

export interface TimeEntryRow {
  completedOn: string;
  date: string;
  propertyName: string;
  location: string;
  description: string;
  technician: string;
  hours: number;
  hourlyRate: number;
  laborCost: number;
}

export interface PurchaseRow {
  purchasedOn: string;
  date: string;
  storeName: string;
  item: string;
  amount: number;
  propertyName: string;
  location: string;
  description: string;
}

export interface PlantServicesReport {
  startDate: string;
  endDate: string;
  periodLabel: string;
  preparedLabel: string;
  summary: string;
  highlights: string;
  empty: boolean;
  totals: {
    tasks: number;
    properties: number;
    hours: number;
    laborCost: number;
    materialsCost: number;
    totalCost: number;
  };
  buildings: MaintenanceBuilding[];
  technicians: TechnicianContribution[];
  taskLog: TaskLogRow[];
  properties: PropertyRollup[];
  timeEntries: TimeEntryRow[];
  purchases: PurchaseRow[];
  technicianRates: { name: string; hourlyRate: number }[];
  notes: string[];
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatMoney(value: number): string {
  return roundMoney(value).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function formatHours(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1);
}

/** Split a receipt evenly across its jobs. Shares of jobs outside the report are left out. */
export function attributePurchaseAmounts(
  purchases: { id: string; amount: number; taskIds: string[] }[],
  includedTaskIds: Set<string>,
): { purchaseId: string; taskId: string; amount: number }[] {
  const rows: { purchaseId: string; taskId: string; amount: number }[] = [];
  for (const purchase of purchases) {
    const taskIds = [...new Set(purchase.taskIds.filter(Boolean))];
    if (taskIds.length === 0) continue;
    const cents = Math.max(0, Math.round(purchase.amount * 100));
    const base = Math.floor(cents / taskIds.length);
    let remainder = cents - base * taskIds.length;
    for (const taskId of taskIds) {
      const share = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
      if (!includedTaskIds.has(taskId) || share <= 0) continue;
      rows.push({ purchaseId: purchase.id, taskId, amount: share / 100 });
    }
  }
  return rows;
}

function clean(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function hoursFromMinutes(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10;
}

function laborFromHours(hours: number): number {
  return roundMoney(hours * LABOR_HOURLY_RATE);
}

function sumHours(values: number[]): number {
  return Math.round(values.reduce((sum, value) => sum + value, 0) * 10) / 10;
}

function parseIso(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function formatLongDate(iso: string): string {
  const parts = parseIso(iso);
  if (!parts) return iso;
  return `${MONTHS[parts.month - 1]} ${parts.day}, ${parts.year}`;
}

export function formatPeriodLabel(start: string, end: string): string {
  if (start && end) {
    const from = parseIso(start);
    const to = parseIso(end);
    if (from && to && from.year === to.year) {
      return `${MONTHS[from.month - 1]} ${from.day} – ${MONTHS[to.month - 1]} ${to.day}, ${to.year}`;
    }
    return `${formatLongDate(start)} – ${formatLongDate(end)}`;
  }
  if (start) return `From ${formatLongDate(start)}`;
  if (end) return `Through ${formatLongDate(end)}`;
  return "All dates";
}

export function formatShortDate(iso: string): string {
  const parts = parseIso(iso);
  if (!parts) return iso;
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  return `${month}/${day}/${parts.year}`;
}

export function priorityLabel(value: string): string {
  const cleaned = clean(value);
  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}

export function statusLabel(value: string): string {
  const cleaned = clean(value).replace(/_/g, " ");
  if (!cleaned) return "Completed";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

interface BuiltTask {
  id: string;
  completedOn: string;
  propertyName: string;
  location: string;
  description: string;
  priority: string;
  status: string;
  crew: { id: string; name: string; minutes: number; hours: number; laborCost: number }[];
  hours: number;
  laborCost: number;
  materialsCost: number;
  value: number;
  leadIds: Set<string>;
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b, "en");
}

export function buildPlantServicesReport(source: ReportSource): PlantServicesReport {
  const periodLabel = formatPeriodLabel(source.startDate, source.endDate);
  const preparedLabel = `Prepared ${formatLongDate(source.preparedOn)}.`;
  const notes = [
    `Labor cost is hours worked multiplied by the $${LABOR_HOURLY_RATE} hourly rate.`,
    "Parts and materials are the purchases tied to each task.",
    source.startDate || source.endDate
      ? "Only tasks with a completed date inside the report period are included."
      : "Every completed task is included.",
    "Only technician time is counted.",
  ];

  const timeByTask = new Map<string, Map<string, { name: string; minutes: number }>>();
  for (const entry of source.time) {
    if (!entry.taskId || !entry.technicianId || entry.minutes <= 0) continue;
    const name = clean(entry.technicianName) || "Technician";
    let crew = timeByTask.get(entry.taskId);
    if (!crew) {
      crew = new Map();
      timeByTask.set(entry.taskId, crew);
    }
    const current = crew.get(entry.technicianId);
    if (current) current.minutes += entry.minutes;
    else crew.set(entry.technicianId, { name, minutes: entry.minutes });
  }

  const taskById = new Map(source.tasks.map((task) => [task.id, task]));
  const includedIds = new Set(
    source.tasks.filter((task) => timeByTask.has(task.id)).map((task) => task.id),
  );

  const materialsByTask = new Map<string, number>();
  for (const purchase of source.purchases) {
    if (!includedIds.has(purchase.taskId)) continue;
    const amount = roundMoney(Math.max(0, purchase.amount));
    if (amount <= 0) continue;
    materialsByTask.set(purchase.taskId, roundMoney((materialsByTask.get(purchase.taskId) ?? 0) + amount));
  }

  const built: BuiltTask[] = [];
  for (const taskId of includedIds) {
    const task = taskById.get(taskId);
    const crewMap = timeByTask.get(taskId);
    if (!task || !crewMap) continue;
    const crew = [...crewMap.entries()]
      .map(([id, person]) => {
        const hours = hoursFromMinutes(person.minutes);
        return { id, name: person.name, minutes: person.minutes, hours, laborCost: laborFromHours(hours) };
      })
      .filter((person) => person.hours > 0)
      .sort((a, b) => b.hours - a.hours || compareText(a.name, b.name));
    if (crew.length === 0) continue;
    const topHours = crew[0]?.hours ?? 0;
    const leadIds = new Set(crew.filter((person) => person.hours === topHours).map((person) => person.id));
    const hours = sumHours(crew.map((person) => person.hours));
    const laborCost = roundMoney(crew.reduce((sum, person) => sum + person.laborCost, 0));
    const materialsCost = materialsByTask.get(taskId) ?? 0;
    built.push({
      id: task.id,
      completedOn: task.completedOn,
      propertyName: clean(task.propertyName) || "Unassigned",
      location: clean(task.location),
      description: clean(task.description) || "Completed work",
      priority: priorityLabel(task.priority),
      status: statusLabel(task.status),
      crew,
      hours,
      laborCost,
      materialsCost,
      value: roundMoney(laborCost + materialsCost),
      leadIds,
    });
  }

  built.sort(
    (a, b) =>
      a.completedOn.localeCompare(b.completedOn) ||
      compareText(a.propertyName, b.propertyName) ||
      compareText(a.description, b.description),
  );

  const emptyReport = (): PlantServicesReport => ({
    startDate: source.startDate,
    endDate: source.endDate,
    periodLabel,
    preparedLabel,
    summary:
      periodLabel === "All dates"
        ? "No tasks were completed."
        : `No tasks were completed for ${periodLabel}.`,
    highlights: "",
    empty: true,
    totals: { tasks: 0, properties: 0, hours: 0, laborCost: 0, materialsCost: 0, totalCost: 0 },
    buildings: [],
    technicians: [],
    taskLog: [],
    properties: [],
    timeEntries: [],
    purchases: [],
    technicianRates: [],
    notes,
  });

  if (built.length === 0) return emptyReport();

  const totals = {
    tasks: built.length,
    properties: new Set(built.map((task) => task.propertyName)).size,
    hours: sumHours(built.map((task) => task.hours)),
    laborCost: roundMoney(built.reduce((sum, task) => sum + task.laborCost, 0)),
    materialsCost: roundMoney(built.reduce((sum, task) => sum + task.materialsCost, 0)),
    totalCost: roundMoney(built.reduce((sum, task) => sum + task.value, 0)),
  };

  const summaryOpening =
    periodLabel === "All dates"
      ? `The Plant Services team completed ${countLabel(totals.tasks, "task", "tasks")} at ${countLabel(totals.properties, "property", "properties")}.`
      : `From ${periodLabel}, the Plant Services team completed ${countLabel(totals.tasks, "task", "tasks")} at ${countLabel(totals.properties, "property", "properties")}.`;
  const summary = `${summaryOpening} The team logged ${formatHours(totals.hours)} labor hours. The total value of the work was ${formatMoney(totals.totalCost)}: ${formatMoney(totals.laborCost)} in labor and ${formatMoney(totals.materialsCost)} in parts and materials.`;

  const propertyMap = new Map<string, PropertyRollup>();
  for (const task of built) {
    const current = propertyMap.get(task.propertyName) ?? {
      name: task.propertyName,
      tasks: 0,
      hours: 0,
      laborCost: 0,
      materialsCost: 0,
      totalCost: 0,
    };
    current.tasks += 1;
    current.hours = sumHours([current.hours, task.hours]);
    current.laborCost = roundMoney(current.laborCost + task.laborCost);
    current.materialsCost = roundMoney(current.materialsCost + task.materialsCost);
    current.totalCost = roundMoney(current.totalCost + task.value);
    propertyMap.set(task.propertyName, current);
  }
  const properties = [...propertyMap.values()].sort(
    (a, b) => b.totalCost - a.totalCost || b.tasks - a.tasks || compareText(a.name, b.name),
  );

  const techMap = new Map<
    string,
    { name: string; taskIds: Set<string>; hours: number; laborCost: number; tasksLed: number }
  >();
  for (const task of built) {
    for (const person of task.crew) {
      const current = techMap.get(person.id) ?? {
        name: person.name,
        taskIds: new Set<string>(),
        hours: 0,
        laborCost: 0,
        tasksLed: 0,
      };
      current.taskIds.add(task.id);
      current.hours = sumHours([current.hours, person.hours]);
      current.laborCost = roundMoney(current.laborCost + person.laborCost);
      if (task.leadIds.has(person.id)) current.tasksLed += 1;
      techMap.set(person.id, current);
    }
  }

  const technicians: TechnicianContribution[] = [...techMap.values()]
    .sort((a, b) => compareText(a.name, b.name))
    .map((person) => {
      const percent = totals.hours > 0 ? Math.round((person.hours / totals.hours) * 100) : 0;
      const worked = [...person.taskIds]
        .map((id) => built.find((task) => task.id === id))
        .filter((task): task is BuiltTask => Boolean(task));
      const largest = [...worked].sort(
        (a, b) => b.value - a.value || a.completedOn.localeCompare(b.completedOn),
      )[0];
      const led = `${countLabel(person.tasksLed, "task", "tasks")}`;
      const narrative = largest
        ? `Worked on ${person.taskIds.size} of ${totals.tasks} tasks and logged ${formatHours(person.hours)} hours (${percent}% of department time). Main technician on ${led}. Largest: at ${largest.propertyName}, ${largest.description} (${formatMoney(largest.value)}).`
        : `Worked on ${person.taskIds.size} of ${totals.tasks} tasks and logged ${formatHours(person.hours)} hours (${percent}% of department time). Main technician on ${led}.`;
      return {
        name: person.name,
        tasks: person.taskIds.size,
        hours: person.hours,
        percentOfHours: percent,
        laborCost: person.laborCost,
        tasksLed: person.tasksLed,
        narrative,
      };
    });

  const mostTasks = leaders(properties, (row) => row.tasks, (row) => row.name);
  const highestCost = leaders(properties, (row) => row.totalCost, (row) => row.name);
  const mostHours = leaders(technicians, (row) => row.hours, (row) => row.name);
  const highlights = [
    mostTasks ? `${mostTasks.labels} had the most tasks (${mostTasks.value}).` : "",
    highestCost ? `${highestCost.labels} had the highest cost (${formatMoney(highestCost.value)}).` : "",
    mostHours ? `${mostHours.labels} logged the most hours (${formatHours(mostHours.value)}).` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const buildingsMap = new Map<string, MaintenanceRow[]>();
  for (const task of built) {
    const rows = buildingsMap.get(task.propertyName) ?? [];
    rows.push({
      date: formatShortDate(task.completedOn),
      completedOn: task.completedOn,
      location: task.location,
      workPerformed: task.description,
      performedBy: task.crew.map((person) => person.name).join(", "),
    });
    buildingsMap.set(task.propertyName, rows);
  }
  const buildings = [...buildingsMap.entries()]
    .sort((a, b) => compareText(a[0], b[0]))
    .map(([propertyName, rows]) => ({ propertyName, rows }));

  const taskLog: TaskLogRow[] = built.map((task) => ({
    completedOn: task.completedOn,
    date: formatShortDate(task.completedOn),
    propertyName: task.propertyName,
    location: task.location,
    description: task.description,
    technicians: task.crew.map((person) => person.name).join(", "),
    priority: task.priority,
    status: task.status,
    hours: task.hours,
    laborCost: task.laborCost,
    materialsCost: task.materialsCost,
    value: task.value,
  }));

  const timeEntries: TimeEntryRow[] = built
    .flatMap((task) =>
      [...task.crew]
        .sort((a, b) => compareText(a.name, b.name))
        .map((person) => ({
          completedOn: task.completedOn,
          date: formatShortDate(task.completedOn),
          propertyName: task.propertyName,
          location: task.location,
          description: task.description,
          technician: person.name,
          hours: person.hours,
          hourlyRate: LABOR_HOURLY_RATE,
          laborCost: person.laborCost,
        })),
    )
    .sort(
      (a, b) =>
        a.completedOn.localeCompare(b.completedOn) ||
        compareText(a.propertyName, b.propertyName) ||
        compareText(a.technician, b.technician),
    );

  const builtIds = new Set(built.map((task) => task.id));
  const purchases: PurchaseRow[] = source.purchases
    .filter((purchase) => builtIds.has(purchase.taskId) && roundMoney(purchase.amount) > 0)
    .map((purchase) => {
      const task = built.find((row) => row.id === purchase.taskId);
      return {
        purchasedOn: purchase.purchasedOn,
        date: formatShortDate(purchase.purchasedOn),
        storeName: clean(purchase.storeName),
        item: clean(purchase.description),
        amount: roundMoney(purchase.amount),
        propertyName: task?.propertyName ?? "",
        location: task?.location ?? "",
        description: task?.description ?? "",
      };
    })
    .sort(
      (a, b) => a.purchasedOn.localeCompare(b.purchasedOn) || compareText(a.storeName, b.storeName),
    );

  return {
    startDate: source.startDate,
    endDate: source.endDate,
    periodLabel,
    preparedLabel,
    summary,
    highlights,
    empty: false,
    totals,
    buildings,
    technicians,
    taskLog,
    properties,
    timeEntries,
    purchases,
    technicianRates: technicians.map((person) => ({ name: person.name, hourlyRate: LABOR_HOURLY_RATE })),
    notes,
  };
}

function leaders<T>(
  items: T[],
  value: (item: T) => number,
  label: (item: T) => string,
): { labels: string; value: number } | null {
  if (items.length === 0) return null;
  const max = Math.max(...items.map(value));
  if (max <= 0) return null;
  const names = items
    .filter((item) => value(item) === max)
    .map(label)
    .sort((a, b) => a.localeCompare(b, "en"));
  return { labels: joinNames(names), value: max };
}

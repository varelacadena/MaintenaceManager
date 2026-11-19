import ExcelJS from "exceljs";
import { LABOR_HOURLY_RATE, type PlantServicesReport } from "@shared/plantServicesReport";

const NAVY = "FF1F3A5F";
const WHITE = "FFFFFFFF";
const YELLOW = "FFFFFF99";
const BLUE = "FF0000FF";
const INK = "FF222222";

function applyHeader(cell: ExcelJS.Cell) {
  cell.font = { name: "Arial", bold: true, size: 10, color: { argb: WHITE } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.border = thinBorder();
}

function thinBorder(): Partial<ExcelJS.Borders> {
  const edge: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FFD0D5DD" } };
  return { top: edge, left: edge, bottom: edge, right: edge };
}

function applyBody(cell: ExcelJS.Cell, options?: { money?: boolean; hours?: boolean; date?: boolean; bold?: boolean }) {
  cell.font = { name: "Arial", size: 10, bold: options?.bold, color: { argb: INK } };
  cell.alignment = { vertical: "top", wrapText: true };
  cell.border = thinBorder();
  if (options?.money) cell.numFmt = '"$"#,##0.00';
  if (options?.hours) cell.numFmt = "0.0";
  if (options?.date) cell.numFmt = "mm/dd/yyyy";
}

function dateOrBlank(iso: string): Date | string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function sectionLabel(cell: ExcelJS.Cell, text: string) {
  cell.value = text;
  cell.font = { name: "Arial", bold: true, size: 11, color: { argb: NAVY } };
}

export async function buildDataExportXlsx(report: PlantServicesReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hartland College Plant Services";

  const summary = workbook.addWorksheet("Summary", {
    pageSetup: { fitToPage: true, fitToWidth: 1, orientation: "portrait", margins: { left: 0.75, right: 0.75, top: 1, bottom: 1, header: 0.5, footer: 0.5 } },
  });
  summary.columns = [{ width: 34 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 42 }];
  summary.getCell("A1").value = "Plant Services Work Data Export";
  summary.getCell("A1").font = { name: "Arial", bold: true, size: 14, color: { argb: NAVY } };
  summary.getCell("A2").value = "Completed technician work for the selected period, buildings, and technicians.";
  summary.getCell("A2").font = { name: "Arial", italic: true, size: 9, color: { argb: "FF595959" } };

  summary.getCell("A4").value = "Report period start";
  summary.getCell("A5").value = "Report period end";
  summary.getCell("A4").font = { name: "Arial", bold: true, size: 10 };
  summary.getCell("A5").font = { name: "Arial", bold: true, size: 10 };
  writePeriodCell(summary.getCell("B4"), report.startDate ? dateOrBlank(report.startDate) : "All dates");
  writePeriodCell(summary.getCell("B5"), report.endDate ? dateOrBlank(report.endDate) : report.startDate ? "" : "All dates");
  summary.getCell("C4").value = "These dates are the completed-work period from the reporting filters.";
  summary.getCell("C4").font = { name: "Arial", italic: true, size: 9, color: { argb: "FF595959" } };

  sectionLabel(summary.getCell("A7"), "Key Figures");
  const figures: [string, number, "money" | "hours" | "count"][] = [
    ["Tasks completed", report.totals.tasks, "count"],
    ["Labor hours", report.totals.hours, "hours"],
    ["Labor cost", report.totals.laborCost, "money"],
    ["Materials / parts", report.totals.materialsCost, "money"],
    ["Total cost", report.totals.totalCost, "money"],
  ];
  figures.forEach((figure, index) => {
    const row = 8 + index;
    const label = summary.getCell(`A${row}`);
    const value = summary.getCell(`B${row}`);
    label.value = figure[0];
    value.value = figure[1];
    applyBody(label, { bold: figure[0] === "Total cost" });
    applyBody(value, {
      bold: figure[0] === "Total cost",
      money: figure[2] === "money",
      hours: figure[2] === "hours",
    });
  });

  let row = 14;
  sectionLabel(summary.getCell(`A${row}`), "By Technician");
  row += 1;
  ["Technician", "Tasks Worked", "Hours", "Labor Cost"].forEach((label, index) => {
    const header = summary.getCell(row, index + 1);
    header.value = label;
    applyHeader(header);
  });
  summary.getRow(row).height = 30;
  report.technicians.forEach((person) => {
    row += 1;
    const values: (string | number)[] = [person.name, person.tasks, person.hours, person.laborCost];
    values.forEach((value, index) => {
      const cell = summary.getCell(row, index + 1);
      cell.value = value;
      applyBody(cell, { hours: index === 2, money: index === 3 });
    });
  });

  row += 2;
  sectionLabel(summary.getCell(`A${row}`), "By Property");
  row += 1;
  ["Property", "Tasks", "Hours", "Total Cost"].forEach((label, index) => {
    const header = summary.getCell(row, index + 1);
    header.value = label;
    applyHeader(header);
  });
  summary.getRow(row).height = 30;
  const properties = [...report.properties].sort((a, b) => a.name.localeCompare(b.name, "en"));
  properties.forEach((property) => {
    row += 1;
    [property.name, property.tasks, property.hours, property.totalCost].forEach((value, index) => {
      const cell = summary.getCell(row, index + 1);
      cell.value = value;
      applyBody(cell, { hours: index === 2, money: index === 3 });
    });
  });

  row += 2;
  sectionLabel(summary.getCell(`A${row}`), "Notes");
  const excelNotes = [
    "Tasks sheet: one row per completed job. Hours and costs are calculated from Time Entries and Purchases.",
    `Time Entries sheet: one row per technician per job. Labor cost = hours × $${LABOR_HOURLY_RATE}.`,
    "Purchases sheet: receipt totals tied to each job. Parts and materials are those totals.",
    ...report.notes,
  ];
  excelNotes.forEach((note) => {
    row += 1;
    const cell = summary.getCell(`A${row}`);
    cell.value = note;
    cell.font = { name: "Arial", size: 10, color: { argb: INK } };
    cell.alignment = { wrapText: true };
  });

  writeGrid(workbook.addWorksheet("Tasks"), [
    "Date Completed",
    "Property",
    "Location",
    "Description",
    "Priority",
    "Status",
    "Technicians",
    "Labor Hours",
    "Labor Cost",
    "Materials / Parts",
    "Total Cost",
  ], report.taskLog.map((task) => [
    dateOrBlank(task.completedOn),
    task.propertyName,
    task.location,
    task.description,
    task.priority,
    task.status,
    task.technicians,
    task.hours,
    task.laborCost,
    task.materialsCost,
    task.value,
  ]), { date: [1], hours: [8], money: [9, 10, 11], widths: [16, 22, 24, 60, 12, 14, 32, 14, 14, 18, 14] });

  writeGrid(
    workbook.addWorksheet("Technicians"),
    ["Technician", "Hourly Rate ($)"],
    report.technicianRates.map((person) => [person.name, person.hourlyRate]),
    { money: [2], widths: [28, 18] },
  );

  writeGrid(workbook.addWorksheet("TimeEntries"), [
    "Date",
    "Property",
    "Location",
    "Description",
    "Technician",
    "Hours",
    "Hourly Rate",
    "Labor Cost",
  ], report.timeEntries.map((entry) => [
    dateOrBlank(entry.completedOn),
    entry.propertyName,
    entry.location,
    entry.description,
    entry.technician,
    entry.hours,
    entry.hourlyRate,
    entry.laborCost,
  ]), { date: [1], hours: [6], money: [7, 8], widths: [14, 22, 24, 60, 24, 12, 14, 14] });

  writeGrid(workbook.addWorksheet("Purchases"), [
    "Date",
    "Store",
    "Item",
    "Amount",
    "Property",
    "Location",
    "Work Performed",
  ], report.purchases.map((purchase) => [
    dateOrBlank(purchase.purchasedOn),
    purchase.storeName,
    purchase.item,
    purchase.amount,
    purchase.propertyName,
    purchase.location,
    purchase.description,
  ]), { date: [1], money: [4], widths: [14, 28, 40, 14, 22, 24, 60] });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function writePeriodCell(cell: ExcelJS.Cell, value: Date | string) {
  cell.value = value;
  cell.font = { name: "Arial", size: 10, color: { argb: BLUE } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: YELLOW } };
  cell.border = thinBorder();
  if (value instanceof Date) cell.numFmt = "mm/dd/yyyy";
}

function writeGrid(
  sheet: ExcelJS.Worksheet,
  headers: string[],
  rows: (string | number | Date)[][],
  options: { date?: number[]; hours?: number[]; money?: number[]; widths: number[] },
) {
  sheet.columns = options.widths.map((width) => ({ width }));
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const header = sheet.addRow(headers);
  header.height = 30;
  header.eachCell((gridCell) => applyHeader(gridCell));
  rows.forEach((row) => {
    const added = sheet.addRow(row);
    added.eachCell((gridCell, index) => {
      applyBody(gridCell, {
        date: options.date?.includes(index),
        hours: options.hours?.includes(index),
        money: options.money?.includes(index),
      });
    });
  });
  if (rows.length > 0) {
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
  }
  sheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
  };
}

export function reportingDownloadName(document: "maintenance-record" | "work-report" | "data-export"): string {
  if (document === "maintenance-record") return "Maintenance_Record.docx";
  if (document === "work-report") return "Work_Report.docx";
  return "Plant_Services_Work_Data.xlsx";
}

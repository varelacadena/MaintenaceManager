import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  type IBorderOptions,
} from "docx";
import sharp from "sharp";
import { costByPropertyChart, tasksByPropertyChart, technicianHoursChart, type ChartSvg } from "@shared/plantServicesCharts";
import {
  formatHours,
  formatMoney,
  type MaintenanceBuilding,
  type PlantServicesReport,
} from "@shared/plantServicesReport";

const NAVY = "1F3A5F";
const GRAY = "595959";
const TILE = "EAF0F7";
const INK = "222222";

const thin: IBorderOptions = { style: BorderStyle.SINGLE, size: 4, color: "D0D5DD" };
const borders = { top: thin, bottom: thin, left: thin, right: thin };
const tableWidth = { size: 9360, type: WidthType.DXA };

function run(text: string, options?: { bold?: boolean; italics?: boolean; size?: number; color?: string }): TextRun {
  return new TextRun({
    text,
    bold: options?.bold,
    italics: options?.italics,
    font: "Arial",
    size: options?.size ?? 21,
    color: options?.color ?? INK,
  });
}

function paragraph(text: string, options?: { italics?: boolean; after?: number; before?: number; size?: number; color?: string; bold?: boolean }): Paragraph {
  return new Paragraph({
    spacing: { before: options?.before ?? 0, after: options?.after ?? 120, line: 276 },
    children: [run(text, options)],
  });
}

function eyebrow(): Paragraph {
  return new Paragraph({
    spacing: { after: 40 },
    children: [
      new TextRun({
        text: "HARTLAND COLLEGE | PLANT SERVICES",
        bold: true,
        font: "Arial",
        size: 18,
        color: GRAY,
        characterSpacing: 40,
      }),
    ],
  });
}

function title(text: string, size: number): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [run(text, { bold: true, size, color: NAVY })],
  });
}

function heading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 320, after: 120 },
    children: [run(text, { bold: true, size: 28, color: NAVY })],
  });
}

function subheading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [run(text, { bold: true, size: 24, color: NAVY })],
  });
}

function cell(
  text: string,
  width: number,
  options?: { header?: boolean; bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; fill?: string; span?: number },
): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    columnSpan: options?.span,
    shading: { type: ShadingType.CLEAR, fill: options?.header ? NAVY : options?.fill ?? "FFFFFF" },
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    verticalAlign: VerticalAlign.CENTER,
    borders,
    children: [
      new Paragraph({
        alignment: options?.align ?? AlignmentType.LEFT,
        spacing: { after: 0 },
        children: [
          run(text, {
            bold: options?.header || options?.bold,
            size: options?.header ? 18 : 20,
            color: options?.header ? "FFFFFF" : INK,
          }),
        ],
      }),
    ],
  });
}

function whereCell(propertyName: string, location: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: "FFFFFF" },
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    borders,
    children: [
      new Paragraph({ spacing: { after: 0 }, children: [run(propertyName, { size: 20 })] }),
      ...(location
        ? [new Paragraph({ spacing: { after: 0 }, children: [run(location, { size: 18, color: GRAY })] })]
        : []),
    ],
  });
}

function pageFooter(prefix: string): Footer {
  const lead = prefix ? `${prefix} | Page ` : "Page ";
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          run(lead, { size: 16, color: GRAY }),
          new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: GRAY }),
          run(" of ", { size: 16, color: GRAY }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 16, color: GRAY }),
        ],
      }),
    ],
  });
}

function pageProperties() {
  return {
    page: {
      size: { width: 12240, height: 15840 },
      margin: { top: 1296, right: 1440, bottom: 1296, left: 1440, header: 708, footer: 708 },
    },
  };
}

function maintenanceTable(building: MaintenanceBuilding): Table {
  const widths = [1400, 2100, 3760, 2100];
  const header = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: ["Date", "Location", "Work Performed", "Performed By"].map((label, index) =>
      cell(label, widths[index] ?? 2000, { header: true }),
    ),
  });
  const body = building.rows.map(
    (row) =>
      new TableRow({
        cantSplit: true,
        children: [
          cell(row.date, widths[0] ?? 1400),
          cell(row.location, widths[1] ?? 2100),
          cell(row.workPerformed, widths[2] ?? 3760),
          cell(row.performedBy, widths[3] ?? 2100),
        ],
      }),
  );
  return new Table({ width: tableWidth, rows: [header, ...body] });
}

function buildingLine(name: string): Paragraph {
  return new Paragraph({
    spacing: { before: 160, after: 80 },
    children: [run("Building / Area: ", { bold: true, size: 21 }), run(name, { size: 21 })],
  });
}

async function chartImage(chart: ChartSvg): Promise<Paragraph> {
  const png = await sharp(Buffer.from(chart.svg)).png().toBuffer();
  const width = 624;
  const height = Math.max(120, Math.round((chart.height * width) / chart.width));
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 40 },
    children: [
      new ImageRun({
        type: "png",
        data: png,
        transformation: { width, height },
      }),
    ],
  });
}

function caption(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 160 },
    children: [run(text, { italics: true, size: 18, color: GRAY })],
  });
}

function tile(value: string, label: string): TableCell {
  return new TableCell({
    width: { size: 3120, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: TILE },
    margins: { top: 80, bottom: 80, left: 60, right: 60 },
    borders,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [run(value, { bold: true, size: 30, color: NAVY })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [run(label, { size: 16, color: GRAY })],
      }),
    ],
  });
}

async function maintenanceDocument(report: PlantServicesReport): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [eyebrow(), title("Maintenance Record", 40)];
  const period = paragraph(`Period: ${report.periodLabel}`, { after: 80 });
  if (report.buildings.length === 0) {
    children.push(period, paragraph(report.summary));
  } else if (report.buildings.length === 1) {
    const building = report.buildings[0];
    if (building) {
      children.push(buildingLine(building.propertyName), period, maintenanceTable(building));
    }
  } else {
    children.push(period);
    for (const building of report.buildings) {
      children.push(buildingLine(building.propertyName), maintenanceTable(building));
    }
  }
  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 21 } } } },
    sections: [{ properties: pageProperties(), footers: { default: pageFooter("") }, children }],
  });
  return Packer.toBuffer(doc);
}

async function workReportDocument(report: PlantServicesReport): Promise<Buffer> {
  const totals = report.totals;
  const children: (Paragraph | Table)[] = [
    eyebrow(),
    title("Work Report", 44),
    paragraph(report.periodLabel, { size: 24, color: "404040", after: 40 }),
    paragraph(report.preparedLabel, { italics: true, size: 18, color: GRAY, after: 80 }),
    heading("1. Summary"),
    paragraph(report.summary),
    new Table({
      width: tableWidth,
      rows: [
        new TableRow({
          children: [
            tile(String(totals.tasks), totals.tasks === 1 ? "Task completed" : "Tasks completed"),
            tile(String(totals.properties), totals.properties === 1 ? "Property served" : "Properties served"),
            tile(formatHours(totals.hours), "Labor hours"),
          ],
        }),
        new TableRow({
          children: [
            tile(formatMoney(totals.laborCost), "Labor cost"),
            tile(formatMoney(totals.materialsCost), "Parts and materials"),
            tile(formatMoney(totals.totalCost), "Total value"),
          ],
        }),
      ],
    }),
  ];
  if (report.highlights) children.push(paragraph(report.highlights, { before: 160 }));

  children.push(heading("2. How the Work Was Spread"));
  children.push(paragraph("The charts below show where the team's time went and which properties needed the most work."));
  if (!report.empty) {
    const byTasks = [...report.properties].sort((a, b) => b.tasks - a.tasks || a.name.localeCompare(b.name, "en"));
    children.push(await chartImage(technicianHoursChart(report.technicians.map((person) => ({ name: person.name, hours: person.hours, tasks: person.tasks })))));
    children.push(caption("Figure 1. Hours logged and tasks worked, by technician"));
    children.push(await chartImage(tasksByPropertyChart(byTasks.map((row) => ({ name: row.name, tasks: row.tasks })))));
    children.push(caption("Figure 2. Tasks completed, by property"));
    children.push(
      await chartImage(
        costByPropertyChart(report.properties.map((row) => ({ name: row.name, laborCost: row.laborCost, materialsCost: row.materialsCost }))),
      ),
    );
    children.push(caption("Figure 3. Cost of work, by property"));
  }

  children.push(heading("3. Technician Contributions"));
  children.push(
    paragraph(
      "Each technician's impact is shown three ways: how many tasks they worked on, how many hours they put in, and how many tasks they led. The lead on a task is the technician who logged the most hours on it.",
    ),
  );
  if (report.technicians.length > 0) {
    const widths = [2200, 1100, 1200, 1400, 1700, 1760];
    children.push(
      new Table({
        width: tableWidth,
        rows: [
          new TableRow({
            tableHeader: true,
            children: ["Technician", "Tasks", "Hours", "% of Hours", "Labor Cost", "Tasks Led"].map((label, index) =>
              cell(label, widths[index] ?? 1400, { header: true }),
            ),
          }),
          ...report.technicians.map(
            (person) =>
              new TableRow({
                children: [
                  cell(person.name, widths[0] ?? 2200),
                  cell(String(person.tasks), widths[1] ?? 1100),
                  cell(formatHours(person.hours), widths[2] ?? 1200),
                  cell(`${person.percentOfHours}%`, widths[3] ?? 1400),
                  cell(formatMoney(person.laborCost), widths[4] ?? 1700),
                  cell(String(person.tasksLed), widths[5] ?? 1760),
                ],
              }),
          ),
        ],
      }),
    );
    for (const person of report.technicians) {
      children.push(subheading(person.name));
      children.push(paragraph(person.narrative));
    }
  }

  children.push(heading("4. Completed Task Log"));
  children.push(paragraph("Value is labor plus parts and materials for each task."));
  const logWidths = [1300, 1900, 3160, 1700, 1300];
  const logRows = [
    new TableRow({
      tableHeader: true,
      children: ["Date", "Where", "What Was Done", "Technicians", "Value"].map((label, index) =>
        cell(label, logWidths[index] ?? 1500, { header: true }),
      ),
    }),
    ...report.taskLog.map(
      (row) =>
        new TableRow({
          cantSplit: true,
          children: [
            cell(row.date, logWidths[0] ?? 1300),
            whereCell(row.propertyName, row.location, logWidths[1] ?? 1900),
            cell(row.description, logWidths[2] ?? 3160),
            cell(row.technicians, logWidths[3] ?? 1700),
            cell(formatMoney(row.value), logWidths[4] ?? 1300, { align: AlignmentType.RIGHT }),
          ],
        }),
    ),
    new TableRow({
      children: [
        cell("Total value of work completed", 8060, { bold: true, span: 4 }),
        cell(formatMoney(totals.totalCost), logWidths[4] ?? 1300, { bold: true, align: AlignmentType.RIGHT }),
      ],
    }),
  ];
  children.push(new Table({ width: tableWidth, rows: logRows }));

  children.push(heading("5. Notes"));
  for (const note of report.notes) children.push(paragraph(note));

  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 21 } } } },
    sections: [
      {
        properties: pageProperties(),
        footers: {
          default: pageFooter(`Hartland College Plant Services | Work Report | ${report.periodLabel}`),
        },
        children,
      },
    ],
  });
  return Packer.toBuffer(doc);
}

export async function buildMaintenanceRecordDocx(report: PlantServicesReport): Promise<Buffer> {
  return maintenanceDocument(report);
}

export async function buildWorkReportDocx(report: PlantServicesReport): Promise<Buffer> {
  return workReportDocument(report);
}

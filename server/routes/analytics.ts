import type { Express, Request } from "express";
import { isAuthenticated } from "../replitAuth";
import { requireAdmin } from "../middleware";
import { handleRouteError } from "../routeUtils";
import type { AnalyticsFilters } from "../analyticsService";

function readDateBasis(query: Request["query"]): AnalyticsFilters["dateBasis"] {
  const value = query.dateBasis;
  if (value === "completed" || value === "due" || value === "created" || value === "active") return value;
  return undefined;
}

function readSheets(query: Request["query"]): string[] | undefined {
  const raw = query.sheets;
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  const names = raw.split(",").map((name) => name.trim()).filter(Boolean);
  return names.length > 0 ? names : undefined;
}

function readExportOptions(query: Request["query"]): Pick<AnalyticsFilters, "dateBasis" | "sheets" | "includeCharts" | "includeCost" | "includeStudents" | "includePhotos"> {
  return {
    dateBasis: readDateBasis(query),
    sheets: readSheets(query),
    includeCharts: query.charts === "0" ? false : undefined,
    includeCost: query.cost === "0" ? false : undefined,
    includeStudents: query.students === "1" ? true : undefined,
    includePhotos: query.photos === "1" ? true : undefined,
  };
}

function parseTaskAnalyticsFilters(query: Request["query"]): AnalyticsFilters {
  return {
    startDate: query.startDate as string | undefined,
    endDate: query.endDate as string | undefined,
    propertyId: query.propertyId as string | undefined,
    spaceId: query.spaceId as string | undefined,
    areaId: query.areaId as string | undefined,
    technicianId: query.technicianId as string | undefined,
    equipmentId: query.equipmentId as string | undefined,
    status: query.status as string | undefined,
    urgency: query.urgency as string | undefined,
    roleType: query.roleType as AnalyticsFilters["roleType"],
    ...readExportOptions(query),
  };
}

function parseDatePropertyFilters(query: Request["query"]): AnalyticsFilters {
  return {
    startDate: query.startDate as string | undefined,
    endDate: query.endDate as string | undefined,
    propertyId: query.propertyId as string | undefined,
    spaceId: query.spaceId as string | undefined,
    areaId: query.areaId as string | undefined,
    status: query.status as string | undefined,
    urgency: query.urgency as string | undefined,
    ...readExportOptions(query),
  };
}

function parseFleetDateFilters(query: Request["query"]): AnalyticsFilters {
  return {
    startDate: query.startDate as string | undefined,
    endDate: query.endDate as string | undefined,
    propertyId: query.propertyId as string | undefined,
    ...readExportOptions(query),
  };
}

function parseExportFilters(dataType: string, query: Request["query"]): AnalyticsFilters {
  if (dataType === "service-requests-detailed") {
    return parseDatePropertyFilters(query);
  }
  if (dataType === "fleet-detailed" || dataType === "inventory-detailed") {
    return parseFleetDateFilters(query);
  }
  if (dataType === "projects") {
    return parseDatePropertyFilters(query);
  }
  return parseTaskAnalyticsFilters(query);
}

export function registerAnalyticsRoutes(app: Express) {
  const analyticsImport = import("../analyticsService");

  app.get("/api/analytics/overview", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { analyticsService } = await analyticsImport;
      const filters = parseTaskAnalyticsFilters(req.query);
      const data = await analyticsService.getExecutiveOverview(filters);
      res.json(data);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch analytics overview");
    }
  });

  app.get("/api/analytics/work-orders", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { analyticsService } = await analyticsImport;
      const filters = parseTaskAnalyticsFilters(req.query);
      const data = await analyticsService.getWorkOrderOverview(filters);
      res.json(data);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch work order analytics");
    }
  });

  app.get("/api/analytics/work-orders/summary", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { analyticsService } = await analyticsImport;
      const filters = parseTaskAnalyticsFilters(req.query);
      const data = await analyticsService.getWorkOrderOverview(filters, { includeDetails: false });
      res.json(data);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch work order summary");
    }
  });

  app.get("/api/analytics/technicians", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { analyticsService } = await analyticsImport;
      const filters = parseTaskAnalyticsFilters(req.query);
      const data = await analyticsService.getTechnicianPerformance(filters);
      res.json(data);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch team performance analytics");
    }
  });

  app.get("/api/analytics/technicians/summary", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { analyticsService } = await analyticsImport;
      const filters = parseTaskAnalyticsFilters(req.query);
      const data = await analyticsService.getTechnicianPerformance(filters, { includeDetails: false });
      res.json(data);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch team summary");
    }
  });

  app.get("/api/analytics/assets", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { analyticsService } = await analyticsImport;
      const filters = parseTaskAnalyticsFilters(req.query);
      const data = await analyticsService.getAssetHealth(filters);
      res.json(data);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch asset analytics");
    }
  });

  app.get("/api/analytics/assets/summary", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { analyticsService } = await analyticsImport;
      const filters = parseTaskAnalyticsFilters(req.query);
      const data = await analyticsService.getAssetHealth(filters, { includeDetails: false });
      res.json(data);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch asset summary");
    }
  });

  app.get("/api/analytics/facilities", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { analyticsService } = await analyticsImport;
      const filters = parseTaskAnalyticsFilters(req.query);
      const data = await analyticsService.getFacilityInsights(filters);
      res.json(data);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch facility analytics");
    }
  });

  app.get("/api/analytics/facilities/summary", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { analyticsService } = await analyticsImport;
      const filters = parseTaskAnalyticsFilters(req.query);
      const data = await analyticsService.getFacilityInsights(filters, { includeDetails: false });
      res.json(data);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch facility summary");
    }
  });

  app.get("/api/analytics/alerts", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { analyticsService } = await analyticsImport;
      const filters = parseTaskAnalyticsFilters(req.query);
      const data = await analyticsService.getAlerts(filters);
      res.json(data);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch alerts");
    }
  });

  app.get("/api/analytics/trends", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { analyticsService } = await analyticsImport;
      const filters = parseTaskAnalyticsFilters(req.query);
      const data = await analyticsService.getWorkOrderTrends(filters);
      res.json(data);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch trends");
    }
  });

  app.get("/api/analytics/fleet", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { analyticsService } = await analyticsImport;
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
      };
      const data = await analyticsService.getFleetOverview(filters);
      res.json(data);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch fleet analytics");
    }
  });

  app.get("/api/analytics/fleet/summary", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { analyticsService } = await analyticsImport;
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
      };
      const data = await analyticsService.getFleetOverview(filters, { includeDetails: false });
      res.json(data);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch fleet summary");
    }
  });

  app.get("/api/analytics/service-requests", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { analyticsService } = await analyticsImport;
      const filters = parseDatePropertyFilters(req.query);
      const data = await analyticsService.getServiceRequestOverview(filters);
      res.json(data);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch service request analytics");
    }
  });

  app.get("/api/analytics/service-requests/summary", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { analyticsService } = await analyticsImport;
      const filters = parseDatePropertyFilters(req.query);
      const data = await analyticsService.getServiceRequestOverview(filters, { includeDetails: false });
      res.json(data);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch service request summary");
    }
  });

  app.get("/api/analytics/projects/summary", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { analyticsService } = await analyticsImport;
      const filters = parseDatePropertyFilters(req.query);
      const data = await analyticsService.getProjectsOverview(filters, { includeDetails: false });
      res.json(data);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch project summary");
    }
  });

  app.get("/api/analytics/inventory", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { analyticsService } = await analyticsImport;
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
      };
      const data = await analyticsService.getInventoryOverview(filters);
      res.json(data);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch inventory analytics");
    }
  });

  app.get("/api/analytics/projects", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { analyticsService } = await analyticsImport;
      const filters = parseDatePropertyFilters(req.query);
      const data = await analyticsService.getProjectsOverview(filters);
      res.json(data);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch project analytics");
    }
  });

  app.get("/api/analytics/export", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { type, format } = req.query;
      const dataType = type as string;
      const exportFormat = format as string;

      if (!dataType) {
        return res.status(400).json({ message: "Data type is required" });
      }
      if (exportFormat !== "xlsx" && exportFormat !== "pdf" && exportFormat !== "sheets") {
        return res.status(400).json({ message: "Format must be xlsx, pdf, or sheets" });
      }

      const filters = parseExportFilters(dataType, req.query);
      const { buildExcelBuffer, buildPdfBuffer, buildExportFilename, buildSpreadsheetPreview } = await import(
        "../analyticsExportBuilder"
      );

      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Pragma", "no-cache");

      if (exportFormat === "sheets") {
        const preview = await buildSpreadsheetPreview(dataType, filters);
        return res.json(preview);
      }

      const filename = buildExportFilename(dataType, exportFormat, filters);

      if (exportFormat === "xlsx") {
        const buffer = await buildExcelBuffer(dataType, filters);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(buffer);
      }

      const buffer = await buildPdfBuffer(dataType, filters);
      const disposition = req.query.inline === "1" ? "inline" : "attachment";
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `${disposition}; filename="${filename}"`);
      return res.send(buffer);
    } catch (error) {
      handleRouteError(res, error, "Export failed");
    }
  });

  app.get("/api/analytics/reporting", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { loadPlantServicesReport } = await import("../plantServicesReportData");
      const report = await loadPlantServicesReport({
        startDate: typeof req.query.startDate === "string" ? req.query.startDate : undefined,
        endDate: typeof req.query.endDate === "string" ? req.query.endDate : undefined,
        propertyId: typeof req.query.propertyId === "string" ? req.query.propertyId : undefined,
        technicianId: typeof req.query.technicianId === "string" ? req.query.technicianId : undefined,
      });
      res.setHeader("Cache-Control", "no-store");
      res.json(report);
    } catch (error) {
      handleRouteError(res, error, "Could not build the report");
    }
  });

  app.get("/api/analytics/reporting/download", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const document = req.query.document;
      if (document !== "maintenance-record" && document !== "work-report" && document !== "data-export") {
        return res.status(400).json({ message: "Choose a document" });
      }
      const { loadPlantServicesReport } = await import("../plantServicesReportData");
      const report = await loadPlantServicesReport({
        startDate: typeof req.query.startDate === "string" ? req.query.startDate : undefined,
        endDate: typeof req.query.endDate === "string" ? req.query.endDate : undefined,
        propertyId: typeof req.query.propertyId === "string" ? req.query.propertyId : undefined,
        technicianId: typeof req.query.technicianId === "string" ? req.query.technicianId : undefined,
      });
      const { reportingDownloadName } = await import("../plantServicesXlsx");
      const filename = reportingDownloadName(document);
      res.setHeader("Cache-Control", "no-store");
      if (document === "data-export") {
        const { buildDataExportXlsx } = await import("../plantServicesXlsx");
        const buffer = await buildDataExportXlsx(report);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(buffer);
      }
      const { buildMaintenanceRecordDocx, buildWorkReportDocx } = await import("../plantServicesDocx");
      const buffer = document === "maintenance-record" ? await buildMaintenanceRecordDocx(report) : await buildWorkReportDocx(report);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (error) {
      handleRouteError(res, error, "Could not download the document");
    }
  });
}

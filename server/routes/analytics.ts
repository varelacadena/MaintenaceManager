import type { Express, Request } from "express";
import { isAuthenticated } from "../replitAuth";
import { requireAdmin } from "../middleware";
import { handleRouteError } from "../routeUtils";
import type { AnalyticsFilters } from "../analyticsService";

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
  };
}

function parseFleetDateFilters(query: Request["query"]): AnalyticsFilters {
  return {
    startDate: query.startDate as string | undefined,
    endDate: query.endDate as string | undefined,
  };
}

function parseExportFilters(dataType: string, query: Request["query"]): AnalyticsFilters {
  if (dataType === "service-requests-detailed") {
    return parseDatePropertyFilters(query);
  }
  if (dataType === "fleet-detailed") {
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
      if (exportFormat !== "xlsx" && exportFormat !== "pdf") {
        return res.status(400).json({ message: "Format must be xlsx or pdf" });
      }

      const filters = parseExportFilters(dataType, req.query);
      const { buildExcelBuffer, buildPdfBuffer, buildExportFilename } = await import(
        "../analyticsExportBuilder"
      );
      const filename = buildExportFilename(dataType, exportFormat, filters);

      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Pragma", "no-cache");

      if (exportFormat === "xlsx") {
        const buffer = await buildExcelBuffer(dataType, filters);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(buffer);
      }

      const buffer = await buildPdfBuffer(dataType, filters);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (error) {
      handleRouteError(res, error, "Export failed");
    }
  });
}

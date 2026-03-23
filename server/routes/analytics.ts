import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { requireAdmin } from "../middleware";
import { handleRouteError, getAuthUser } from "../routeUtils";

export function registerAnalyticsRoutes(app: Express) {
  const analyticsImport = import("../analyticsService");

  app.get("/api/analytics/work-orders", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { analyticsService } = await analyticsImport;
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        propertyId: req.query.propertyId as string | undefined,
        areaId: req.query.areaId as string | undefined,
        technicianId: req.query.technicianId as string | undefined,
        status: req.query.status as string | undefined,
        urgency: req.query.urgency as string | undefined,
      };
      const data = await analyticsService.getWorkOrderOverview(filters);
      res.json(data);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch work order analytics");
    }
  });

  app.get("/api/analytics/technicians", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { analyticsService } = await analyticsImport;
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        propertyId: req.query.propertyId as string | undefined,
        areaId: req.query.areaId as string | undefined,
        roleType: req.query.roleType as "all" | "technician" | "student" | undefined,
      };
      const data = await analyticsService.getTechnicianPerformance(filters);
      res.json(data);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch team performance analytics");
    }
  });

  app.get("/api/analytics/assets", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { analyticsService } = await analyticsImport;
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        propertyId: req.query.propertyId as string | undefined,
        equipmentId: req.query.equipmentId as string | undefined,
      };
      const data = await analyticsService.getAssetHealth(filters);
      res.json(data);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch asset analytics");
    }
  });

  app.get("/api/analytics/facilities", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { analyticsService } = await analyticsImport;
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        propertyId: req.query.propertyId as string | undefined,
      };
      const data = await analyticsService.getFacilityInsights(filters);
      res.json(data);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch facility analytics");
    }
  });

  app.get("/api/analytics/alerts", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { analyticsService } = await analyticsImport;
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        propertyId: req.query.propertyId as string | undefined,
      };
      const data = await analyticsService.getAlerts(filters);
      res.json(data);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch alerts");
    }
  });

  app.get("/api/analytics/trends", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { analyticsService } = await analyticsImport;
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        propertyId: req.query.propertyId as string | undefined,
      };
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

  app.get("/api/analytics/service-requests", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { analyticsService } = await analyticsImport;
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        propertyId: req.query.propertyId as string | undefined,
        areaId: req.query.areaId as string | undefined,
        urgency: req.query.urgency as string | undefined,
      };
      const data = await analyticsService.getServiceRequestOverview(filters);
      res.json(data);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch service request analytics");
    }
  });

  app.get("/api/analytics/export", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { analyticsService } = await analyticsImport;
      const { type, format, ...filters } = req.query;
      const dataType = type as string;

      if (!dataType) {
        return res.status(400).json({ message: "Data type is required" });
      }

      const data = await analyticsService.getExportData(dataType, filters);

      if (format === "xlsx") {
        const XLSX = await import("xlsx");
        const worksheet = XLSX.utils.aoa_to_sheet([data.headers, ...data.data]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
        
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=report-${dataType}-${Date.now()}.xlsx`);
        return res.send(buffer);
      } else if (format === "pdf") {
        const { jsPDF } = await import("jspdf");
        const { default: autoTable } = await import("jspdf-autotable");
        
        const doc = new jsPDF();
        doc.text(`Analytics Report: ${dataType}`, 14, 15);
        autoTable(doc, {
          head: [data.headers],
          body: data.data,
          startY: 20,
        });
        
        const buffer = Buffer.from(doc.output("arraybuffer"));
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=report-${dataType}-${Date.now()}.pdf`);
        return res.send(buffer);
      }

      const csv = await analyticsService.exportData(dataType, filters);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=report-${dataType}-${Date.now()}.csv`);
      res.send(csv);
    } catch (error) {
      handleRouteError(res, error, "Export failed");
    }
  });
}

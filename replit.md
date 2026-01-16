# College Maintenance Management Platform

## Overview

This web-based platform streamlines maintenance operations for college facilities. It supports three user roles—administrators, maintenance staff, and college staff—to manage service requests, track tasks, and maintain campus areas including grounds, housing, and utilities. The system provides role-specific dashboards, task management with time and parts tracking, and administrative functions such as user, vendor, and inventory management, property mapping, and reporting.

## Recent Updates (January 16, 2026)

**ANALYTICS MODULE CONSOLIDATION - SINGLE PAGE DASHBOARD:**

All 7 analytics report pages have been consolidated into a single dynamic page at `/analytics`. Report switching happens via tabs without changing routes, providing a smoother user experience.

**New Architecture:**
- **Single Route**: All analytics now accessible at `/analytics` instead of 7 separate routes
- **Tab-Based Navigation**: Switch between report types (Work Orders, Technicians, Assets, Facilities, Fleet, Requests, Alerts) with tabs
- **Lazy Loading**: Each report component is lazy-loaded for optimal performance
- **Unified Filters**: Consistent filtering interface across all report types
- **Export Functionality**: PDF and XLSX export available on every report

**Report Components (client/src/pages/analytics/reports/):**
- `WorkOrdersReport.tsx` - Task status, trends, status/urgency breakdowns
- `TechniciansReport.tsx` - Team performance, hours logged, completion rates
- `AssetsReport.tsx` - Equipment health, failure rates, maintenance costs
- `FacilitiesReport.tsx` - Building-level work order analytics
- `FleetReport.tsx` - Vehicle status, reservations, utilization rates
- `ServiceRequestsReport.tsx` - Request metrics, conversion rates, top requesters
- `AlertsReport.tsx` - Overdue work orders, SLA breaches, exceptions

**API Endpoints:**
- `GET /api/analytics/work-orders` - Work order overview with filters
- `GET /api/analytics/technicians` - Technician performance metrics
- `GET /api/analytics/assets` - Asset health and maintenance data
- `GET /api/analytics/facilities` - Facility insights
- `GET /api/analytics/alerts` - System alerts
- `GET /api/analytics/trends` - Weekly trend data
- `GET /api/analytics/fleet` - Fleet vehicle analytics
- `GET /api/analytics/service-requests` - Service request analytics
- `GET /api/analytics/export?type=...` - Export functionality (PDF/XLSX)

**Features:**
- Role-based access (Admin and Maintenance only)
- Filterable by date range, property, area, technician, status, urgency
- Clickable KPI cards with detailed dialog breakdowns
- Interactive charts (pie, bar, line) with tooltips
- Data tables with sorting and property/area links
- PDF and XLSX export for all reports
- Tabs for switching between chart and detailed table views

**Components Added/Updated:**
- `client/src/pages/analytics/FleetAnalytics.tsx` - Fleet management analytics
- `client/src/pages/analytics/ServiceRequestAnalytics.tsx` - Service request analytics
- `client/src/pages/analytics/MaintenanceOverview.tsx` - Redesigned as Reports hub
- `client/src/components/analytics/KpiCard.tsx` - Reusable clickable KPI display
- `client/src/components/analytics/AnalyticsFilters.tsx` - Filter controls with export
- `client/src/components/analytics/AnalyticsCharts.tsx` - Chart components
- `server/analyticsService.ts` - Analytics query builders with fleet and service request methods

---

## Previous Updates (November 11, 2025)

**DATABASE MIGRATION HARDENING - DEPLOYMENT READY:**

All database migrations have been updated to be fully idempotent and production-deployment safe. The following critical issues were identified and fixed:

**Migration Fixes Applied:**
- ✅ **Migration 002** (nullable_request_id): Added IF NOT EXISTS check for `uploads_parent_check` constraint
- ✅ **Migration 003** (note_type): Added existence checks for ENUM type and column creation
- ✅ **Migration 004** (fix_phone_number_column): Added column existence check before rename operation
- ✅ **Migration 007** (add_properties_and_equipment): Updated to use snake_case column names from the start (image_url, last_work_date, property_id, serial_number)
- ✅ **Migrations 008 & 009**: Added to migration application list in applyMigrations.ts to ensure camelCase→snake_case fixes run on deployment
- ✅ **Migration 011** (add_property_to_service_requests): Added conditional checks for column and foreign key constraint
- ✅ **Migration 012** (add_equipment_id_to_tasks): Added conditional checks for column and foreign key constraint
- ✅ **Migration 013** (add_recurring_parameters): Added conditional checks for all three recurring columns

**Schema Alignment:**
- All property and equipment columns now consistently use snake_case naming
- Migration 007 creates tables with correct snake_case columns for fresh installations
- Migration 009 ensures existing databases are migrated from camelCase to snake_case
- Database schema now matches application code expectations across all environments

**Session Configuration Fix:**
- ✅ Removed duplicate session setup between server/index.ts and server/replitAuth.ts
- ✅ Fixed connect-pg-simple initialization to use proper configuration pattern
- ✅ Session store now correctly configured with PostgreSQL pool in server/index.ts
- ✅ Eliminated "Cannot read properties of undefined (reading 'Store')" error

**Deployment Readiness:**
- ✅ All 14 migrations are idempotent and safe to run multiple times
- ✅ No schema mismatch errors on deployment
- ✅ Comprehensive error handling for constraints, types, and columns
- ✅ Migration tracking prevents duplicate execution
- ✅ Session management properly configured without conflicts
- ✅ Safe for production deployment without database corruption

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework Stack:** React 18 (TypeScript), Vite, Wouter (routing), TanStack Query (server state).
**UI Component System:** Radix UI, shadcn/ui ("new-york" style), Tailwind CSS.
**Design System:** Inter and Roboto Mono fonts, HSL-based color theme with light/dark modes, custom urgency/status colors.
**State Management:** React Query (server state), custom `useAuth` hook (authentication), React Hook Form with Zod (form state), React `useState` (local UI state).

### Backend Architecture

**Server Framework:** Express.js (Node.js, TypeScript), ES modules, RESTful API.
**Database Layer:** Drizzle ORM for PostgreSQL (Neon serverless), schema-first approach, connection pooling.
**Authentication System:** Replit Auth (OpenID Connect) via Passport.js, session-based authentication (PostgreSQL store), role-based access control, user provisioning.
**Authorization Model:** Three-tier role system (admin, maintenance, staff) with route-level middleware enforcement.
**API Architecture:** Centralized routes, storage abstraction layer, consistent error handling, request/response logging.
**File Upload System:** Google Cloud Storage integration, Uppy file uploader, custom ACL for object permissions.

### Data Model

**Core Entities:** Users, Vendors, Inventory Items, Areas, Subdivisions, Service Requests, Time Entries, Parts Used, Messages, Uploads, Task Notes.
**Key Relationships:** Service requests link to areas/subdivisions, requesters, and assigned staff. Time entries and parts link to requests. Messages and uploads are attached to service requests.
**Status Workflow:** `pending` → `in_progress` → `completed`, with an `on_hold` state and urgency levels.

### External Dependencies

**Third-Party Services:**
- **Replit Authentication:** OIDC provider for user identity.
- **Replit Object Storage:** Google Cloud Storage via sidecar endpoint.
- **Neon PostgreSQL:** Serverless Postgres database.

**Key Libraries:**
- **Drizzle ORM:** Type-safe database queries.
- **Passport.js:** Authentication middleware.
- **React Hook Form:** Form validation.
- **Uppy:** File upload UI.
- **TanStack Query:** Async state management.

**Configuration Requirements:** DATABASE_URL, SESSION_SECRET, PRIVATE_OBJECT_DIR, ISSUER_URL, REPL_ID.
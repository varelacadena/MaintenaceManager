# College Maintenance Management Platform

## Overview

This web-based platform centralizes maintenance operations for college facilities, supporting administrators, technicians, college staff, and students. It enables managing service requests, tracking tasks, and maintaining campus areas like grounds, housing, and utilities. The system provides role-specific dashboards, task management with time and parts tracking, and administrative functions including user, vendor, inventory management, property mapping, and reporting. The platform aims to streamline facility management, improve response times, and optimize resource allocation across college campuses.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core System Design

The platform uses a 4-role model (Admin, Technician, Staff, Student) with role-based access control and dashboards. Tasks are assigned to specific users or pools (student_pool/technician_pool), with conditional forms for student tasks including detailed instructions and photo requirements. API routes are protected to enforce role-based authorization for task management. Vehicle fleet statuses are automatically updated based on reservations and usage logs, with manual overrides for specific maintenance needs.

### UI/UX Decisions

The frontend is built with React 18, TypeScript, and Vite, utilizing Radix UI and shadcn/ui for components, styled with Tailwind CSS. Design prioritizes a mobile-first, action-focused approach. PWA support is configured for installable applications and 30-day session persistence. The dashboard is interactive, with clickable filter cards, a central task panel, and a quick view drawer. Analytics are consolidated into a single dynamic page with tab-based navigation, lazy loading, and consistent filtering and export options. Navigation has been consolidated, merging related pages and introducing tabbed interfaces for improved user experience.

The student and technician experiences are simplified with "dummy-proof" interfaces, minimal headers, and full-width mobile layouts, focusing on essential task information and actions. Task detail pages include "Previous Work Here" sections for technicians.

### Technical Implementations

The backend uses Express.js (Node.js, TypeScript) with a RESTful API. Data persistence is managed with Drizzle ORM for PostgreSQL. Authentication is handled via Replit Auth (OpenID Connect) with Passport.js and session management. File uploads integrate with Replit Object Storage. Database migrations are designed to be idempotent.

### Feature Specifications

-   **User Roles:** Admin, Technician, Staff, Student, each with specific permissions and dashboard views.
-   **Task Management:** Creation, assignment, tracking, status updates, time logging, parts tracking, and conditional fields.
-   **Vehicle Fleet Management:** Automatic status updates based on reservations/usage logs; manual overrides. Includes a detailed checkout/checkin flow with admin approval, safety acknowledgments, and photo/mileage/fuel logging.
    - **Checkout Wizard (5 main steps):** Advisory (with key pickup reveal mid-wizard after acceptance) → Safety → Responsibilities → Checkout details (sub-stepped: mileage → fuel → condition → damage → photos) → Complete
    - **Check-in Wizard (3 main steps):** Trip Summary → Inspection (sub-stepped: mileage → fuel → cleanliness → issues → photos → notes) → Complete
    - **Vehicle Info Gating:** Non-admin users see only vehicle name (not full details) until checkout is completed; full details (make/model/year/capacity) visible to admins and after active/completed status
    - **Key Pickup Timing:** Key pickup instructions revealed AFTER advisory acceptance in checkout wizard (mid-wizard, before checkout details), so user can retrieve key before filling out form
    - **Time-locked Checkout Button:** Checkout button on reservation details is disabled before reservation start time, showing "Checkout opens [time]"; unlocks live every 30s via interval; admins can override
    - **My Reservations Enrichment:** GET /api/vehicle-reservations/my returns vehicleName and vehicleDisplayId; approved cards show "Assigned Vehicle" badge; View Details hidden for pending/cancelled
    - **Authorization Fixes:** Admins/technicians can accept advisory and create checkout logs for any reservation (not just their own)
-   **Service Request Management:** Staff can submit requests; students can complete assigned tasks.
-   **Inventory & Vendor Management:** Advanced hybrid inventory tracking system:
    - **Counted mode** (Auto, Plumbing, Electrical, Repairs): decimal-precise quantities, barcode scanning, decimal-safe parts logging
    - **Container/Unit mode** (Cleaning, Landscaping): tracks whole containers/bags with a "Used One" tap button
    - **Status Only mode** (small consumables): Stocked/Low/Out badge that cycles on click, no counting
    - Category filter tabs (All, Auto, Cleaning, Landscaping, Plumbing, Electrical, Repairs, General)
    - Barcode/QR scanning via phone camera (html5-qrcode) for "Scan to Find" and "Scan to Receive" flows
    - QR label generation per item with Print Label feature (qrcode package)
    - Package info field (e.g., "32 oz bottle", "12-pack case") displayed in parts dialog
    - AI-powered Insights panel: Reorder Recommendations and Usage Trends (OpenAI)
    - Task Parts AI Suggest: suggests inventory items with quantities based on task description
-   **Notifications:** In-app (bell icon) for document expiration, task reminders, and overdue tasks; Email (via Resend) for transactional events like new service requests or reservation approvals. An admin-only email management interface allows editing templates, toggling notification types, and viewing logs.
-   **Property Mapping:** Tools for mapping and managing campus properties with a hierarchical structure supporting buildings, spaces, and flat properties. Tasks can be assigned to properties, spaces, or specific equipment.
-   **Reporting & Analytics:** Consolidated module with various reports (Work Orders, Technicians, Assets, Fleet, Service Requests) accessible via tabs, with filtering and export capabilities.
-   **Sub-Tasks for Multi-Asset Work:** Tasks can have sub-tasks, each linked to a specific piece of equipment or vehicle. Supports batch work (inspect 4 cars) and prerequisite work. Sub-task names are auto-generated as "{Parent Task Name} — {Asset Name}". Parent tasks auto-complete when all sub-tasks are done, auto-start when any sub-task starts. Sub-tasks appear as expandable rows on the Work page and as progress cards on TaskDetail. Technicians and admins can add sub-tasks via QR scan or search; students can view but not add. Vehicle QR codes (`/vehicles/{id}`) are recognized alongside equipment QR codes. Multi-asset task creation in NewTask creates parent + sub-tasks automatically. Schema: `parentTaskId` on tasks table (self-referential, cascade delete).
-   **Completed Task Summary Sheet:** Slide-out Sheet component (`CompletedTaskSummary.tsx`) accessible from Work, Tasks, TaskDetail, VehicleDetail maintenance history, and EquipmentWorkHistory pages. Shows professional work-order-receipt recap: task name, completion date, overview, time summary, parts/materials table, estimates/quotes, photos/documents, and sub-task summary. Empty sections are hidden. Includes print support via `window.print()`.
-   **Auto-Link Task Completion to Vehicle Maintenance Logs:** When a vehicle-linked task (or sub-task) is completed, a `vehicle_maintenance_log` entry is auto-created with task data (description, cost, performer, date). The `taskId` field on `vehicle_maintenance_logs` links back to the originating task. Tapping a task-linked maintenance log entry in VehicleDetail opens the Completed Task Summary sheet.
-   **Unified Work Page:** Combines tasks and projects into a single view with unified status groups, project expansion for child tasks, and integrated search/filtering.
-   **Project Management:** Simplified project detail pages as read-only organizational containers for grouping tasks.
-   **Internal Estimates/Quotes Workflow:** Task-level quote management with enforced approval workflow. Technicians can work on tasks normally but cannot mark them complete until estimates are submitted and admin-approved. Admins review and approve estimates via a "Review & Approve" popup dialog on the Work page, with an optional instructions field that updates the task. Server-side validation blocks completion on all routes. Status dropdowns across all views (Work, Tasks, TaskDetail, Dashboard/Drawer) hide the "Completed" option when estimates are pending. Rejection of all quotes returns the task to "In Progress" for resubmission. Estimate status banners guide technicians and students on all task detail views. Component: `client/src/components/EstimateReviewDialog.tsx`.
-   **File Storage Architecture:** Secure file uploads and downloads using Replit Object Storage with presigned URLs and role-based access control.
-   **Security Hardening:** Login and general API rate limiting (with `trust proxy` always enabled for Replit's reverse proxy), dynamic session secret, and a health check endpoint.
-   **Error Boundary:** A React `ErrorBoundary` component wraps all routes in `App.tsx`. If any page crashes during rendering, users see a friendly "Something went wrong" card with a reload button instead of a blank white screen.
-   **Password Recovery:** Self-service "Forgot Password" flow. Users enter their username, receive a one-time reset link via email (Resend), click the link to set a new password. Tokens expire after 1 hour and are single-use. Both endpoints are rate-limited. The forgot-password response is always generic to prevent username enumeration. Pages: `/forgot-password` and `/reset-password?token=...`.
-   **Calendar (Redesigned):** Week view default on desktop, Day view default on mobile. Tasks display across their full active period (start date through due date). Day and Week views include an hourly time grid (6 AM–10 PM) with timed task blocks and an "All day" row. Per-user color coding via consistent hash. Assignee filter bar with color-coded chips. Current-time indicator line on today's grid. Tasks with a `scheduledStartTime` appear at the correct hour slot; tasks without appear in the All Day row.
-   **Scheduled Time Field:** Optional `scheduledStartTime` (varchar, format "HH:MM") added to the tasks table and task creation/edit forms. Stored as `scheduled_start_time` in the database (migration 039).
-   **One-tap Photo/Doc Upload:** TaskDetail bottom action bar has a single "Photos/Docs" button (Paperclip icon) that directly opens the file picker for both images and documents. Files upload and auto-save without an intermediate sheet or manual save step.

## External Dependencies

-   **Replit Authentication:** OIDC provider for user identity.
-   **Replit Object Storage:** Google Cloud Storage via sidecar endpoint for file uploads.
-   **Neon PostgreSQL:** Serverless PostgreSQL database.
-   **Drizzle ORM:** For type-safe database interactions.
-   **Passport.js:** Authentication middleware.
-   **React Hook Form:** For form management and validation.
-   **Uppy:** File upload UI library.
-   **TanStack Query:** For asynchronous state management.
-   **express-rate-limit:** Rate limiting middleware.
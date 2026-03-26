# College Maintenance Management Platform

## Overview

This platform centralizes maintenance operations for college facilities, supporting administrators, technicians, college staff, and students. It enables managing service requests, tracking tasks, and maintaining campus areas like grounds, housing, and utilities. The system provides role-specific dashboards, task management with time and parts tracking, and administrative functions including user, vendor, inventory management, property mapping, and reporting. The platform aims to streamline facility management, improve response times, and optimize resource allocation across college campuses.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core System Design

The platform employs a 4-role model (Admin, Technician, Staff, Student) with role-based access control. Tasks are assignable to specific users or pools. Vehicle fleet statuses are automatically updated based on reservations and usage logs, with manual override capabilities. It supports multi-asset tasks through sub-tasks linked to specific equipment or vehicles, which auto-complete and auto-start based on their child tasks. Internal estimates and quotes require an admin approval workflow before task completion.

### UI/UX Decisions

The frontend is built with React 18, TypeScript, and Vite, utilizing Radix UI and shadcn/ui components styled with Tailwind CSS. It features a mobile-first, action-focused design with PWA support. The admin dashboard uses a "Sectioned Dashboard" (Variant C) layout: full-width KPI banner (5 tiles), three-column body (technician progress left, task board center, AI/requests/vehicles right) with hover popovers on task rows and responsive mobile stacking. Staff, student, and technician dashboards remain simplified role-specific views. The admin dashboard component lives at `client/src/components/dashboard/AdminDashboard.tsx`. Analytics are consolidated into a dynamic page with tab-based navigation, lazy loading, and consistent filtering. User experiences for students and technicians are simplified with "dummy-proof" interfaces, minimal headers, and full-width layouts. The calendar offers week and day views with an hourly time grid and assignee filters.

### Technical Implementations

The backend uses Express.js (Node.js, TypeScript) with a RESTful API. Server routes are organized into domain-specific modules under `server/routes/` (auth, users, vendors, inventory, facilities, serviceRequests, tasks, messages, uploads, notifications, vehicles, analytics, projects, resources, ai). Shared route utilities (error handling, validation, vehicle/project status sync) live in `server/routeUtils.ts`. The main `server/routes.ts` is a thin orchestrator that registers all modules. Data persistence is handled by Drizzle ORM for PostgreSQL. Authentication uses Replit Auth (OpenID Connect) with Passport.js. File uploads integrate with Replit Object Storage using presigned URLs and role-based access. Database migrations are idempotent. Security features include API rate limiting, dynamic session secrets, and a health check endpoint. Error handling is standardized via `handleRouteError()` which maps Zod validation errors to 400, DB constraint violations to 409, and other errors to 500. A React ErrorBoundary ensures graceful error handling for the frontend. Password recovery is self-service with rate-limited, single-use email tokens.

### Feature Specifications

-   **User Roles & Task Management:** Role-specific permissions, task creation, assignment, tracking, status updates, time/parts logging, and conditional fields.
-   **Vehicle Fleet Management:** Detailed checkout/check-in flows with admin approval, safety acknowledgments, photo/mileage/fuel logging, and time-locked checkout buttons. Includes a "Code Hub" for managing lockbox access codes for key retrieval and a smart QR code redirect for vehicle interaction.
-   **Service Request Management:** Staff can submit requests; students can complete assigned tasks.
-   **Inventory & Vendor Management:** Advanced hybrid inventory tracking (Counted, Container/Unit, Status Only modes), barcode/QR scanning, QR label generation, and AI-powered reorder recommendations. Includes AI suggestions for task parts based on descriptions.
-   **Notifications:** In-app for reminders/overdue tasks; Email (via Resend) for transactional events, with an admin-only template management interface. AI Agent actions with `pending_review` status automatically generate system notifications for all admin users.
-   **AI Dashboard Integration:** The admin dashboard includes an AI Recommendations summary card showing pending review count, approved, auto-applied, and acceptance rate stats, with a direct link to the AI Agent page.
-   **Property Mapping:** Full-width property list page (`/properties`) with type tabs, search, sortable columns (name, last work, equipment count), and responsive mobile layout. The campus map opens in a Dialog popup via "Show Map" button. "Add Property" is a DropdownMenu with 7 property types (building, lawn, parking, recreation, utility, road, other) — selecting a type opens the map in creation mode with drawing tools. Properties link to detail pages at `/properties/:id`. Uses Leaflet for the interactive map with property shapes rendered from GeoJSON coordinates. Admin/technician roles can create and delete properties.
-   **Reporting & Analytics:** Consolidated module with various reports (Work Orders, Technicians, Assets, Fleet, Service Requests), filtering, and export capabilities.
-   **Completed Task Summary Sheet:** Provides a professional work-order-receipt recap of completed tasks, accessible from multiple views, with print support.
-   **Auto-Link Task Completion to Vehicle Maintenance Logs:** Vehicle-linked tasks automatically create maintenance log entries upon completion.
-   **Unified Work Page:** Combines tasks and projects into a single view with unified status groups and integrated search/filtering.
-   **Resource Library Folders:** Nested folder system for organizing documentation with breadcrumb navigation.
-   **File Storage Architecture:** Secure file uploads and downloads using Replit Object Storage.
-   **User Management:** Full CRUD with admin-only access and safeguards against self-deletion and FK constraint violations. The `/api/users` and `/api/users/:id` endpoints return limited data (id, firstName, lastName, role, username) for non-admin roles, while admins receive full user details. This prevents PII exposure (email, phone) to technicians and students while still allowing name lookups needed across the app.
-   **One-tap Photo/Doc Upload:** Streamlined file upload directly from the task detail page without intermediate steps.
-   **Scheduled Time Field:** Optional `scheduledStartTime` for tasks, influencing calendar display.
-   **Project Detail Redesign:** Two-column layout on desktop (left: project info/tasks/timeline, right: details panel + activity feed + files). Includes a chat-style activity feed with comments, system events, date separators, and file attachments. Files & Photos tab aggregates all project-level uploads. Database: `project_comments` table and `project_id`/`project_comment_id` columns on `uploads`.
-   **Student Helpers System:** Admins can assign student workers as helpers on technician/student tasks via `task_helpers` join table. Helpers can view task details, log time entries, and add notes/messages, but cannot change task status or mark tasks complete. Helper management is available in NewTask and EditTask forms (multi-select toggle UI). The student Work page shows a "Helper" badge on helper tasks. Task detail views display helpers list. API: POST/DELETE `/api/tasks/:id/helpers`, GET `/api/tasks/:id/helpers`, helpers included in GET `/api/tasks/:id` response.
-   **Self-Service Signup with Admin Approval:** Public signup form at `/request-access` allows new users to register (staff, technician, student roles — not admin). Registrations enter a `pending_users` table with 14-day expiration. Admin reviews pending requests on the Users page "Pending" tab with approve/deny workflow. Approved users get accounts created automatically; denied users receive optional reason. Email notifications sent at submission (to user + admins) and on decision. Pending/denied users see informative messages when attempting login. Sidebar badge shows pending signup count for admin users. Rate-limited to 5 requests/hour. Routes: `POST /api/signup`, `GET /api/pending-users`, `POST /api/pending-users/:id/approve`, `POST /api/pending-users/:id/deny`.

## External Dependencies

-   **Replit Authentication:** OIDC provider for user identity.
-   **Replit Object Storage:** For file storage (Google Cloud Storage via sidecar).
-   **Neon PostgreSQL:** Serverless PostgreSQL database.
-   **Drizzle ORM:** For type-safe database interactions.
-   **Passport.js:** Authentication middleware.
-   **Resend:** Email delivery service.
-   **TanStack Query:** For asynchronous state management.
-   **OpenAI:** For AI-powered insights and suggestions.
-   **html5-qrcode:** For barcode/QR scanning via camera.
-   **qrcode (package):** For QR label generation.
-   **express-rate-limit:** Rate limiting middleware.

## Test Credentials

-   **Admin:** username `admin` / password `123456`
-   **Technician:** username `maintenance` / password `123456`
-   **Student:** username `Sebastian` / password `123456`
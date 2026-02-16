# College Maintenance Management Platform

## Overview

This web-based platform centralizes maintenance operations for college facilities, supporting administrators, technicians, college staff, and students. It enables managing service requests, tracking tasks, and maintaining campus areas like grounds, housing, and utilities. The system provides role-specific dashboards, task management with time and parts tracking, and administrative functions including user, vendor, inventory management, property mapping, and reporting. The platform aims to streamline facility management, improve response times, and optimize resource allocation across college campuses.

## User Preferences

Preferred communication style: Simple, everyday language.

### Testing Credentials
- Admin account: username `admin`, password `123456`

## System Architecture

### Core System Design

The platform uses a 4-role model (Admin, Technician, Staff, Student) with role-based access control and dashboards. Tasks are assigned to specific users or pools (student_pool/technician_pool), with conditional forms for student tasks including detailed instructions and photo requirements. API routes are protected to enforce role-based authorization for task management. Vehicle fleet statuses are automatically updated based on reservations and usage logs, with manual overrides for specific maintenance needs.

### UI/UX Decisions

The frontend is built with React 18, TypeScript, and Vite, utilizing Radix UI and shadcn/ui for components, styled with Tailwind CSS. Design prioritizes a mobile-first, action-focused approach, especially for task detail pages.

**Student Experience (simplified, "dummy-proof"):**
- Student Work page shows numbered task cards with large tap targets, minimal badges (only "In Progress" or "Urgent"), and a floating "I'm Done for Day" button that logs them out
- Student TaskDetail shows only: task name, location, instructions box, checklist with big checkboxes, time logged, notes field, photo upload, and a large "Mark as Completed" button at the bottom — no admin complexity (no quotes, parts, assignments, vendors, etc.)
- Students have a minimal header (just their name, sidebar toggle, theme toggle — no Sign Out button, notifications, or back button)
- Student main content area has no padding for full-width mobile experience

**Technician Experience (simplified, matches student PWA style):**
- Technician Work page shows numbered task cards with large tap targets, minimal badges (only "In Progress" or "Urgent"), no "I'm Done for Day" button
- Technicians have a minimal header (just their name, sidebar toggle, theme toggle — no Sign Out button, notifications, or back button)
- Technician sidebar has only 3 items: My Tasks, Messages, Settings (no Dashboard or Calendar)
- Technicians redirect from / to /work (skip Dashboard)
- Technician main content area has no padding for full-width mobile experience
- Task detail page includes "Previous Work Here" collapsible section showing completed tasks at the same property/equipment, with task name, description, assignee, date, and "Same Equipment" badge
- Quick action buttons are compact horizontal row (not 3-column grid) for better mobile use
- Full access to collapsible sections (quotes, parts, notes, etc.) but streamlined layout

**PWA Support:**
- manifest.json, service worker (sw.js), and meta tags configured for installable PWA
- 30-day session persistence for "stay logged in" experience on mobile
- Optimized for iPhone/Android home screen installation

The dashboard is interactive, with clickable filter cards, a central task panel with quick actions, and a quick view drawer for task details. Analytics are consolidated into a single dynamic page with tab-based navigation, lazy loading, and consistent filtering and export options.

### Technical Implementations

The backend uses Express.js (Node.js, TypeScript) with a RESTful API. Data persistence is managed with Drizzle ORM for PostgreSQL (Neon serverless). Authentication is handled via Replit Auth (OpenID Connect) with Passport.js and session management. File uploads integrate with Google Cloud Storage. Database migrations are designed to be idempotent and production-ready, ensuring schema consistency and safe deployments.

### Feature Specifications

- **User Roles:** Admin, Technician, Staff, Student, each with specific permissions and dashboard views.
- **Task Management:** Creation, assignment (to users or pools), tracking, status updates, time logging, parts tracking, and conditional fields for student tasks.
- **Vehicle Fleet Management:** Automatic status updates (in_use, reserved, available) based on reservations and usage logs; manual status overrides.
- **Service Request Management:** Staff can submit requests; students can complete assigned tasks.
- **Inventory & Vendor Management:** Administrative functions for managing parts, equipment, and suppliers.
- **In-App Notifications:** Bell icon widget in header displaying:
  - Document expiration reminders (30 days ahead, visible to all users)
  - Task reminders for upcoming tasks (7 days ahead)
  - Task overdue notifications
  - Mark as read/dismiss individual or all notifications
  - Notifications stored per-user with unread count badge
- **Email Notifications (via Resend):** Transactional emails sent for:
  - New service request submitted → email to all admin users
  - New vehicle reservation submitted → email to all admin users
  - Vehicle reservation approved → confirmation email to the requestor with online pickup instructions
- **Property Mapping:** Tools for mapping and managing campus properties.
- **Reporting & Analytics:** Consolidated analytics module with various reports (Work Orders, Technicians, Assets, Fleet, Service Requests) accessible via tabs, with filtering and export capabilities.
- **Unified Work Page:** Tasks and projects are consolidated into a single "Work" page (`/work`) replacing the separate Tasks and Projects pages:
  - Combined list view with unified status groups (Not Started, Needs Estimate, Waiting Approval, In Progress, On Hold, Completed)
  - Standalone tasks appear as regular rows with a wrench icon indicator
  - Projects appear as expandable rows with indigo/purple visual accent, FolderKanban icon, "Project" badge, and task completion progress
  - Project rows can be expanded to reveal nested child tasks with indented styling
  - Tasks linked to projects only appear inside their parent project's expanded row, never as standalone
  - Search filter works across both task and project names; type filter allows "All", "Tasks Only", "Projects Only"
  - Both "New Task" and "New Project" creation accessible from the same page
  - All inline editing capabilities preserved (name, description, status, urgency, dates, assignee, property, type)
  - Old `/tasks` and `/projects` list routes redirect to `/work`; detail pages (`/tasks/:id`, `/projects/:id`) remain unchanged
- **Project Management:** Simplified project detail page for multi-task maintenance projects:
  - Projects are read-only organizational containers grouping related tasks — not separate management areas
  - Single-scroll project detail page with summary cards (task progress, budget, time logged, timeline) and task list
  - No separate Team, Vendor, Quotes, or Analytics tabs — team/vendor info is derived from task assignments, quotes are managed at task level
  - Status tracking (planning, in_progress, on_hold, completed, cancelled) with priority levels
  - Shared status/priority color constants in `client/src/lib/constants.ts` used by Work.tsx and ProjectDetail.tsx
  
- **Internal Estimates/Quotes Workflow:** Task-level quote management for work requiring approval:
  - Tasks can be marked as "requiresEstimate" during creation
  - Task status flow: needs_estimate → waiting_approval → ready → in_progress → completed
  - Multiple quotes can be added per task with vendor name, estimated cost, and notes
  - Quote comparison UI allows reviewing and approving the best estimate
  - Approving a quote automatically rejects others and updates task status to "ready"
  - Quote statuses: draft, approved, rejected
  - Quote attachments supported for storing PDF estimates, photos, etc.

### Hierarchical Property Structure

The platform supports a hierarchical organization for campus properties:

- **Building Properties:** Support internal spaces (rooms like bathrooms, classrooms, offices). Equipment can belong to specific spaces within buildings.
- **Flat Properties:** Lawn, Parking, and Road types remain flat without spaces. Equipment belongs directly to these properties.
- **Spaces:** Represent rooms/areas within buildings with name, optional description, and optional floor number. Managed via the "Spaces" tab on building property detail pages.
- **Flexible Task Assignment:** Tasks support assignment to:
  - Property only (for general property maintenance)
  - Property + Space (for room-specific work)
  - Property + Equipment (for equipment in flat properties)
  - Property + Space + Equipment (for equipment within specific rooms)
- **Service Requests:** Can also target specific spaces within building properties.
- **Space Management API:** `/api/spaces` endpoint with full CRUD operations, restricted to building-type properties only.

### File Storage Architecture

The platform uses Replit Object Storage for secure file uploads (photos, documents, attachments):

- **Upload Flow:** Files are uploaded via `/api/uploads` endpoint using Uppy library. The server uploads files to Object Storage using the sidecar presigned URL API.
- **Download Flow:** Files are downloaded via `/api/uploads/:uploadId/download` endpoint which generates fresh signed URLs with 1-hour expiry for secure access.
- **Access Control:** 
  - Admins and technicians can access all uploads
  - Regular users can access uploads they uploaded OR uploads attached to their service requests, tasks, or vehicle logs
- **Mock File Handling:** Files uploaded before Object Storage was properly configured have mock URLs and display as "Unavailable" - these files cannot be recovered.
- **Environment Variables:** Requires `DEFAULT_OBJECT_STORAGE_BUCKET_ID` and `PRIVATE_OBJECT_DIR` environment variables.

## External Dependencies

- **Replit Authentication:** OIDC provider for user identity.
- **Replit Object Storage:** Google Cloud Storage via sidecar endpoint for file uploads.
- **Neon PostgreSQL:** Serverless PostgreSQL database.
- **Drizzle ORM:** For type-safe database interactions.
- **Passport.js:** Authentication middleware.
- **React Hook Form:** For form management and validation.
- **Uppy:** File upload UI library.
- **TanStack Query:** For asynchronous state management.
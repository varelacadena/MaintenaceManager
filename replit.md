# College Maintenance Management Platform

## Overview

This is a web-based maintenance management platform designed for college facilities departments. The system enables three distinct user roles (administrators, maintenance staff, and college staff) to collaborate on service requests, task tracking, and facility maintenance across multiple areas including grounds, housing, utilities, and building systems.

The platform provides role-based dashboards with workflows optimized for daily operations: college staff submit and track service requests, maintenance workers manage tasks with time tracking and parts logging, and administrators oversee all operations with user management, vendor management, inventory tracking, and reporting capabilities.

## Recent Updates (October 28, 2025)

**MAJOR ARCHITECTURAL REFACTORING - Request/Task Separation:**

**Backend Implementation (COMPLETED):**
- Created separate `tasks` table distinct from `service_requests`
- Service requests are now simple submissions (submitted/under_review/converted_to_task/rejected)
- Tasks contain all scheduling/assignment fields (initialDate, estimatedCompletionDate, assignedToId, assignedVendorId)
- Task types: one-time, recurring, reminder
- Updated all related tables (timeEntries, partsUsed, taskNotes) to reference tasks
- Messages and uploads can reference either requests or tasks
- Complete storage layer with task CRUD methods
- All routes updated: service request PATCH/DELETE, task CRUD, status updates
- Database trigger migration updated to work with taskId

**Frontend Implementation (COMPLETED):**
- Updated AppSidebar: "Service Requests" and "Tasks" navigation for admin/maintenance
- Created Tasks.tsx page for viewing/managing tasks with filters by status and urgency
- Created TaskDetail.tsx page with:
  - Full task information display (name, description, urgency, status, dates, area, assignment)
  - Time tracking with start/stop timer functionality
  - Parts used management with inventory item selection
  - Task notes for work log documentation
  - Status update controls for maintenance/admin users
  - Link to original service request if task was converted
- Created NewTask.tsx page for:
  - Creating new tasks from scratch (admin/maintenance only)
  - Converting service requests to tasks with pre-filled data
  - Full task configuration (dates, assignment, urgency, type, area/subdivision)
  - Automatic request status update when converting to task
- Updated Requests.tsx page with:
  - Simplified view for new request model (submitted/under_review/converted_to_task/rejected statuses)
  - Edit/delete buttons for request authors (staff) on submitted requests
  - Convert to Task button for admin/maintenance on under_review requests
  - Role-based UI (different views for staff vs admin/maintenance)
- Updated Calendar.tsx page to:
  - Display tasks instead of requests based on initialDate
  - Show task urgency indicators and status badges
  - Navigate to task detail pages
  - Include New Task button for admin/maintenance users
- Full routing configured in App.tsx for all task-related pages

**Previous Features:**
- User Management: phone numbers, full editing, credentials management
- Vendor Management: complete CRUD with task assignment capability
- Inventory Management: real-time tracking, low stock alerts, automatic updates via DB triggers
- Notification System: email/SMS infrastructure (ready for production integrations)
- Database Triggers: automatic inventory updates when parts used on tasks

**Next Steps:**
- Data migration script for existing service_requests (if any exist)
- End-to-end testing of complete request-to-task workflow
- Optional enhancements: request edit functionality, vendor task history

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework Stack:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and caching

**UI Component System:**
- Radix UI primitives for accessible, unstyled component foundations
- shadcn/ui component library configured in "new-york" style
- Tailwind CSS for utility-first styling with custom design system
- Material Design principles adapted for enterprise productivity (per design_guidelines.md)

**Design System:**
- Typography: Inter for interface text, Roboto Mono for technical data
- Spacing: Tailwind units (2, 4, 6, 8, 12, 16) for consistent rhythm
- Color system: HSL-based theme with CSS variables supporting light/dark modes
- Custom urgency levels (low/medium/high) and status colors for maintenance workflows

**State Management Pattern:**
- Server state via React Query with infinite stale time (optimistic updates)
- Authentication state through custom useAuth hook
- Form state managed by React Hook Form with Zod validation
- Local UI state with React useState hooks

### Backend Architecture

**Server Framework:**
- Express.js on Node.js with TypeScript
- ES modules throughout (type: "module" in package.json)
- RESTful API design with role-based middleware protection

**Database Layer:**
- Drizzle ORM configured for PostgreSQL via Neon serverless
- Schema-first approach with TypeScript type inference
- Connection pooling through @neondatabase/serverless with WebSocket support
- Session storage in PostgreSQL for authentication persistence

**Authentication System:**
- Replit Auth (OpenID Connect) integration via passport.js
- Session-based authentication with connect-pg-simple store
- Role-based access control middleware (requireAdmin, requireMaintenanceOrAdmin, requireStaffOrHigher)
- User provisioning on first login with default "staff" role

**Authorization Model:**
- Three-tier role system: admin (full access), maintenance (task management), staff (request submission)
- Middleware enforces permissions at route level
- Request-level access control for viewing/modifying specific service requests

**API Architecture:**
- Route registration in server/routes.ts centralizes all endpoints
- Storage abstraction layer (server/storage.ts) separates database operations
- Consistent error handling with HTTP status codes
- Request/response logging middleware for debugging

**File Upload System:**
- Google Cloud Storage integration via @google-cloud/storage
- Uppy file uploader on frontend with AWS S3 compatibility layer
- Custom ACL policy system for object-level permissions
- Support for photos, invoices, and task-related documents

### Data Model

**Core Entities:**
1. **Users** - Authentication identity with role assignment, phone numbers, and full contact information (admin/maintenance/staff)
2. **Vendors** - Service providers and contractors with contact information, address, and notes
3. **Inventory Items** - Stock tracking with quantities, units, locations, and cost information
4. **Areas** - Top-level maintenance categories (8 default: Grounds, Housing, Water Treatment, etc.)
5. **Subdivisions** - Hierarchical organization within areas (e.g., Houses → Rooms)
6. **Service Requests** - Work orders with title, description, urgency, status, scheduling, and optional vendor assignment
7. **Time Entries** - Work duration tracking for maintenance tasks
8. **Parts Used** - Inventory logging with cost and quantity
9. **Messages** - Communication threads attached to service requests
10. **Uploads** - File attachments (photos, invoices) with GCS storage
11. **Task Notes** - Maintenance staff work logs and status updates

**Key Relationships:**
- Service requests link to areas/subdivisions, requesters, and assigned staff
- Time entries and parts used connect to specific requests for cost tracking
- Messages enable bidirectional communication between requesters and maintenance
- Uploads support multiple files per request with access control

**Status Workflow:**
- pending → in_progress → completed
- on_hold state with required reason tracking
- Urgency levels (low/medium/high) influence calendar prioritization

### External Dependencies

**Third-Party Services:**
- **Replit Authentication** - OIDC provider for user identity (replit.com/oidc)
- **Replit Object Storage** - Google Cloud Storage via sidecar endpoint (127.0.0.1:1106)
- **Neon PostgreSQL** - Serverless Postgres database (connection via DATABASE_URL env var)

**Key Libraries:**
- **Drizzle ORM** - Type-safe database queries and schema management
- **Passport.js** - Authentication middleware with openid-client strategy
- **React Hook Form** - Form validation with @hookform/resolvers for Zod integration
- **Uppy** - File upload UI with dashboard, AWS S3, and React bindings
- **TanStack Query** - Async state management with caching and optimistic updates

**Development Tools:**
- **Vite plugins** - Runtime error overlay, cartographer (Replit-specific), dev banner
- **TypeScript** - Strict mode enabled with path aliases (@/, @shared/, @assets/)
- **ESBuild** - Server bundling for production builds

**Configuration Requirements:**
- DATABASE_URL - PostgreSQL connection string (required)
- SESSION_SECRET - Session encryption key (required)
- PRIVATE_OBJECT_DIR - GCS bucket path for file storage (required)
- ISSUER_URL - OIDC provider URL (defaults to replit.com/oidc)
- REPL_ID - Replit deployment identifier

**Database Setup:**
- Initial migration creates all tables via drizzle-kit
- Seed script (server/seed.ts) populates 8 default maintenance areas
- Sessions table required for Replit Auth persistence
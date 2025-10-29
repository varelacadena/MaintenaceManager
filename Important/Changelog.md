
# Changelog

## Format Guidelines
- Use `YYYY-MM-DD` date format
- Categories: `Added`, `Changed`, `Fixed`, `Removed`, `Security`
- Include technical details for reference
- Link to related files when possible

---

## [2025-10-28] - Request/Task Architecture Separation

### Changed - MAJOR ARCHITECTURAL REFACTOR
**Request/Task Separation Implementation**

#### Backend Changes (`server/`)
- **Database Schema** (`shared/schema.ts`):
  - Created separate `tasks` table with full lifecycle management
  - Service requests simplified to submission workflow (submitted → under_review → converted_to_task/rejected)
  - Tasks contain scheduling fields: `initialDate`, `estimatedCompletionDate`, `assignedToId`, `assignedVendorId`
  - Task types: `one-time`, `recurring`, `reminder`
  - Related tables updated: `timeEntries`, `partsUsed`, `taskNotes` now reference `taskId`
  - `messages` and `uploads` can reference either `requestId` or `taskId`

- **Storage Layer** (`server/storage.ts`):
  - Added complete task CRUD operations
  - Task status management methods
  - Assignment and vendor management for tasks
  - Query methods with filtering by status/urgency

- **Routes** (`server/routes.ts`):
  - Service request routes: simplified PATCH/DELETE operations
  - New task routes: full CRUD at `/api/tasks`
  - Task-specific routes: `/api/tasks/:id/status`, `/api/tasks/:id/time-entries`, etc.
  - Conversion endpoint: POST `/api/tasks/from-request/:requestId`

- **Database Migrations** (`server/migrations/`):
  - `002_nullable_request_id.sql`: Made requestId nullable for standalone tasks
  - `005_add_note_type_column.sql`: Added note type column for task notes
  - Updated trigger to work with taskId for inventory management

#### Frontend Changes (`client/src/`)
- **Navigation** (`components/AppSidebar.tsx`):
  - Separated "Service Requests" and "Tasks" menu items
  - Role-based visibility (admin/maintenance see both)

- **Pages Created**:
  - `Tasks.tsx`: Task list view with status/urgency filters
  - `TaskDetail.tsx`: Complete task management interface
    - Time tracking with start/stop timer
    - Parts used logging with inventory integration
    - Task notes for work documentation
    - Status updates
    - Link to original service request
  - `NewTask.tsx`: Task creation and request conversion
    - Standalone task creation (admin/maintenance)
    - Service request → task conversion with pre-filled data
    - Full configuration: dates, assignment, urgency, type, area
  - `EditTask.tsx`: Task modification interface

- **Pages Updated**:
  - `Requests.tsx`: Simplified for new request model
    - Role-based views (staff vs admin/maintenance)
    - Edit/delete for request authors on submitted requests
    - Convert to Task button for admin/maintenance
  - `Calendar.tsx`: Now displays tasks based on `initialDate`
    - Task urgency indicators and status badges
    - Navigation to task detail pages
    - New Task button for admin/maintenance

- **Routing** (`App.tsx`):
  - `/tasks` - Task list page
  - `/tasks/:id` - Task detail page
  - `/tasks/:id/edit` - Task edit page
  - `/tasks/new` - New task creation
  - `/tasks/new/:requestId` - Convert request to task

#### System Integration
- **Notifications** (`server/notifications.ts`):
  - Ready for task assignment notifications
  - Status change notifications for both requests and tasks
  - Email/SMS infrastructure (console fallback, production-ready)

- **Inventory Integration**:
  - Database triggers automatically update inventory when parts used on tasks
  - Real-time quantity tracking
  - Low stock alerts

### Technical Details
- All TypeScript types updated for task/request separation
- Role-based access control enforced on all task routes
- Optimistic UI updates with React Query for instant feedback
- Full error handling and validation on all operations

---

## System Architecture Reference

### Core Data Flow
1. **Service Request Submission** (Staff) → `POST /api/service-requests`
2. **Review Process** (Admin/Maintenance) → `PATCH /api/service-requests/:id`
3. **Task Conversion** → `POST /api/tasks/from-request/:requestId`
4. **Task Execution** → Time tracking, parts logging, notes
5. **Completion** → Status updates, inventory adjustments, notifications

### Key File Locations
- **Schema**: `shared/schema.ts` - All database table definitions
- **Storage**: `server/storage.ts` - Database operations layer
- **Routes**: `server/routes.ts` - API endpoints
- **Migrations**: `server/migrations/*.sql` - Database schema changes
- **Components**: `client/src/components/` - Reusable UI elements
- **Pages**: `client/src/pages/` - Route-level views

### Authentication & Authorization
- **Auth Provider**: Replit Auth (OIDC) via `server/replitAuth.ts`
- **Session Storage**: PostgreSQL via connect-pg-simple
- **Roles**: admin, maintenance, staff
- **Middleware**: `server/middleware.ts` - Role checks

### External Services
- **Database**: Neon PostgreSQL (serverless)
- **File Storage**: Google Cloud Storage via Replit Object Storage
- **Notifications**: Email (Resend/SendGrid) + SMS (Twilio) ready

---

## Previous Updates

### [2025-10-27] - User & Vendor Management
#### Added
- Phone number field to users table
- Full user editing capabilities (name, email, phone, role)
- Complete vendor management system (CRUD operations)
- Vendor assignment to tasks
- Credentials management page for default users

### [2025-10-26] - Inventory System
#### Added
- Inventory items table with quantity tracking
- Low stock alerts (below 10 units)
- Parts used tracking on tasks
- Database triggers for automatic inventory updates
- Cost tracking per inventory item

### [2025-10-25] - Initial Release
#### Added
- Basic service request system
- User authentication with Replit Auth
- Role-based dashboards
- Calendar view
- Message threads
- File uploads via GCS
- Area and subdivision organization

---

## Usage Notes

### How to Update This Changelog
1. Add new entries at the top with current date
2. Use appropriate category headings
3. Include technical details for future reference
4. Note any breaking changes clearly
5. Reference related files and endpoints

### For AI Assistant Context
This changelog helps me understand:
- What systems exist and how they work
- Recent changes and their impact
- Technical architecture decisions
- File structure and relationships
- API endpoints and their purposes

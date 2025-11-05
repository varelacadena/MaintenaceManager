# College Maintenance Management Platform

## Overview

This is a web-based maintenance management platform designed for college facilities departments. The system enables three distinct user roles (administrators, maintenance staff, and college staff) to collaborate on service requests, task tracking, and facility maintenance across multiple areas including grounds, housing, utilities, and building systems.

The platform provides role-based dashboards with workflows optimized for daily operations: college staff submit and track service requests, maintenance workers manage tasks with time tracking and parts logging, and administrators oversee all operations with user management, vendor management, inventory tracking, and reporting capabilities.

## Recent Updates (November 5, 2025)

**MESSAGING & USER MANAGEMENT ENHANCEMENTS:**

**Task Messaging System (COMPLETED):**
- Added message display to TaskDetail page with real-time polling (5-second intervals)
- Messages section visible for admin/maintenance roles only
- Auto-scroll to latest message on new message submission
- Mark messages as read functionality (PATCH /api/tasks/:taskId/messages/mark-read)
- Backend routes: POST /api/messages, GET /api/messages/task/:taskId
- Added `read` boolean column to messages table for unread tracking
- Updated useUnreadMessages hook to return { unreadCount, messages } object
- Fixed sidebar message badge to correctly display unread count

**Settings & Profile Management (COMPLETED):**
- Created Settings.tsx page accessible to all authenticated users
- Profile update form: firstName, lastName, email, phoneNumber
- Password change form with current password verification
- Backend routes:
  - PATCH /api/users/:id/profile - Update user profile
  - POST /api/users/change-password - Change password with validation
- Authorization: Users can only update their own profile
- Success notifications and automatic auth state refresh
- Added Settings link to sidebar for all user roles

**Credential Recovery (COMPLETED):**
- Forgot Username functionality on login page
  - POST /api/auth/forgot-username - Sends username to user's email
  - Dialog with email input and success toast
- Forgot Password functionality on login page
  - POST /api/auth/forgot-password - Sends reset link to user's email
  - Dialog with email input and success toast
- Security best practices:
  - Always returns success to prevent email enumeration
  - Uses notification service for email delivery
  - Backend routes available without authentication
- Added getUserByEmail method to storage layer
- End-to-end tested and verified working

**Previous Updates (October 28, 2025):**

**Request/Task Separation Architecture:**
- Created separate `tasks` table distinct from `service_requests`
- Service requests: submitted/under_review/converted_to_task/rejected workflow
- Tasks: full scheduling, assignment, time tracking, parts usage
- Task types: one-time, recurring, reminder
- Complete frontend pages: Tasks.tsx, TaskDetail.tsx, NewTask.tsx
- Calendar integration showing tasks with urgency indicators
- User Management, Vendor Management, Inventory Management with DB triggers
- Notification System infrastructure (email/SMS ready)

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
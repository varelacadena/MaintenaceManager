# College Maintenance Management Platform

## Overview

This web-based platform streamlines maintenance operations for college facilities. It supports three user roles—administrators, maintenance staff, and college staff—to manage service requests, track tasks, and maintain campus areas including grounds, housing, and utilities. The system provides role-specific dashboards, task management with time and parts tracking, and administrative functions such as user, vendor, and inventory management, property mapping, and reporting.

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
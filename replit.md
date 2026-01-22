# College Maintenance Management Platform

## Overview

This web-based platform centralizes maintenance operations for college facilities, supporting administrators, technicians, college staff, and students. It enables managing service requests, tracking tasks, and maintaining campus areas like grounds, housing, and utilities. The system provides role-specific dashboards, task management with time and parts tracking, and administrative functions including user, vendor, inventory management, property mapping, and reporting. The platform aims to streamline facility management, improve response times, and optimize resource allocation across college campuses.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core System Design

The platform uses a 4-role model (Admin, Technician, Staff, Student) with role-based access control and dashboards. Tasks are assigned to specific users or pools (student_pool/technician_pool), with conditional forms for student tasks including detailed instructions and photo requirements. API routes are protected to enforce role-based authorization for task management. Vehicle fleet statuses are automatically updated based on reservations and usage logs, with manual overrides for specific maintenance needs.

### UI/UX Decisions

The frontend is built with React 18, TypeScript, and Vite, utilizing Radix UI and shadcn/ui for components, styled with Tailwind CSS. Design prioritizes a mobile-first, action-focused approach, especially for task detail pages, featuring simplified headers, quick action buttons, editable details, and collapsible sections to reduce information overload. The dashboard is interactive, with clickable filter cards, a central task panel with quick actions, and a quick view drawer for task details. Analytics are consolidated into a single dynamic page with tab-based navigation, lazy loading, and consistent filtering and export options.

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
- **Property Mapping:** Tools for mapping and managing campus properties.
- **Reporting & Analytics:** Consolidated analytics module with various reports (Work Orders, Technicians, Assets, Fleet, Service Requests) accessible via tabs, with filtering and export capabilities.

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
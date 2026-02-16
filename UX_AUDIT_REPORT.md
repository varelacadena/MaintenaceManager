# UX Audit Report - College Maintenance Management Platform

**Date:** February 16, 2026
**Testing Method:** End-to-end simulated live usage across all platform features
**Test Account:** Admin (full access)

---

## BUGS FOUND & FIXED DURING TESTING

### Bug 1: Quote Creation Fails with Server Error (FIXED)
- **Severity:** High
- **Description:** Creating a quote on a task returns a 500 server error. The database `quotes` table had `vendor_id` set as NOT NULL, but the application code treats vendor as optional (using `vendorName` text field, not a foreign key).
- **Impact:** Blocked the entire internal estimate/quote workflow for tasks.
- **Fix Applied:** Made `vendor_id` nullable in the database to match the application schema.

### Bug 2: Vehicle Maintenance Logs Table Missing (FIXED)
- **Severity:** Medium
- **Description:** The `vehicle_maintenance_logs` table was defined in the schema code but never created in the database. Visiting a vehicle detail page triggered 500 errors when trying to load maintenance history.
- **Impact:** Vehicle detail pages showed errors for the maintenance log section.
- **Fix Applied:** Created the missing `vehicle_maintenance_logs` table in the database.

---

## REDUNDANCIES & IMPROVEMENT OPPORTUNITIES

### 1. Sidebar Navigation - Too Many Items (15 items)

**Current sidebar items:**
Dashboard, Service Requests, Work, Calendar, Analytics, Vehicle Fleet, Vehicle Reservations, Properties, Messages, User Management, Credentials, Vendors, Inventory, Emergency Contacts, Settings

**Issues:**
- **Vehicle Fleet + Vehicle Reservations** are separate sidebar items but are closely related. A user managing vehicles has to mentally track two different sidebar entries.
- **User Management + Credentials** serve overlapping purposes. Users page shows all users and roles, while Credentials manages login accounts. This distinction is confusing — most admins would expect these to be one page.
- **15 items is a lot** for a sidebar. It requires scrolling on smaller screens and creates cognitive overload.

**Recommendation:**
- Combine "Vehicle Fleet" and "Vehicle Reservations" into a single "Vehicles" section with tabs or sub-navigation inside.
- Merge "User Management" and "Credentials" into a single "Users" page with a tab for credential management.
- Group related items: consider collapsible groups like "Fleet Management" (Vehicles, Reservations) and "Administration" (Users, Vendors, Inventory, Emergency Contacts).
- This would reduce sidebar items from 15 to approximately 10-11.

---

### 2. Dashboard - Missing Cards

**Issue:** Two dashboard cards (`card-my-requests` and `card-my-reservations`) were not present in the DOM during testing. The admin dashboard shows projects summary, vehicle status, and recent requests, but personal request tracking and reservation summaries are absent.

**Recommendation:**
- Verify these cards are intentionally hidden for admin role or if they're only for staff/student roles.
- If admin-facing, ensure they render even when empty (with a "No items" state).
- Consider whether the dashboard card set is the right information for an admin's daily overview.

---

### 3. Service Request Detail - Duplicate Approve Buttons

**Issue:** The Request Detail page has both `button-approve-create-task` (desktop) and `button-approve-create-task-mobile` (mobile) approve buttons visible simultaneously on desktop viewports.

**Recommendation:**
- Use responsive CSS to show only one button based on screen size (hide mobile button on desktop, and vice versa).
- Having two identical action buttons visible at the same time is confusing and looks like a bug.

---

### 4. Status Label Inconsistency

**Issue:** Status labels differ between list views and detail views during the request lifecycle. For example, "Pending Review" vs "Awaiting Review" for the same status, and "Approved" appearing where "Converted to Task" would be more descriptive.

**Recommendation:**
- Standardize status labels across all views (list, detail, badges).
- Create a shared status label mapping to ensure consistency.
- Use the exact same wording everywhere for the same status.

---

### 5. Task Creation Form - Potentially Overwhelming

**Issue:** The New Task form has a very large number of fields visible at once: name, description, urgency, dates, property, space, equipment, assignee, executor type, pool assignment, contact section (with three modes), instructions, requires photo, requires estimate, and checklist section.

**Recommendation:**
- Consider a stepped/wizard approach for complex tasks, or progressive disclosure where advanced fields are hidden behind an "Advanced Options" toggle.
- For quick task creation, a simplified form with just name, description, urgency, and date would be faster.
- Keep the full form available but default to a simpler view.

---

### 6. Search Behavior - No Live Search Indicator

**Issue:** Search inputs on the Requests page require pressing Enter to execute. There's no visual indicator that the user needs to press Enter, and no live-search/typeahead behavior.

**Recommendation:**
- Add a search icon or "Press Enter to search" hint text.
- Or implement debounced live search that filters as the user types (the Work page search appears to do this, but the Requests page doesn't — inconsistency).
- Make search behavior consistent across all pages.

---

### 7. Vehicle-Related Pages - Fragmented Navigation

**Issue:** Vehicle management is spread across multiple pages and sidebar entries:
- /vehicles (Vehicle Fleet list)
- /vehicles/:id (Vehicle Detail)
- /vehicle-reservations (All Reservations - admin)
- /my-reservations (My Reservations)
- /vehicle-reservation-details/:id
- /vehicle-checkout/:id
- /vehicle-checkin/:id
- /vehicle-checkin-verify/:id

That's 8 different routes for vehicles, with 2 sidebar entries.

**Recommendation:**
- Consolidate into a single "Vehicles" page with tabs: Fleet, Reservations, My Reservations.
- Check-out, check-in, and verification could be modal flows rather than separate pages.
- This simplifies navigation and reduces the number of pages a user needs to learn.

---

### 8. Emergency Contacts - Isolated Feature

**Issue:** Emergency Contacts sits as a standalone sidebar item with limited integration to the rest of the platform.

**Recommendation:**
- Consider moving this under Settings or a new "Administration" section.
- Or integrate emergency contact info into the relevant property or building detail pages where it would be most useful during an actual emergency.

---

### 9. Analytics - Tab Overload

**Issue:** The Analytics page has many tabs (Maintenance Overview, Technician Performance, Facility Insights, Asset Health, Service Request Analytics, Fleet Analytics, Alerts & Exceptions), plus sub-reports within some tabs.

**Recommendation:**
- Consider whether all tabs are actively used. If some show minimal data, they could be combined.
- A "Key Metrics" summary tab as the default landing would help admins get a quick overview without clicking through multiple tabs.
- Some tabs may overlap in the data they present (e.g., Maintenance Overview vs Work Orders report).

---

### 10. Settings Page - Limited Functionality

**Issue:** The Settings page only has profile editing and password change. For an admin managing a complex maintenance platform, there are no system-wide settings (notification preferences, default assignment rules, working hours, etc.).

**Recommendation:**
- Consider adding system configuration options for admins: notification preferences, default task settings, organization details, email templates, etc.
- Or rename to "Profile" since it's really just profile management, not platform settings.

---

## WHAT'S WORKING WELL

- **Vendor creation flow** is clean and efficient — modal-based, quick to fill, immediate feedback.
- **Inventory management** with dialog-based CRUD is well-implemented and intuitive.
- **Work page** combining tasks and projects in one view with type/status filters is a strong design decision.
- **Task detail page** has well-organized collapsible sections (Notes, Time Log, Messages, Attachments, Parts Used) — information is accessible without being overwhelming.
- **Bottom action bar** on task detail (Start, Pause, Complete, Photos, Note) provides clear, mobile-friendly quick actions.
- **Filter combinations** on the Work page work correctly and are responsive.
- **Theme toggle** (dark/light) works correctly across all pages tested.
- **Calendar navigation** (prev/next/today) works smoothly.
- **Message threading** by task/request context is well-organized.

---

## PRIORITY RECOMMENDATIONS SUMMARY

| Priority | Issue | Effort |
|----------|-------|--------|
| High | Fix duplicate approve buttons (show only one based on screen size) | Low |
| High | Standardize status labels across all views | Low |
| Medium | Merge Users + Credentials into one page | Medium |
| Medium | Merge Vehicle Fleet + Vehicle Reservations sidebar items | Medium |
| Medium | Add live search or "press Enter" hints consistently | Low |
| Medium | Simplify task creation form with progressive disclosure | Medium |
| Low | Reduce sidebar items with grouping/collapsing | Medium |
| Low | Move Emergency Contacts under Settings or Administration | Low |
| Low | Consolidate analytics tabs or add summary landing | Medium |
| Low | Rename Settings to Profile or add actual system settings | Low |
| Low | Investigate missing dashboard cards for admin role | Low |

---

## PAGES & FEATURES TESTED SUCCESSFULLY

All core functionality was tested end-to-end:
- Login/Logout
- Dashboard (admin view)
- Vendor CRUD (Create, Read, Update, Delete)
- Inventory CRUD (Create, Read, Edit, Quantity update)
- Service Request lifecycle (Create, View, Filter, Message, Approve, Convert to Task)
- Task lifecycle (Create, View, Filter, Start, Pause, Add Note, Add Part, Add Quote)
- Project creation and Work page filtering (Tasks Only, Projects Only, Combined)
- Vehicle CRUD (Create, View, Search)
- Vehicle Reservation (Create, View)
- User Management (View users, roles)
- Credentials page (View)
- Messages (View conversations, Send message)
- Notifications (Open panel, Mark all read)
- Calendar (Navigate months, Today button)
- Analytics (All tabs visited and loaded)
- Emergency Contacts (View)
- Settings/Profile (View)
- Theme Toggle (Light/Dark mode switch)
- Sidebar Navigation (All 15 items accessible)

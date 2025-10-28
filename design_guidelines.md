# College Maintenance Management Platform - Design Guidelines

## Design Approach

**Selected Framework:** Material Design System adapted for enterprise productivity
**Justification:** This utility-focused application prioritizes efficiency, data density, and role-based workflows. Material Design provides robust component patterns for dashboards, forms, tables, and task management while maintaining clarity across complex information hierarchies.

**Core Principles:**
- Clarity over decoration: Information should be immediately scannable
- Hierarchical organization: Clear visual distinction between role-based dashboards
- Efficient workflows: Minimize clicks and cognitive load for daily operations
- Responsive data display: Optimize for both desktop management and mobile field work

---

## Typography System

**Font Family:** Inter (via Google Fonts) for interface, Roboto Mono for time stamps and technical data

**Hierarchy:**
- Dashboard Headers: 2xl font-semibold (32px)
- Section Titles: xl font-semibold (24px)
- Card/Panel Headers: lg font-medium (18px)
- Body Text: base font-normal (16px)
- Secondary/Meta Text: sm font-normal (14px)
- Labels/Captions: xs font-medium (12px)
- Button Text: sm font-semibold (14px)

**Usage:**
- Use font-semibold for all interactive elements (buttons, tabs, clickable headers)
- Use font-medium for data labels and form fields
- Use font-normal for descriptive text and task notes
- Maintain consistent line-height of 1.5 for readability in dense information displays

---

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16

**Application:**
- Component padding: p-4 (cards), p-6 (panels), p-8 (main containers)
- Element spacing: gap-4 (lists), gap-6 (grids), gap-8 (major sections)
- Page margins: mx-4 (mobile), mx-8 (desktop)
- Vertical rhythm: space-y-6 for stacked elements, space-y-8 for major sections

**Grid System:**
- Dashboard layouts: 12-column grid with responsive breakpoints
- Sidebar navigation: Fixed 64px width collapsed, 240px expanded
- Main content area: max-w-7xl with responsive padding
- Card grids: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 for statistics/overview cards

---

## Component Library

### Navigation & Shell

**Top Navigation Bar:**
- Height: h-16
- Contains: Logo, role indicator badge, notification bell icon, user profile avatar
- Sticky positioning for persistent access
- Breadcrumb navigation below for context (Admin only)

**Sidebar Navigation (Admin/Staff):**
- Collapsible with icon-only collapsed state
- Active state: Subtle highlight with left border accent
- Icons from Heroicons (outline style)
- Sections: Dashboard, Tasks/Requests, Calendar, Messages, Settings (Admin: + User Management, Areas)

### Dashboard Components

**Statistics Cards:**
- Elevated card style with subtle shadow
- Layout: Icon + label + large number + trend indicator
- Size: p-6 with rounded-lg corners
- Grid: 2-4 cards per row responsive

**Task/Request Cards:**
- Compact card design with status indicator stripe on left edge
- Contains: Title, urgency badge, assigned staff avatar, due date, category icon
- Actions: Quick view button, status dropdown
- Hover state: Slight elevation increase

**Data Tables:**
- Striped rows for readability (alternate subtle shading)
- Fixed header on scroll
- Columns: Checkbox, ID, Title, Category, Status, Priority, Assigned To, Date, Actions
- Row height: h-12 for comfortable touch targets
- Sortable headers with arrow indicators
- Pagination controls at bottom

**Calendar View:**
- Week/Month toggle
- Time slots: 8:00 AM - 4:30 PM highlighted
- Task blocks: Rounded rectangles with urgency-based visual weight
- Drag-and-drop enabled zones
- Today indicator: Vertical highlight line

### Forms & Inputs

**Form Layout:**
- Two-column grid on desktop, single column on mobile
- Label above input pattern with required asterisk
- Field spacing: space-y-4
- Input height: h-12 for text inputs
- Textarea: min-h-32 with resize capability

**Input Components:**
- Text inputs: Outlined style with focus ring
- Dropdowns: Custom styled select with chevron icon
- Date pickers: Calendar overlay with quick select shortcuts
- File upload: Drag-and-drop zone with preview thumbnails
- Urgency selector: Segmented button group (Low/Medium/High)

**Buttons:**
- Primary: font-semibold with px-6 py-3
- Secondary: Outlined variant
- Icon buttons: Square 40px for compact actions
- Button groups: Joined borders for related actions

### Messaging Portal

**Message Thread List:**
- Similar to email client layout
- Left panel: Conversation list with unread indicators
- Right panel: Full message thread
- Message bubbles: Rounded-lg with sender avatar
- Timestamp: Small text below each message
- Attachment previews: Thumbnail grid below message text

### Task Detail Modal/Panel

**Slide-out Panel (Right side):**
- Width: w-96 (md), full-width (mobile)
- Sections: Task header, Description, Photos grid, Parts log table, Time tracking, Status controls
- Time tracking: Start/Stop button with running timer display
- Photo grid: 2-column masonry with lightbox click
- Parts log: Simple table with Add Part button
- Status dropdown: In Progress, On Hold (+ reason textarea), Completed

### Area & Subdivision Management (Admin)

**Hierarchical Tree View:**
- Collapsible nested structure
- Indent: pl-6 per level
- Add/Edit/Delete icons on hover
- Drag handles for reordering
- Badge showing request count per area

**Subdivision Form:**
- Fields: Name, Parent area dropdown, GPS coordinates (optional)
- Map integration: Embedded interactive map for housing locations
- Preview: Show location marker on map as coordinates are entered

---

## Responsive Behavior

**Mobile Optimizations:**
- Bottom navigation bar replacing sidebar (fixed position)
- Cards: Full-width stacking
- Tables: Horizontal scroll or card-based transformation
- Fab button for primary actions (+ New Request)
- Slide-up modals instead of side panels
- Condensed header with hamburger menu

**Breakpoints:**
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

---

## Imagery & Icons

**Icons:** Heroicons (outline style) via CDN for all UI icons
- Maintenance categories: Wrench, bolt, droplet, fire, wind, cog icons
- Status indicators: Clock, check-circle, x-circle, pause-circle
- Priority: Arrow-up (high), minus (medium), arrow-down (low)
- Navigation: Home, calendar, chat-bubble, cog, users

**Images:**
No hero section required - this is a dashboard application. Images appear as:
- User avatars: Circular, 40px standard size
- Uploaded task photos: Thumbnail grid with lightbox expansion
- Area/housing photos: Optional 16:9 aspect ratio cards in area management

---

## Accessibility Standards

- Consistent 4.5:1 text contrast ratios
- All interactive elements: Minimum 44px touch target
- Form labels: Properly associated with inputs
- Status information: Icon + text (never icon alone)
- Keyboard navigation: Full tab order with focus visible states
- ARIA labels: For icon-only buttons and status badges
- Screen reader announcements: For dynamic updates (new messages, task status changes)

---

## Animation Guidelines

**Minimal & Purposeful:**
- Page transitions: None (instant for productivity)
- Modal/panel entry: Slide-in 200ms ease-out
- Dropdown menus: Fade + slide 150ms
- Loading states: Skeleton screens (no spinners)
- Status changes: Brief highlight flash 300ms
- Hover states: Instant (no delay or animation)

**No Animations:**
- No parallax effects
- No decorative scroll animations
- No complex micro-interactions
- Focus on immediate, responsive feedback
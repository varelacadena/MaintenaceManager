/**
 * Browser-based E2E tests for lockbox checkout/checkin flows.
 * These tests are designed to be run via the runTest() Playwright testing agent.
 * 
 * Test Plan 1: Technician edits reservation to assign Key Box lockbox
 * =================================================================
 * 1. [New Context] Create a new browser context
 * 2. [Browser] Navigate to /login
 * 3. [Browser] Enter "maintenance" in username (data-testid="input-username"), 
 *    "123456" in password (data-testid="input-password"), click login (data-testid="button-login")
 * 4. [Verify] Login succeeds
 * 5. [Browser] Navigate to /vehicles?tab=reservations
 * 6. [Verify] Page shows "Vehicle Management" title (data-testid="text-page-title")
 * 7. [Browser] Click status filter (data-testid="select-status-filter"), select "All Statuses"
 * 8. [Browser] Find reservation with Edit button (data-testid="button-edit-{id}"), click it
 * 9. [Verify] Edit dialog opens with key pickup dropdown (data-testid="select-edit-key-pickup")
 * 10. [Browser] Select "Key Box" from key pickup dropdown
 * 11. [Verify] Lockbox picker appears (data-testid="select-edit-lockbox")
 * 12. [Browser] Select first lockbox from picker
 * 13. [Browser] Click "Save Changes"
 * 14. [Verify] Success toast appears
 * 
 * Test Plan 2: Student views reservation with Key Box label
 * =========================================================
 * 1. [New Context] Create a new browser context
 * 2. [Browser] Navigate to /login
 * 3. [Browser] Enter "Sebastian" in username, "123456" in password, click login
 * 4. [Verify] Login succeeds
 * 5. [Browser] Navigate to /my-reservations
 * 6. [Verify] Page loads with reservation cards
 * 7. [Browser] Click "View Details" on a reservation
 * 8. [Verify] Details page loads. If key pickup shows, verify label is 
 *    "Key Box Pickup" not raw "key_box"
 * 9. [Verify] No data-testid="lockbox-info" exists on page
 * 
 * Test Plan 3: QR Code path - Vehicle detail to checkout
 * ======================================================
 * 1. [New Context] Create a new browser context
 * 2. [Browser] Navigate to /login
 * 3. [Browser] Enter "admin" in username, "123456" in password, click login
 * 4. [Verify] Login succeeds
 * 5. [Browser] Navigate to /vehicles
 * 6. [Browser] Click on a vehicle card to open its detail page
 * 7. [Verify] Vehicle detail page loads
 * 8. [Verify] No data-testid="lockbox-info" exists (lockbox removed from vehicle level)
 * 9. [Verify] QR code is visible on the page (the vehicle QR code for scanning)
 * 10. [Browser] If there is a checkout button for an active reservation, note its presence
 * 11. [Verify] The checkout flow would use reservation.lockboxId (verified via API tests)
 * 
 * Relevant Technical Documentation:
 * - Login: POST /api/login {username, password}
 * - Credentials: admin/123456, maintenance(tech)/123456, Sebastian(student)/123456, Norberto(staff)/norberto123
 * - Reservations: /vehicles?tab=reservations (admin/tech), /my-reservations (all)
 * - Vehicle detail: /vehicles/{id} (shows QR code)
 * - Edit dialog: data-testid="select-edit-key-pickup", data-testid="select-edit-lockbox"
 * - Checkout: /vehicle-checkout/{reservationId} - uses reservation.lockboxId for code assignment
 * - Checkin: /vehicle-checkin/{checkOutLogId} - uses reservation.lockboxId for key return step
 * - Key pickup labels: key_box -> "Key Box Pickup"
 * - Removed from vehicle: data-testid="lockbox-info"
 */

export const testPlans = {
  techReservationEdit: {
    description: "Technician edits reservation to set Key Box lockbox method",
    credentials: { username: "maintenance", password: "123456", role: "technician" },
    path: "/vehicles?tab=reservations",
    assertions: [
      "Edit dialog shows Key Box option in key pickup dropdown",
      "Selecting Key Box reveals lockbox picker",
      "Save persists lockboxId on reservation",
    ],
  },
  studentReservationView: {
    description: "Student views reservation details with Key Box label",
    credentials: { username: "Sebastian", password: "123456", role: "student" },
    path: "/my-reservations",
    assertions: [
      "Key pickup method displays as 'Key Box Pickup' not raw 'key_box'",
      "No lockbox-info element exists",
    ],
  },
  qrCodeVehicleDetail: {
    description: "Admin navigates via vehicle QR to detail, no lockbox on vehicle",
    credentials: { username: "admin", password: "123456", role: "admin" },
    path: "/vehicles",
    assertions: [
      "Vehicle detail page has no lockbox-info element",
      "QR code is visible for vehicle scanning",
      "Checkout flow uses reservation.lockboxId (verified via API)",
    ],
  },
  staffCannotModifyLockbox: {
    description: "Staff role cannot modify lockbox/handoff fields on reservations",
    credentials: { username: "Norberto", password: "norberto123", role: "staff" },
    path: "/my-reservations",
    assertions: [
      "Staff PATCH to reservation does not change lockboxId",
      "Staff PATCH to reservation does not change keyPickupMethod",
    ],
  },
};

import { lazy } from "react";
import { Route, Switch } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import RoleGuard from "@/components/RoleGuard";
import DomainErrorBoundary from "@/components/DomainErrorBoundary";
import { exitTo } from "@/lib/navigation";
import { useEffect } from "react";
import { useLocation } from "wouter";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Work = lazy(() => import("@/pages/Work"));
const GrabAJob = lazy(() => import("@/pages/GrabAJob"));
const NewTask = lazy(() => import("@/pages/NewTask"));
const EditTask = lazy(() => import("@/pages/EditTask"));
const TaskDetail = lazy(() => import("@/pages/TaskDetail"));
const MobileTaskDetail = lazy(() => import("@/components/MobileTaskDetail"));
const AdminTaskDetailPage = lazy(() => import("@/pages/AdminTaskDetailPage"));
const Requests = lazy(() => import("@/pages/Requests"));
const RequestDetail = lazy(() => import("@/pages/RequestDetail"));
const NewRequest = lazy(() => import("@/pages/NewRequest"));
const Settings = lazy(() => import("@/pages/Settings"));
const Calendar = lazy(() => import("@/pages/Calendar"));
const PropertyMapPage = lazy(() => import("@/pages/PropertyMapPage"));
const PropertyDetail = lazy(() => import("@/pages/PropertyDetail"));
const EquipmentWorkHistory = lazy(() => import("@/pages/EquipmentWorkHistory"));
const Users = lazy(() => import("@/pages/Users"));
const Vendors = lazy(() => import("@/pages/Vendors"));
const Inventory = lazy(() => import("@/pages/Inventory"));
const MobileEquipmentPage = lazy(() => import("@/pages/MobileEquipment"));
const MobileEquipmentDetail = lazy(() => import("@/pages/MobileEquipment/MobileEquipmentDetail"));
const Vehicles = lazy(() => import("@/pages/Vehicles"));
const VehicleDetail = lazy(() => import("@/pages/VehicleDetail"));
const VehicleQRRedirect = lazy(() => import("@/pages/VehicleQRRedirect"));
const VehicleEdit = lazy(() => import("@/pages/VehicleEdit"));
const MyReservations = lazy(() => import("@/pages/MyReservations"));
const VehicleReservationDetails = lazy(() => import("@/pages/VehicleReservationDetails"));
const VehicleCheckOut = lazy(() => import("@/pages/VehicleCheckOut"));
const VehicleCheckIn = lazy(() => import("@/pages/VehicleCheckIn"));
const VehicleCheckInVerification = lazy(() => import("@/pages/VehicleCheckInVerification"));
const AnalyticsDashboard = lazy(() => import("@/pages/analytics/AnalyticsDashboard"));
const ProjectDetail = lazy(() => import("@/pages/ProjectDetail"));
const EmailManagement = lazy(() => import("@/pages/EmailManagement"));
const ResourceLibrary = lazy(() => import("@/pages/ResourceLibrary"));
const NotFound = lazy(() => import("@/pages/not-found"));

function RedirectTo({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    exitTo(setLocation, to);
  }, [setLocation, to]);
  return null;
}

function VehicleReservationsTabRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    exitTo(setLocation, "/vehicles?tab=reservations");
  }, [setLocation]);
  return null;
}

function TaskDetailResponsive() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const hasFullView = typeof window !== "undefined" && window.location.search.includes("view=full");
  if (user?.role === "admin") return <AdminTaskDetailPage />;
  if (isMobile && !hasFullView && user?.role !== "technician") return <MobileTaskDetail />;
  return <TaskDetail />;
}

function HomeRoute() {
  const { user } = useAuth();
  return (
    <DomainErrorBoundary domain="Work Orders & Tasks">
      {user?.role === "student" || user?.role === "technician" ? (
        <RedirectTo to="/work" />
      ) : (
        <Dashboard />
      )}
    </DomainErrorBoundary>
  );
}

function WorkRoute() {
  return (
    <DomainErrorBoundary domain="Work Orders & Tasks">
      <Work />
    </DomainErrorBoundary>
  );
}

function GrabRoute() {
  return (
    <DomainErrorBoundary domain="Work Orders & Tasks">
      <RoleGuard allowedRoles={["student", "technician"]}>
        <GrabAJob />
      </RoleGuard>
    </DomainErrorBoundary>
  );
}

function TasksRedirectRoute() {
  return (
    <DomainErrorBoundary domain="Work Orders & Tasks">
      <RedirectTo to="/work" />
    </DomainErrorBoundary>
  );
}

function NewTaskRoute() {
  return (
    <DomainErrorBoundary domain="Work Orders & Tasks">
      <RoleGuard allowedRoles={["admin"]}>
        <NewTask />
      </RoleGuard>
    </DomainErrorBoundary>
  );
}

function EditTaskRoute() {
  return (
    <DomainErrorBoundary domain="Work Orders & Tasks">
      <RoleGuard allowedRoles={["admin"]}>
        <EditTask />
      </RoleGuard>
    </DomainErrorBoundary>
  );
}

function TaskDetailRoute() {
  return (
    <DomainErrorBoundary domain="Work Orders & Tasks">
      <TaskDetailResponsive />
    </DomainErrorBoundary>
  );
}

function RequestsRoute() {
  return (
    <DomainErrorBoundary domain="Service Requests">
      <RoleGuard allowedRoles={["admin", "staff", "technician", "student"]}>
        <Requests />
      </RoleGuard>
    </DomainErrorBoundary>
  );
}

function RequestDetailRoute() {
  return (
    <DomainErrorBoundary domain="Service Requests">
      <RoleGuard allowedRoles={["admin", "staff", "technician", "student"]}>
        <RequestDetail />
      </RoleGuard>
    </DomainErrorBoundary>
  );
}

function NewRequestRoute() {
  return (
    <DomainErrorBoundary domain="Service Requests">
      <RoleGuard allowedRoles={["admin", "staff", "technician", "student"]}>
        <NewRequest />
      </RoleGuard>
    </DomainErrorBoundary>
  );
}

function SettingsRoute() {
  return (
    <DomainErrorBoundary domain="Settings">
      <Settings />
    </DomainErrorBoundary>
  );
}

function CalendarRoute() {
  return (
    <DomainErrorBoundary domain="Calendar">
      <RoleGuard allowedRoles={["admin", "technician"]}>
        <Calendar />
      </RoleGuard>
    </DomainErrorBoundary>
  );
}

function PropertiesRoute() {
  return (
    <DomainErrorBoundary domain="Facilities & Properties">
      <RoleGuard allowedRoles={["admin", "technician"]}>
        <PropertyMapPage />
      </RoleGuard>
    </DomainErrorBoundary>
  );
}

function PropertyDetailRoute() {
  return (
    <DomainErrorBoundary domain="Facilities & Properties">
      <RoleGuard allowedRoles={["admin", "technician"]}>
        <PropertyDetail />
      </RoleGuard>
    </DomainErrorBoundary>
  );
}

function EquipmentWorkHistoryRoute() {
  return (
    <DomainErrorBoundary domain="Facilities & Properties">
      <RoleGuard allowedRoles={["admin", "technician"]}>
        <EquipmentWorkHistory />
      </RoleGuard>
    </DomainErrorBoundary>
  );
}

function UsersRoute() {
  return (
    <DomainErrorBoundary domain="Users & Vendors">
      <RoleGuard allowedRoles={["admin"]}>
        <Users />
      </RoleGuard>
    </DomainErrorBoundary>
  );
}

function CredentialsRedirectRoute() {
  return (
    <DomainErrorBoundary domain="Users & Vendors">
      <RedirectTo to="/users" />
    </DomainErrorBoundary>
  );
}

function VendorsRoute() {
  return (
    <DomainErrorBoundary domain="Users & Vendors">
      <RoleGuard allowedRoles={["admin"]}>
        <Vendors />
      </RoleGuard>
    </DomainErrorBoundary>
  );
}

function InventoryRoute() {
  return (
    <DomainErrorBoundary domain="Inventory">
      <RoleGuard allowedRoles={["admin"]}>
        <Inventory />
      </RoleGuard>
    </DomainErrorBoundary>
  );
}

function MobileEquipmentListRoute() {
  return (
    <DomainErrorBoundary domain="Tools & Equipment">
      <RoleGuard allowedRoles={["admin", "technician"]}>
        <MobileEquipmentPage />
      </RoleGuard>
    </DomainErrorBoundary>
  );
}

function MobileEquipmentDetailRoute() {
  return (
    <DomainErrorBoundary domain="Tools & Equipment">
      <RoleGuard allowedRoles={["admin", "technician"]}>
        <MobileEquipmentDetail />
      </RoleGuard>
    </DomainErrorBoundary>
  );
}

function VehiclesRoute() {
  return (
    <DomainErrorBoundary domain="Vehicle Fleet">
      <RoleGuard allowedRoles={["admin"]}>
        <Vehicles />
      </RoleGuard>
    </DomainErrorBoundary>
  );
}

function VehicleDetailRoute() {
  const { user } = useAuth();
  return (
    <DomainErrorBoundary domain="Vehicle Fleet">
      {user?.role === "admin" ? <VehicleDetail /> : <VehicleQRRedirect />}
    </DomainErrorBoundary>
  );
}

function VehicleEditRoute() {
  return (
    <DomainErrorBoundary domain="Vehicle Fleet">
      <RoleGuard allowedRoles={["admin"]}>
        <VehicleEdit />
      </RoleGuard>
    </DomainErrorBoundary>
  );
}

function MyReservationsRoute() {
  return (
    <DomainErrorBoundary domain="Vehicle Fleet">
      <RoleGuard allowedRoles={["admin", "technician"]}>
        <MyReservations />
      </RoleGuard>
    </DomainErrorBoundary>
  );
}

function VehicleReservationsRedirectRoute() {
  return (
    <DomainErrorBoundary domain="Vehicle Fleet">
      <RoleGuard allowedRoles={["admin"]}>
        <VehicleReservationsTabRedirect />
      </RoleGuard>
    </DomainErrorBoundary>
  );
}

function VehicleReservationDetailsRoute() {
  return (
    <DomainErrorBoundary domain="Vehicle Fleet">
      <RoleGuard allowedRoles={["admin", "technician"]}>
        <VehicleReservationDetails />
      </RoleGuard>
    </DomainErrorBoundary>
  );
}

function VehicleCheckOutRoute() {
  return (
    <DomainErrorBoundary domain="Vehicle Fleet">
      <RoleGuard allowedRoles={["admin", "technician"]}>
        <VehicleCheckOut />
      </RoleGuard>
    </DomainErrorBoundary>
  );
}

function VehicleCheckInRoute() {
  return (
    <DomainErrorBoundary domain="Vehicle Fleet">
      <RoleGuard allowedRoles={["admin", "technician"]}>
        <VehicleCheckIn />
      </RoleGuard>
    </DomainErrorBoundary>
  );
}

function VehicleCheckInVerifyRoute() {
  return (
    <DomainErrorBoundary domain="Vehicle Fleet">
      <RoleGuard allowedRoles={["admin", "technician"]}>
        <VehicleCheckInVerification />
      </RoleGuard>
    </DomainErrorBoundary>
  );
}

function AnalyticsRoute() {
  return (
    <DomainErrorBoundary domain="Analytics">
      <RoleGuard allowedRoles={["admin"]}>
        <AnalyticsDashboard />
      </RoleGuard>
    </DomainErrorBoundary>
  );
}

function LoginRedirectRoute() {
  return (
    <DomainErrorBoundary domain="General">
      <RedirectTo to="/" />
    </DomainErrorBoundary>
  );
}

function EmergencyContactsRedirectRoute() {
  return (
    <DomainErrorBoundary domain="Settings">
      <RedirectTo to="/settings?tab=emergency" />
    </DomainErrorBoundary>
  );
}

function ProjectsRedirectRoute() {
  return (
    <DomainErrorBoundary domain="Projects">
      <RedirectTo to="/work?tab=projects" />
    </DomainErrorBoundary>
  );
}

function ProjectDetailRoute() {
  return (
    <DomainErrorBoundary domain="Projects">
      <RoleGuard allowedRoles={["admin"]}>
        <ProjectDetail />
      </RoleGuard>
    </DomainErrorBoundary>
  );
}

function EmailManagementRoute() {
  return (
    <DomainErrorBoundary domain="Admin Tools">
      <RoleGuard allowedRoles={["admin"]}>
        <EmailManagement />
      </RoleGuard>
    </DomainErrorBoundary>
  );
}

function ResourceLibraryRoute() {
  return (
    <DomainErrorBoundary domain="Admin Tools">
      <RoleGuard allowedRoles={["admin"]}>
        <ResourceLibrary />
      </RoleGuard>
    </DomainErrorBoundary>
  );
}

function NotFoundRoute() {
  return (
    <DomainErrorBoundary domain="General">
      <NotFound />
    </DomainErrorBoundary>
  );
}

export function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={HomeRoute} />
      <Route path="/work" component={WorkRoute} />
      <Route path="/grab" component={GrabRoute} />
      <Route path="/tasks" component={TasksRedirectRoute} />
      <Route path="/tasks/new" component={NewTaskRoute} />
      <Route path="/tasks/:id/edit" component={EditTaskRoute} />
      <Route path="/tasks/:id" component={TaskDetailRoute} />
      <Route path="/requests" component={RequestsRoute} />
      <Route path="/requests/:id" component={RequestDetailRoute} />
      <Route path="/new-request" component={NewRequestRoute} />
      <Route path="/settings" component={SettingsRoute} />
      <Route path="/calendar" component={CalendarRoute} />
      <Route path="/properties" component={PropertiesRoute} />
      <Route path="/properties/:id" component={PropertyDetailRoute} />
      <Route path="/equipment/:id/work-history" component={EquipmentWorkHistoryRoute} />
      <Route path="/users" component={UsersRoute} />
      <Route path="/credentials" component={CredentialsRedirectRoute} />
      <Route path="/vendors" component={VendorsRoute} />
      <Route path="/inventory" component={InventoryRoute} />
      <Route path="/tools-equipment" component={MobileEquipmentListRoute} />
      <Route path="/tools-equipment/:id" component={MobileEquipmentDetailRoute} />
      <Route path="/vehicles" component={VehiclesRoute} />
      <Route path="/vehicles/:id" component={VehicleDetailRoute} />
      <Route path="/vehicles/:id/edit" component={VehicleEditRoute} />
      <Route path="/my-reservations" component={MyReservationsRoute} />
      <Route path="/vehicle-reservations" component={VehicleReservationsRedirectRoute} />
      <Route path="/vehicle-reservation-details/:reservationId" component={VehicleReservationDetailsRoute} />
      <Route path="/vehicle-checkout/:reservationId" component={VehicleCheckOutRoute} />
      <Route path="/vehicle-checkin/:checkOutLogId" component={VehicleCheckInRoute} />
      <Route path="/vehicle-checkin-verify/:checkInLogId" component={VehicleCheckInVerifyRoute} />
      <Route path="/analytics" component={AnalyticsRoute} />
      <Route path="/login" component={LoginRedirectRoute} />
      <Route path="/emergency-contacts" component={EmergencyContactsRedirectRoute} />
      <Route path="/projects" component={ProjectsRedirectRoute} />
      <Route path="/projects/:id" component={ProjectDetailRoute} />
      <Route path="/email-management" component={EmailManagementRoute} />
      <Route path="/resources" component={ResourceLibraryRoute} />
      <Route component={NotFoundRoute} />
    </Switch>
  );
}

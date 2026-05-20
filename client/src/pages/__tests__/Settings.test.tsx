import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Settings from "../Settings";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationCounts } from "@/hooks/useNotificationCounts";

const wouterState = vi.hoisted(() => ({
  navigate: vi.fn(),
  search: "",
}));

vi.mock("@/hooks/useAuth");
vi.mock("@/hooks/useNotificationCounts");
vi.mock("wouter", () => ({
  useLocation: () => ["/settings", wouterState.navigate],
  useSearch: () => wouterState.search,
}));
vi.mock("../EmergencyContacts", () => ({
  default: () => <div data-testid="mock-emergency-contacts">Emergency Contacts Editor</div>,
}));

const adminUser = {
  id: "admin-1",
  username: "admin",
  firstName: "Admin",
  lastName: "User",
  email: "admin@example.com",
  phoneNumber: "555-0100",
  role: "admin",
  password: "",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const staffUser = {
  ...adminUser,
  id: "staff-1",
  username: "staff",
  role: "staff",
};

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        queryFn: async ({ queryKey }) => {
          const res = await fetch(queryKey.join("/"));
          if (!res.ok) throw new Error("Request failed");
          return res.json();
        },
      },
      mutations: { retry: false },
    },
  });
}

function renderSettings() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <Settings />
    </QueryClientProvider>,
  );
}

describe("Settings", () => {
  beforeEach(() => {
    wouterState.navigate.mockReset();
    wouterState.search = "";

    vi.mocked(useNotificationCounts).mockReturnValue({
      pendingServiceRequests: 0,
      pendingVehicleReservations: 0,
      unreadMessages: 0,
      approvedReservations: 0,
      pendingSignups: 2,
    });

    global.fetch = vi.fn((url) => {
      const u = String(url);
      if (u.includes("/api/users/")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(adminUser) });
      }
      if (u.includes("/api/emergency-contacts/active")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: "contact-1", name: "Campus Security" }),
        });
      }
      if (u.includes("/api/notification-settings")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ id: "n1" }, { id: "n2" }]),
        });
      }
      if (u.includes("/api/inventory/summary")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ total: 25, lowStockCount: 3, categoryCounts: { all: 25 } }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(null) });
    }) as any;
  });

  it("shows only account settings for non-admin users", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: staffUser as any,
      isLoading: false,
      isAuthenticated: true,
    });

    renderSettings();

    expect(screen.getByTestId("tab-account")).toBeInTheDocument();
    expect(screen.queryByTestId("tab-system")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tab-emergency")).not.toBeInTheDocument();
  });

  it("renders admin settings hub with built and planned settings", async () => {
    wouterState.search = "tab=system";
    vi.mocked(useAuth).mockReturnValue({
      user: adminUser as any,
      isLoading: false,
      isAuthenticated: true,
    });

    renderSettings();

    expect(screen.getByText("System Settings Hub")).toBeInTheDocument();
    expect(screen.getByText("Email & Notifications")).toBeInTheDocument();
    expect(screen.getByText("Users, Roles & Access")).toBeInTheDocument();
    expect(screen.getByText("Emergency Contacts")).toBeInTheDocument();
    expect(screen.queryByText("Resource Library")).not.toBeInTheDocument();
    expect(screen.getByTestId("button-planned-organization-settings")).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByTestId("status-button-open-user-settings")).toHaveTextContent("2 pending signups");
      expect(screen.getByTestId("status-button-open-email-settings")).toHaveTextContent("2 notification rules configured");
      expect(screen.getByTestId("status-button-open-emergency-settings")).toHaveTextContent("Active: Campus Security");
      expect(screen.getByTestId("status-button-open-inventory-settings")).toHaveTextContent("3 low-stock items");
    });
  });

  it("navigates to existing settings surfaces from built cards", () => {
    wouterState.search = "tab=system";
    vi.mocked(useAuth).mockReturnValue({
      user: adminUser as any,
      isLoading: false,
      isAuthenticated: true,
    });

    renderSettings();

    fireEvent.click(screen.getByTestId("button-open-user-settings"));

    expect(wouterState.navigate).toHaveBeenCalledWith("/users");
  });
});

import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Requests from "../Requests";
import { useAuth } from "@/hooks/useAuth";

vi.mock("@/hooks/useAuth");
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));
vi.mock("wouter", () => ({
  useLocation: () => ["/requests", vi.fn()],
}));

const mockRequests = [
  {
    id: "req-1",
    title: "Leaking Faucet",
    description: "The faucet in room 101 is leaking badly",
    status: "pending",
    urgency: "high",
    requesterId: "user-1",
    propertyId: "prop-1",
    spaceId: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: "req-2",
    title: "Broken Light",
    description: "Light fixture needs replacement",
    status: "under_review",
    urgency: "medium",
    requesterId: "user-2",
    propertyId: "prop-2",
    spaceId: null,
    createdAt: new Date().toISOString(),
  },
];

const mockUsers = [
  { id: "user-1", username: "testuser", firstName: "Test", lastName: "User", role: "staff" },
  { id: "user-2", username: "admin", firstName: "Admin", lastName: "User", role: "admin" },
];

const mockProperties = [
  { id: "prop-1", name: "Building A" },
  { id: "prop-2", name: "Building B" },
];

describe("Requests Component", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1", username: "testuser", role: "staff" },
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });

    global.fetch = vi.fn((url) => {
      const u = String(url);
      if (u.includes("/api/service-requests")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRequests),
        });
      }
      if (u.includes("/api/users")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUsers),
        });
      }
      if (u.includes("/api/properties")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockProperties),
        });
      }
      return Promise.reject(new Error(`Unknown endpoint: ${u}`));
    }) as any;
  });

  it("renders submitter view title", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Requests />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("My Service Requests")).toBeInTheDocument();
    });
  });

  it("displays search input and filters", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Requests />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("input-search")).toBeInTheDocument();
      expect(screen.getByTestId("select-status-filter")).toBeInTheDocument();
      expect(screen.getByTestId("select-urgency-filter")).toBeInTheDocument();
    });
  });

  it("loads and displays requests", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Requests />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Leaking Faucet")).toBeInTheDocument();
      expect(screen.getByText("Broken Light")).toBeInTheDocument();
    });
  });

  it("filters requests by search query on title", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Requests />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Leaking Faucet")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId("input-search"), { target: { value: "Leaking" } });

    await waitFor(() => {
      expect(screen.getByText("Leaking Faucet")).toBeInTheDocument();
      expect(screen.queryByText("Broken Light")).not.toBeInTheDocument();
    });
  });
});

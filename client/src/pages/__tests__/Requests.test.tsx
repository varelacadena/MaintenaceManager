
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Requests from '../Requests';
import { useAuth } from '@/hooks/useAuth';

// Mock dependencies
vi.mock('@/hooks/useAuth');
vi.mock('wouter', () => ({
  useLocation: () => ['/requests', vi.fn()],
}));

vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
  queryClient: new QueryClient(),
}));

const mockRequests = [
  {
    id: 'req-1',
    title: 'Leaking Faucet',
    description: 'The faucet in room 101 is leaking badly',
    status: 'submitted',
    urgency: 'high',
    requesterId: 'user-1',
    areaId: 'area-1',
    subdivisionId: 'sub-1',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'req-2',
    title: 'Broken Light',
    description: 'Light fixture needs replacement',
    status: 'under_review',
    urgency: 'medium',
    requesterId: 'user-2',
    areaId: 'area-2',
    subdivisionId: null,
    createdAt: new Date().toISOString(),
  },
];

const mockUsers = [
  { id: 'user-1', username: 'testuser', firstName: 'Test', lastName: 'User', role: 'staff' },
  { id: 'user-2', username: 'admin', firstName: 'Admin', lastName: 'User', role: 'admin' },
];

const mockAreas = [
  { id: 'area-1', name: 'Building A' },
  { id: 'area-2', name: 'Building B' },
];

const mockSubdivisions = [
  { id: 'sub-1', name: 'Room 101', areaId: 'area-1' },
];

describe('Requests Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1', username: 'testuser', role: 'staff' },
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });

    // Mock fetch for queries
    global.fetch = vi.fn((url) => {
      if (url.includes('/api/service-requests')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRequests),
        });
      }
      if (url.includes('/api/users')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUsers),
        });
      }
      if (url.includes('/api/areas')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAreas),
        });
      }
      if (url.includes('/api/subdivisions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSubdivisions),
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    }) as any;
  });

  it('renders without crashing', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Requests />
      </QueryClientProvider>
    );

    expect(screen.getByText('Service Requests')).toBeInTheDocument();
  });

  it('displays search input and filters', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Requests />
      </QueryClientProvider>
    );

    expect(screen.getByTestId('input-search')).toBeInTheDocument();
    expect(screen.getByTestId('select-status-filter')).toBeInTheDocument();
    expect(screen.getByTestId('select-urgency-filter')).toBeInTheDocument();
  });

  it('loads and displays requests', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Requests />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Leaking Faucet')).toBeInTheDocument();
      expect(screen.getByText('Broken Light')).toBeInTheDocument();
    });
  });

  it('filters requests by search query on title', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Requests />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Leaking Faucet')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('input-search');
    fireEvent.change(searchInput, { target: { value: 'Leaking' } });

    expect(screen.getByText('Leaking Faucet')).toBeInTheDocument();
    expect(screen.queryByText('Broken Light')).not.toBeInTheDocument();
  });

  it('filters requests by requester name', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Requests />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('input-search');
    fireEvent.change(searchInput, { target: { value: 'Admin' } });

    expect(screen.queryByText('Leaking Faucet')).not.toBeInTheDocument();
    expect(screen.getByText('Broken Light')).toBeInTheDocument();
  });

  it('filters requests by area name', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Requests />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Leaking Faucet')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('input-search');
    fireEvent.change(searchInput, { target: { value: 'Building A' } });

    expect(screen.getByText('Leaking Faucet')).toBeInTheDocument();
    expect(screen.queryByText('Broken Light')).not.toBeInTheDocument();
  });

  it('filters requests by status', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Requests />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Leaking Faucet')).toBeInTheDocument();
    });

    const statusFilter = screen.getByTestId('select-status-filter');
    fireEvent.click(statusFilter);
    
    // Wait for dropdown to open and click the submitted option
    await waitFor(() => {
      const submittedOption = screen.getByText('Submitted');
      fireEvent.click(submittedOption);
    });

    expect(screen.getByText('Leaking Faucet')).toBeInTheDocument();
    expect(screen.queryByText('Broken Light')).not.toBeInTheDocument();
  });

  it('filters requests by urgency', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Requests />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Leaking Faucet')).toBeInTheDocument();
    });

    const urgencyFilter = screen.getByTestId('select-urgency-filter');
    fireEvent.click(urgencyFilter);
    
    // Wait for dropdown to open and click the high option
    await waitFor(() => {
      const highOption = screen.getByText('High');
      fireEvent.click(highOption);
    });

    expect(screen.getByText('Leaking Faucet')).toBeInTheDocument();
    expect(screen.queryByText('Broken Light')).not.toBeInTheDocument();
  });

  it('displays request cards with correct information', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Requests />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Leaking Faucet')).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('Building A')).toBeInTheDocument();
      expect(screen.getByText('Room 101')).toBeInTheDocument();
    });
  });

  it('shows New Request button', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Requests />
      </QueryClientProvider>
    );

    expect(screen.getByTestId('button-new-request')).toBeInTheDocument();
  });

  it('handles empty state', async () => {
    global.fetch = vi.fn((url) => {
      if (url.includes('/api/service-requests')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/users')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUsers),
        });
      }
      if (url.includes('/api/areas')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAreas),
        });
      }
      if (url.includes('/api/subdivisions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSubdivisions),
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    }) as any;

    render(
      <QueryClientProvider client={queryClient}>
        <Requests />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No requests found')).toBeInTheDocument();
    });
  });
});

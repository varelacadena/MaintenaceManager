
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Messages from '../Messages';
import { useAuth } from '@/hooks/useAuth';

// Mock dependencies
vi.mock('@/hooks/useAuth');
vi.mock('wouter', () => ({
  useLocation: () => ['/messages', vi.fn()],
}));

vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
  queryClient: new QueryClient(),
}));

const mockRequests = [
  {
    id: 'req-1',
    title: 'Leaking Faucet',
    category: 'Plumbing',
    status: 'submitted',
    urgency: 'high',
    requesterId: 'user-1',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'req-2',
    title: 'Broken Light',
    category: 'Electrical',
    status: 'under_review',
    urgency: 'medium',
    requesterId: 'user-2',
    createdAt: new Date().toISOString(),
  },
];

const mockMessages = [
  {
    id: 'msg-1',
    requestId: 'req-1',
    senderId: 'user-1',
    content: 'The faucet is leaking badly',
    read: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'msg-2',
    requestId: 'req-1',
    senderId: 'admin-1',
    content: 'We will send someone today',
    read: false,
    createdAt: new Date().toISOString(),
  },
];

describe('Messages Component', () => {
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
      if (url.includes('/api/messages/request')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMessages),
        });
      }
      if (url.includes('/api/users')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { id: 'user-1', username: 'testuser', firstName: 'Test', lastName: 'User', role: 'staff' },
            { id: 'admin-1', username: 'admin', firstName: 'Admin', lastName: 'User', role: 'admin' },
          ]),
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    }) as any;
  });

  it('renders without crashing', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Messages />
      </QueryClientProvider>
    );

    expect(screen.getByText('Messages')).toBeInTheDocument();
  });

  it('displays search input', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Messages />
      </QueryClientProvider>
    );

    expect(screen.getByTestId('input-search-messages')).toBeInTheDocument();
  });

  it('loads and displays requests', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Messages />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Leaking Faucet')).toBeInTheDocument();
      expect(screen.getByText('Broken Light')).toBeInTheDocument();
    });
  });

  it('filters requests based on search query', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Messages />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Leaking Faucet')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('input-search-messages');
    fireEvent.change(searchInput, { target: { value: 'Leaking' } });

    expect(screen.getByText('Leaking Faucet')).toBeInTheDocument();
    expect(screen.queryByText('Broken Light')).not.toBeInTheDocument();
  });

  it('loads messages when request is selected', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Messages />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Leaking Faucet')).toBeInTheDocument();
    });

    const request = screen.getByTestId('request-req-1');
    fireEvent.click(request);

    await waitFor(() => {
      expect(screen.getByText('The faucet is leaking badly')).toBeInTheDocument();
      expect(screen.getByText('We will send someone today')).toBeInTheDocument();
    });
  });

  it('displays message bubbles with correct styling', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Messages />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Leaking Faucet')).toBeInTheDocument();
    });

    const request = screen.getByTestId('request-req-1');
    fireEvent.click(request);

    await waitFor(() => {
      const ownMessage = screen.getByTestId('message-msg-1');
      const otherMessage = screen.getByTestId('message-msg-2');

      expect(ownMessage).toHaveClass('items-end');
      expect(otherMessage).toHaveClass('items-start');
    });
  });

  it('auto-scrolls to bottom when messages load', async () => {
    const scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    render(
      <QueryClientProvider client={queryClient}>
        <Messages />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Leaking Faucet')).toBeInTheDocument();
    });

    const request = screen.getByTestId('request-req-1');
    fireEvent.click(request);

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });

  it('enables send button only when message has content', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Messages />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Leaking Faucet')).toBeInTheDocument();
    });

    const request = screen.getByTestId('request-req-1');
    fireEvent.click(request);

    await waitFor(() => {
      const sendButton = screen.getByTestId('button-send-message');
      expect(sendButton).toBeDisabled();
    });

    const textarea = screen.getByTestId('textarea-new-message');
    fireEvent.change(textarea, { target: { value: 'New message' } });

    await waitFor(() => {
      const sendButton = screen.getByTestId('button-send-message');
      expect(sendButton).not.toBeDisabled();
    });
  });

  it('shows empty state when no request is selected', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Messages />
      </QueryClientProvider>
    );

    expect(screen.getByText('Select a request to view messages')).toBeInTheDocument();
  });

  it('displays "No messages yet" when request has no messages', async () => {
    global.fetch = vi.fn((url) => {
      if (url.includes('/api/service-requests')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRequests),
        });
      }
      if (url.includes('/api/messages/request')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/users')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { id: 'user-1', username: 'testuser', firstName: 'Test', lastName: 'User', role: 'staff' },
            { id: 'admin-1', username: 'admin', firstName: 'Admin', lastName: 'User', role: 'admin' },
          ]),
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    }) as any;

    render(
      <QueryClientProvider client={queryClient}>
        <Messages />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Leaking Faucet')).toBeInTheDocument();
    });

    const request = screen.getByTestId('request-req-1');
    fireEvent.click(request);

    await waitFor(() => {
      expect(screen.getByText('No messages yet. Start the conversation!')).toBeInTheDocument();
    });
  });

  it('shows unread message badge for messages from other users', async () => {
    global.fetch = vi.fn((url) => {
      if (url.includes('/api/service-requests')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRequests),
        });
      }
      if (url.includes('/api/messages') && !url.includes('/api/messages/request')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMessages),
        });
      }
      if (url.includes('/api/messages/request')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/users')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { id: 'user-1', username: 'testuser', firstName: 'Test', lastName: 'User', role: 'staff' },
            { id: 'admin-1', username: 'admin', firstName: 'Admin', lastName: 'User', role: 'admin' },
          ]),
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    }) as any;

    render(
      <QueryClientProvider client={queryClient}>
        <Messages />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Leaking Faucet')).toBeInTheDocument();
      // Should show badge with count of 1 (only msg-2 is unread and from admin-1)
      const badge = screen.getByTestId('unread-badge-req-1');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('1');
    });
  });
});

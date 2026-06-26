import { QueryClient, QueryFunction } from "@tanstack/react-query";

export async function parseApiError(res: Response, fallbackMessage?: string): Promise<string> {
  const text = (await res.text()) || res.statusText;
  try {
    const errorObj = JSON.parse(text);
    let errorMessage = errorObj.message || errorObj.error || text;

    if (errorObj.errors && Array.isArray(errorObj.errors)) {
      const validationErrors = errorObj.errors
        .map((e: { message?: string; path?: string[] }) =>
          e.message || `${e.path?.join(".") || "field"}: ${e.message || "invalid"}`,
        )
        .join(", ");
      if (validationErrors) {
        errorMessage = `${errorMessage} (${validationErrors})`;
      }
    }

    if (errorObj.hint) {
      errorMessage = `${errorMessage} - ${errorObj.hint}`;
    }
    if (errorObj.detail && !errorMessage.includes(errorObj.detail)) {
      errorMessage = `${errorMessage} - ${errorObj.detail}`;
    }

    return errorMessage;
  } catch {
    return text || fallbackMessage || `${res.status}: ${res.statusText}`;
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

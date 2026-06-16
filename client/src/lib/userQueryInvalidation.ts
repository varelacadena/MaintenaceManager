import type { QueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";

const userListQueryKey = ["/api/users"] as const;
const userDirectoryQueryKey = ["/api/users/directory"] as const;

function upsertUser(users: User[] | undefined, user: User): User[] | undefined {
  if (!users) return users;
  const existingIndex = users.findIndex((item) => item.id === user.id);
  if (existingIndex === -1) {
    return [...users, user];
  }
  return users.map((item, index) => (index === existingIndex ? { ...item, ...user } : item));
}

export function upsertUserInDirectoryCaches(queryClient: QueryClient, user: User) {
  queryClient.setQueryData<User[]>(userListQueryKey, (current) => upsertUser(current, user));
  queryClient.setQueryData<User[]>(userDirectoryQueryKey, (current) => upsertUser(current, user));
}

export function invalidateUserDirectoryQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: userListQueryKey });
  queryClient.invalidateQueries({ queryKey: userDirectoryQueryKey });
}

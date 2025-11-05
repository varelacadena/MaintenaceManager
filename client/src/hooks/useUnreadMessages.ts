
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import type { Message } from "@shared/schema";

export function useUnreadMessages() {
  const { user } = useAuth();

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    enabled: !!user, // Only fetch when user is authenticated
  });

  if (!user) return 0;

  // Count unread messages where the user is not the sender
  const unreadCount = messages.filter(
    (msg) => !msg.read && msg.senderId !== user.id
  ).length;

  return unreadCount;
}

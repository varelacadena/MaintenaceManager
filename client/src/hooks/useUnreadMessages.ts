
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import type { Message } from "@shared/schema";

export function useUnreadMessages() {
  const { user } = useAuth();

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (!user) return 0;

  // Count messages where the user is not the sender and message is unread
  const unreadCount = messages.filter(
    (msg) => msg.senderId !== user.id && !msg.read
  ).length;

  return unreadCount;
}


import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import type { Message } from "@shared/schema";

export function useUnreadMessages() {
  const { user } = useAuth();

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    enabled: !!user,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const unreadCount = messages.filter(
    (msg) => !msg.read && msg.senderId !== user?.id
  ).length;

  return { unreadCount, messages };
}

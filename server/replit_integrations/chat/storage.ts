
let nextConversationId = 1;

interface Conversation {
  id: number;
  title: string;
  createdAt: Date;
}

interface ChatMessage {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: Date;
}

const conversationsStore: Map<number, Conversation> = new Map();
const messagesStore: Map<number, ChatMessage[]> = new Map();
let nextMessageId = 1;

export interface IChatStorage {
  getConversation(id: number): Promise<Conversation | undefined>;
  getAllConversations(): Promise<Conversation[]>;
  createConversation(title: string): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<ChatMessage[]>;
  createMessage(conversationId: number, role: string, content: string): Promise<ChatMessage>;
}

export const chatStorage: IChatStorage = {
  async getConversation(id: number) {
    return conversationsStore.get(id);
  },

  async getAllConversations() {
    return Array.from(conversationsStore.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  },

  async createConversation(title: string) {
    const conversation: Conversation = {
      id: nextConversationId++,
      title,
      createdAt: new Date(),
    };
    conversationsStore.set(conversation.id, conversation);
    return conversation;
  },

  async deleteConversation(id: number) {
    conversationsStore.delete(id);
    messagesStore.delete(id);
  },

  async getMessagesByConversation(conversationId: number) {
    return messagesStore.get(conversationId) || [];
  },

  async createMessage(conversationId: number, role: string, content: string) {
    const message: ChatMessage = {
      id: nextMessageId++,
      conversationId,
      role,
      content,
      createdAt: new Date(),
    };
    const existing = messagesStore.get(conversationId) || [];
    existing.push(message);
    messagesStore.set(conversationId, existing);
    return message;
  },
};

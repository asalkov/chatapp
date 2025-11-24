export interface StoredMessage {
    id: string;
    sender: string;
    recipient: string;
    message: string;
    timestamp: Date;
    isPrivate: boolean;
    read: boolean;
}
export declare class MessageService {
    private readonly logger;
    private messages;
    saveMessage(message: Omit<StoredMessage, 'id'>): StoredMessage;
    getMessagesForUser(username: string): StoredMessage[];
    getConversation(user1: string, user2: string): StoredMessage[];
    markAsRead(username: string, messageIds: string[]): void;
    deleteUserMessages(username: string): void;
    deleteConversation(user1: string, user2: string): void;
    getAllMessages(): Map<string, StoredMessage[]>;
    getStats(): {
        totalMessages: number;
        totalUsers: number;
    };
    private generateId;
}

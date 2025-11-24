import { Injectable, Logger } from '@nestjs/common';

export interface StoredMessage {
  id: string;
  sender: string;
  recipient: string;
  message: string;
  timestamp: Date;
  isPrivate: boolean;
  read: boolean;
}

@Injectable()
export class MessageService {
  private readonly logger = new Logger('MessageService');
  private messages: Map<string, StoredMessage[]> = new Map(); // username -> messages

  // Save a message
  saveMessage(message: Omit<StoredMessage, 'id'>): StoredMessage {
    const storedMessage: StoredMessage = {
      ...message,
      id: this.generateId(),
    };

    // Store for recipient
    const recipientMessages = this.messages.get(message.recipient) || [];
    recipientMessages.push(storedMessage);
    this.messages.set(message.recipient, recipientMessages);

    // Store for sender (so they can see their sent messages)
    const senderMessages = this.messages.get(message.sender) || [];
    senderMessages.push(storedMessage);
    this.messages.set(message.sender, senderMessages);

    this.logger.log(`Message saved: ${message.sender} -> ${message.recipient}`);

    return storedMessage;
  }

  // Get all messages for a user
  getMessagesForUser(username: string): StoredMessage[] {
    const messages = this.messages.get(username) || [];
    const messagePreview = messages.map(m => `${m.sender}->${m.recipient}: "${m.message}"`).join(', ');
    this.logger.log(`Retrieved ${messages.length} messages for ${username}: [${messagePreview}]`);
    return messages;
  }

  // Get conversation between two users
  getConversation(user1: string, user2: string): StoredMessage[] {
    const user1Messages = this.messages.get(user1) || [];
    const conversation = user1Messages.filter(
      (msg) =>
        (msg.sender === user1 && msg.recipient === user2) ||
        (msg.sender === user2 && msg.recipient === user1),
    );
    return conversation.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }

  // Mark messages as read
  markAsRead(username: string, messageIds: string[]): void {
    const userMessages = this.messages.get(username) || [];
    userMessages.forEach((msg) => {
      if (messageIds.includes(msg.id)) {
        msg.read = true;
      }
    });
    this.logger.log(
      `Marked ${messageIds.length} messages as read for ${username}`,
    );
  }

  // Delete all messages for a user (admin function)
  deleteUserMessages(username: string): void {
    this.messages.delete(username);

    // Also remove messages where this user is sender/recipient from other users
    this.messages.forEach((messages, user) => {
      const filtered = messages.filter(
        (msg) => msg.sender !== username && msg.recipient !== username,
      );
      this.messages.set(user, filtered);
    });

    this.logger.log(`Deleted all messages for user: ${username}`);
  }

  // Delete a specific conversation
  deleteConversation(user1: string, user2: string): void {
    // Remove from user1's messages
    const user1Messages = this.messages.get(user1) || [];
    const filtered1 = user1Messages.filter(
      (msg) =>
        !(
          (msg.sender === user1 && msg.recipient === user2) ||
          (msg.sender === user2 && msg.recipient === user1)
        ),
    );
    this.messages.set(user1, filtered1);

    // Remove from user2's messages
    const user2Messages = this.messages.get(user2) || [];
    const filtered2 = user2Messages.filter(
      (msg) =>
        !(
          (msg.sender === user1 && msg.recipient === user2) ||
          (msg.sender === user2 && msg.recipient === user1)
        ),
    );
    this.messages.set(user2, filtered2);

    this.logger.log(`Deleted conversation between ${user1} and ${user2}`);
  }

  // Get all messages (admin function)
  getAllMessages(): Map<string, StoredMessage[]> {
    return new Map(this.messages);
  }

  // Get statistics
  getStats(): { totalMessages: number; totalUsers: number } {
    let totalMessages = 0;
    this.messages.forEach((messages) => {
      totalMessages += messages.length;
    });

    return {
      totalMessages: totalMessages / 2, // Divide by 2 since messages are stored for both sender and recipient
      totalUsers: this.messages.size,
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageService = void 0;
const common_1 = require("@nestjs/common");
let MessageService = class MessageService {
    logger = new common_1.Logger('MessageService');
    messages = new Map();
    saveMessage(message) {
        const storedMessage = {
            ...message,
            id: this.generateId(),
        };
        const recipientMessages = this.messages.get(message.recipient) || [];
        recipientMessages.push(storedMessage);
        this.messages.set(message.recipient, recipientMessages);
        const senderMessages = this.messages.get(message.sender) || [];
        senderMessages.push(storedMessage);
        this.messages.set(message.sender, senderMessages);
        this.logger.log(`Message saved: ${message.sender} -> ${message.recipient}`);
        return storedMessage;
    }
    getMessagesForUser(username) {
        const messages = this.messages.get(username) || [];
        this.logger.log(`Retrieved ${messages.length} messages for ${username}`);
        return messages;
    }
    getConversation(user1, user2) {
        const user1Messages = this.messages.get(user1) || [];
        const conversation = user1Messages.filter((msg) => (msg.sender === user1 && msg.recipient === user2) ||
            (msg.sender === user2 && msg.recipient === user1));
        return conversation.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
    markAsRead(username, messageIds) {
        const userMessages = this.messages.get(username) || [];
        userMessages.forEach((msg) => {
            if (messageIds.includes(msg.id)) {
                msg.read = true;
            }
        });
        this.logger.log(`Marked ${messageIds.length} messages as read for ${username}`);
    }
    deleteUserMessages(username) {
        this.messages.delete(username);
        this.messages.forEach((messages, user) => {
            const filtered = messages.filter((msg) => msg.sender !== username && msg.recipient !== username);
            this.messages.set(user, filtered);
        });
        this.logger.log(`Deleted all messages for user: ${username}`);
    }
    deleteConversation(user1, user2) {
        const user1Messages = this.messages.get(user1) || [];
        const filtered1 = user1Messages.filter((msg) => !((msg.sender === user1 && msg.recipient === user2) ||
            (msg.sender === user2 && msg.recipient === user1)));
        this.messages.set(user1, filtered1);
        const user2Messages = this.messages.get(user2) || [];
        const filtered2 = user2Messages.filter((msg) => !((msg.sender === user1 && msg.recipient === user2) ||
            (msg.sender === user2 && msg.recipient === user1)));
        this.messages.set(user2, filtered2);
        this.logger.log(`Deleted conversation between ${user1} and ${user2}`);
    }
    getStats() {
        let totalMessages = 0;
        this.messages.forEach((messages) => {
            totalMessages += messages.length;
        });
        return {
            totalMessages: totalMessages / 2,
            totalUsers: this.messages.size,
        };
    }
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
};
exports.MessageService = MessageService;
exports.MessageService = MessageService = __decorate([
    (0, common_1.Injectable)()
], MessageService);
//# sourceMappingURL=message.service.js.map
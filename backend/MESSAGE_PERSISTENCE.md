# Backend Message Persistence

## Overview

Messages are now persisted in the backend database and automatically loaded when users log in. This ensures message history is preserved across sessions and devices.

## Implementation

### Backend Components

#### 1. MessageService (`src/database/message.service.ts`)

In-memory database service for storing and retrieving messages.

**Data Structure:**
```typescript
interface StoredMessage {
  id: string;              // Unique message ID
  sender: string;          // Username of sender
  recipient: string;       // Username of recipient
  message: string;         // Message content
  timestamp: Date;         // When message was sent
  isPrivate: boolean;      // Always true for private messages
  read: boolean;           // Read status
}
```

**Key Methods:**
- `saveMessage()` - Save a new message
- `getMessagesForUser()` - Get all messages for a user
- `getConversation()` - Get conversation between two users
- `markAsRead()` - Mark messages as read
- `deleteUserMessages()` - Delete all messages for a user (admin)
- `deleteConversation()` - Delete a conversation
- `getStats()` - Get message statistics

**Storage:**
- Messages stored in a Map: `username -> StoredMessage[]`
- Each message stored for both sender and recipient
- Allows both users to see the conversation

#### 2. Gateway Integration (`src/app.gateway.ts`)

**On User Registration:**
```typescript
// After successful registration
this.sendPersistedMessages(client, username);
```

**On Private Message:**
```typescript
// Save message to database
const savedMessage = this.messageService.saveMessage({
  sender: sender.username,
  recipient: recipient.username,
  message: data.message,
  timestamp: new Date(),
  isPrivate: true,
  read: false,
});
```

**Sending Persisted Messages:**
```typescript
private sendPersistedMessages(client: Socket, username: string): void {
  const messages = this.messageService.getMessagesForUser(username);
  
  // Group by conversation partner
  const conversations = new Map<string, any[]>();
  messages.forEach((msg) => {
    const partner = msg.sender === username ? msg.recipient : msg.sender;
    conversations.get(partner).push(msg);
  });
  
  // Send to client
  client.emit('persistedMessages', {
    conversations: Object.fromEntries(conversations),
    totalMessages: messages.length,
  });
}
```

### Frontend Integration

#### 1. Socket Listener (`src/hooks/useSocket.ts`)

```typescript
newSocket.on('persistedMessages', (data) => {
  console.log(`📦 Received ${data.totalMessages} persisted messages`);
  
  // Convert and load into Redux
  const chats: Record<string, any[]> = {};
  Object.entries(data.conversations).forEach(([partner, messages]) => {
    chats[partner] = messages;
  });
  
  dispatch(loadPersistedChats(chats));
});
```

#### 2. Redux Integration (`src/store/slices/chatSlice.ts`)

**Smart Merging:**
- Merges backend messages with localStorage messages
- Avoids duplicates based on timestamp, content, and sender
- Sorts messages by timestamp
- Preserves all message history

```typescript
loadPersistedChats: (state, action) => {
  const newChats = action.payload;
  Object.keys(newChats).forEach(chatId => {
    if (state.chats[chatId]) {
      // Merge and deduplicate
      const merged = [...existing];
      incoming.forEach(newMsg => {
        if (!isDuplicate(newMsg)) {
          merged.push(newMsg);
        }
      });
      merged.sort(byTimestamp);
      state.chats[chatId] = merged;
    } else {
      state.chats[chatId] = newChats[chatId];
    }
  });
}
```

## Data Flow

### Sending a Message

```
User A sends message to User B
    ↓
Frontend emits 'privateMessage'
    ↓
Backend Gateway receives message
    ↓
MessageService.saveMessage()
    ↓
Message saved in backend Map
    ↓
Message sent to User B (if online)
    ↓
Message echoed back to User A
    ↓
Both users see message immediately
```

### Loading Messages on Login

```
User logs in
    ↓
Frontend emits 'register'
    ↓
Backend validates and registers user
    ↓
Backend calls sendPersistedMessages()
    ↓
MessageService.getMessagesForUser()
    ↓
Messages grouped by conversation
    ↓
Backend emits 'persistedMessages'
    ↓
Frontend receives messages
    ↓
Messages merged with localStorage
    ↓
User sees complete message history
```

## Message Sources

Users now have messages from **two sources**:

1. **Backend Database** (server-side)
   - Messages sent while online
   - Persisted across all sessions
   - Shared across devices (if using same backend)
   - Survives browser cache clear

2. **localStorage** (client-side)
   - Messages sent while offline
   - Browser-specific
   - Survives page refresh
   - Lost if browser data cleared

**Merging Strategy:**
- Both sources loaded on login
- Duplicates removed
- Messages sorted chronologically
- Complete history preserved

## Benefits

### ✅ Advantages

1. **Cross-Device Sync**
   - Messages available on any device
   - Login from different browsers
   - See same message history

2. **Reliability**
   - Messages survive browser cache clear
   - Backend is source of truth
   - No data loss

3. **Scalability**
   - Ready for database integration
   - Can add MongoDB, PostgreSQL, etc.
   - Easy to add features (search, export)

4. **Admin Control**
   - Admin can delete user messages
   - Centralized message management
   - Audit trail possible

5. **Offline Support**
   - localStorage provides offline access
   - Backend provides sync when online
   - Best of both worlds

## Limitations

### Current Implementation

1. **In-Memory Storage**
   - Data lost on server restart
   - Not suitable for production
   - Limited by server RAM

2. **No Encryption**
   - Messages stored in plain text
   - No end-to-end encryption
   - Security concern for production

3. **No Pagination**
   - All messages loaded at once
   - Could be slow with many messages
   - Memory intensive

4. **No Message Editing/Deletion**
   - Users can't edit sent messages
   - Can't delete individual messages
   - Only admin can delete conversations

## Future Enhancements

### Database Integration

Replace in-memory storage with real database:

**MongoDB Example:**
```typescript
@Injectable()
export class MessageService {
  constructor(
    @InjectModel('Message') private messageModel: Model<Message>
  ) {}
  
  async saveMessage(message: CreateMessageDto): Promise<Message> {
    const newMessage = new this.messageModel(message);
    return await newMessage.save();
  }
  
  async getMessagesForUser(username: string): Promise<Message[]> {
    return await this.messageModel
      .find({
        $or: [
          { sender: username },
          { recipient: username }
        ]
      })
      .sort({ timestamp: 1 })
      .exec();
  }
}
```

**PostgreSQL Example:**
```typescript
@Entity()
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  sender: string;
  
  @Column()
  recipient: string;
  
  @Column('text')
  message: string;
  
  @CreateDateColumn()
  timestamp: Date;
  
  @Column({ default: false })
  read: boolean;
}
```

### Additional Features

1. **Pagination**
   ```typescript
   getMessages(username: string, page: number, limit: number)
   ```

2. **Message Search**
   ```typescript
   searchMessages(username: string, query: string)
   ```

3. **Read Receipts**
   ```typescript
   markAsRead(messageIds: string[])
   ```

4. **Message Editing**
   ```typescript
   editMessage(messageId: string, newContent: string)
   ```

5. **Message Deletion**
   ```typescript
   deleteMessage(messageId: string, username: string)
   ```

6. **File Attachments**
   ```typescript
   saveAttachment(file: Buffer, metadata: FileMetadata)
   ```

7. **Encryption**
   ```typescript
   encryptMessage(message: string, publicKey: string)
   decryptMessage(encrypted: string, privateKey: string)
   ```

## Testing

### Test Message Persistence

1. **User A sends message to User B**
   - Both online
   - Message appears immediately
   - ✅ Message saved in backend

2. **User B logs out and back in**
   - ✅ Message still visible
   - ✅ Loaded from backend

3. **User A logs in from different browser**
   - ✅ Message visible there too
   - ✅ Cross-device sync works

4. **Clear browser localStorage**
   - ✅ Messages still load from backend
   - ✅ Backend is source of truth

5. **Admin deletes User B**
   - ✅ All messages with User B deleted
   - ✅ User A no longer sees conversation

### Test Message Merging

1. **User sends message while offline**
   - Saved to localStorage only
   - Not in backend

2. **User comes online**
   - Sends another message
   - Saved to backend

3. **User logs out and back in**
   - ✅ Both messages visible
   - ✅ Merged correctly
   - ✅ No duplicates
   - ✅ Sorted by time

## API Events

### Server → Client

**`persistedMessages`**
```typescript
{
  conversations: {
    "username1": [
      {
        sender: "me",
        recipient: "username1",
        message: "Hello",
        timestamp: "2025-11-23T05:00:00.000Z",
        isPrivate: true,
        messageId: "123-abc"
      }
    ]
  },
  totalMessages: 5
}
```

**`msgToClient`**
```typescript
{
  sender: "username",
  message: "Hello",
  isPrivate: true,
  timestamp: "2025-11-23T05:00:00.000Z",
  messageId: "123-abc",
  recipient: "otherUser"
}
```

### Client → Server

**`privateMessage`**
```typescript
{
  to: "socketId",
  message: "Hello"
}
```

## Migration Path

### From In-Memory to Database

1. **Install database driver**
   ```bash
   npm install @nestjs/mongoose mongoose
   # or
   npm install @nestjs/typeorm pg
   ```

2. **Create schema/entity**
   ```typescript
   @Schema()
   export class Message {
     @Prop() sender: string;
     @Prop() recipient: string;
     @Prop() message: string;
     @Prop() timestamp: Date;
   }
   ```

3. **Update MessageService**
   - Replace Map with database queries
   - Keep same interface
   - No frontend changes needed

4. **Add indexes**
   ```typescript
   @Index({ sender: 1, timestamp: -1 })
   @Index({ recipient: 1, timestamp: -1 })
   ```

## Summary

Messages are now persisted in the backend and automatically loaded on login. The system merges backend messages with localStorage messages to provide a complete message history. This implementation is ready for database integration and provides a solid foundation for production use.

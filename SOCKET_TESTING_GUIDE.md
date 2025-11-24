# Socket Service Testing Guide

This guide explains how to test the WebSocket 1-to-1 communication functionality.

## What Gets Tested

### ✅ Core Features
1. **User Connection** - Users can connect to the WebSocket server
2. **User Registration** - Users can register with unique usernames
3. **1-to-1 Messaging** - Private messages between two users
4. **Message Echo** - Sender receives confirmation of their sent message
5. **Message Privacy** - Third parties cannot see private messages
6. **User List** - Connected users list is broadcasted
7. **Error Handling** - Invalid recipients are handled properly
8. **Message Persistence** - Messages are saved and delivered
9. **Session Management** - Duplicate logins disconnect old sessions
10. **Message Deduplication** - No duplicate messages appear

## Option 1: Manual Test Script (Recommended for Quick Testing)

### Prerequisites
```bash
# Make sure backend is running
cd C:\Users\salko\chatapp\backend
npm run start:dev
```

### Run the Test
```bash
# In a new terminal
cd C:\Users\salko\chatapp\backend
node test/manual-socket-test.js
```

### Expected Output
```
🧪 Starting Socket 1-to-1 Communication Test

✅ Test 1: Alice connected (Socket ID: abc123)
✅ Test 2: Bob connected (Socket ID: def456)

📝 Registering users...
✅ Test 3: Alice registered successfully
✅ Test 4: Bob registered successfully

💬 Testing 1-to-1 messaging...
📤 Alice sending message to Bob...
✅ Test 5: Alice received echo of her message
   Message: Hello Bob!
   Recipient: bob
✅ Test 6: Bob received message from Alice
   Sender: alice
   Message: Hello Bob!

💬 Testing reverse direction (Bob to Alice)...
📤 Bob sending message to Alice...
✅ Test 7: Bob received echo of his message
✅ Test 8: Alice received message from Bob

👥 Testing user list broadcast...
✅ Test 9: User list contains both Alice and Bob
   Users: alice, bob

❌ Testing error handling (invalid recipient)...
✅ Test 10: Proper error for invalid recipient
   Error: User not found or disconnected

==================================================
📊 TEST RESULTS
==================================================
✅ Tests Passed: 10/10
❌ Tests Failed: 0/10

🎉 ALL TESTS PASSED! Socket 1-to-1 communication works correctly.

🔌 Disconnecting clients...
✅ Test complete. Exiting...
```

## Option 2: Jest E2E Tests (Comprehensive Testing)

### Prerequisites
```bash
cd C:\Users\salko\chatapp\backend
npm install --save-dev @nestjs/testing socket.io-client
```

### Run the Tests
```bash
# Run all socket tests
npm run test:e2e -- socket.e2e-spec.ts

# Run with coverage
npm run test:e2e -- socket.e2e-spec.ts --coverage

# Run specific test suite
npm run test:e2e -- socket.e2e-spec.ts -t "1-to-1 Private Messaging"
```

### Test Suites Included

#### 1. User Registration
- ✅ Valid username registration
- ✅ Invalid username rejection (< 2 chars)
- ✅ Duplicate session handling

#### 2. 1-to-1 Private Messaging
- ✅ Message delivery from user1 to user2
- ✅ Message echo back to sender
- ✅ Privacy (third party doesn't receive message)
- ✅ Error handling for non-existent users

#### 3. Message Persistence
- ✅ Messages are saved
- ✅ Messages delivered on reconnection

#### 4. User List Broadcasting
- ✅ User list updates when users join
- ✅ User list updates when users leave

#### 5. Message Deduplication
- ✅ No duplicate messages created

## Option 3: Browser Console Testing (Interactive)

### Step 1: Open Two Browser Windows
1. Window 1: Log in as User A (e.g., "alice")
2. Window 2: Log in as User B (e.g., "bob")

### Step 2: Open Developer Console (F12)
In both windows, open the browser console to see logs.

### Step 3: Send Messages
1. In Window 1 (Alice), send a message to Bob
2. Check both consoles for logs

### Expected Console Logs

**Alice's Console:**
```
🔌 Initializing WebSocket connection to: http://localhost:3000
✅ Connected to server
Socket ID: abc123
✅ Registration successful
📤 Sending private message to bob (def456) - ONLINE
📨 Message received: {sender: "alice", message: "Hello Bob!", ...}
✅ Message processed successfully
```

**Bob's Console:**
```
🔌 Initializing WebSocket connection to: http://localhost:3000
✅ Connected to server
Socket ID: def456
✅ Registration successful
📨 Message received: {sender: "alice", message: "Hello Bob!", ...}
```

### Step 4: Verify Message Appears Once
- ✅ Alice sees the message once in her chat with Bob
- ✅ Bob sees the message once in his chat with Alice
- ✅ No duplicates appear

## Troubleshooting

### Test Fails: Connection Error
```bash
❌ Alice connection error: connect ECONNREFUSED
```
**Solution**: Make sure backend is running on port 3000
```bash
cd C:\Users\salko\chatapp\backend
npm run start:dev
```

### Test Fails: Registration Failed
```bash
❌ Registration failed: Username already taken
```
**Solution**: Restart the backend to clear in-memory users
```bash
# Stop backend (Ctrl+C)
npm run start:dev
```

### Test Fails: Message Not Received
**Check:**
1. Both users are registered successfully
2. Socket IDs are valid
3. Backend logs show message being sent
4. No errors in console

### Port Already in Use
```bash
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution**: Kill the process using port 3000
```powershell
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

## Test Coverage

### What's Tested ✅
- User connection and registration
- 1-to-1 private messaging
- Message echo to sender
- Message privacy (no leaks to third parties)
- User list broadcasting
- Error handling
- Message persistence
- Session management
- Message deduplication

### What's NOT Tested ❌
- Group messaging (not implemented)
- File uploads (not implemented)
- Video/Audio calls (not implemented)
- Message editing/deletion
- Read receipts
- Typing indicators

## Performance Testing

### Load Test (Optional)
To test with multiple concurrent users:

```javascript
// Create load-test.js
const io = require('socket.io-client');

const NUM_USERS = 100;
const clients = [];

for (let i = 0; i < NUM_USERS; i++) {
  const client = io('http://localhost:3000');
  client.on('connect', () => {
    client.emit('register', { username: `user${i}` });
  });
  clients.push(client);
}

console.log(`Connected ${NUM_USERS} users`);
```

Run: `node load-test.js`

## Continuous Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/test.yml
- name: Run Socket Tests
  run: |
    cd backend
    npm run start:dev &
    sleep 5
    node test/manual-socket-test.js
```

## Next Steps

After all tests pass:
1. ✅ Deploy to production
2. ✅ Monitor socket connections in production
3. ✅ Set up error tracking (e.g., Sentry)
4. ✅ Add performance monitoring

## Support

If tests fail or you need help:
1. Check backend logs for errors
2. Check browser console for errors
3. Verify network connectivity
4. Restart both frontend and backend

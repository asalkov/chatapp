# Invitation Feature Testing Guide

## Prerequisites

### 1. Start Backend
```powershell
cd C:\Users\salko\chatapp\backend
npm install
npm run start:dev
```

**Expected output:**
```
[Nest] Nest application successfully started
[WebSocketGateway] WebSocket Gateway initialized
```

### 2. Start Frontend
```powershell
cd C:\Users\salko\chatapp\frontend
npm install
npm run dev
```

**Expected output:**
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

---

## Test 1: Send Invitation via WebSocket

### Steps:
1. Open http://localhost:5173
2. Login as any user (e.g., "testuser")
3. Click the **"Invite Friend"** button (+ icon in header)
4. Enter email: `friend@example.com`
5. Click **"Send Invitation"**

### Expected Result:
✅ Success message appears  
✅ Invitation link displayed: `http://localhost:5173/invite/inv_xxxxx`  
✅ Copy button works  

### Verify in Console:
```javascript
// Backend logs should show:
[AppGateway] Invitation sent: testuser -> friend@example.com

// Frontend console should show:
✅ Invitation sent successfully
```

---

## Test 2: Open Invitation Link

### Steps:
1. Copy the invitation link from Test 1
2. Open link in **new browser tab** (or incognito)
3. Should see invitation acceptance page

### Expected Result:
✅ Page loads successfully  
✅ Shows: "You're Invited!"  
✅ Shows inviter username  
✅ Shows invitee email  
✅ Shows expiration date  
✅ "Accept" and "Decline" buttons visible  

### URL Format:
```
http://localhost:5173/invite/inv_1763887195530_cpigix90j6n
                              └─────────────┬─────────────┘
                                      Token (unique)
```

---

## Test 3: Accept Invitation

### Steps:
1. On invitation page, click **"Accept Invitation"**
2. Wait for processing

### Expected Result:
✅ Shows "Invitation Accepted!" message  
✅ Redirects to login page after 2 seconds  
✅ Original inviter gets notification (if online)  

### Backend API Call:
```
POST http://localhost:3000/invitations/accept/TOKEN
Response: { success: true, message: "Invitation accepted" }
```

---

## Test 4: Decline Invitation

### Steps:
1. Get a new invitation link
2. Open in new tab
3. Click **"Decline"** button

### Expected Result:
✅ Invitation status updated to "rejected"  
✅ Redirects to home page  
✅ Link becomes invalid  

---

## Test 5: View My Invitations

### Steps:
1. Login as the user who sent invitations
2. Click **"View Invitations"** button (list icon)
3. Should see list of sent invitations

### Expected Result:
✅ Shows all invitations sent by current user  
✅ Shows status: pending/accepted/rejected/expired  
✅ Shows invitee email  
✅ Shows creation and expiration dates  

---

## Test 6: Expired Invitation

### Steps:
1. Get an invitation token
2. Wait for expiration (default: 7 days)
3. Try to open the link

### Expected Result:
✅ Shows "This invitation is expired"  
✅ Cannot accept or decline  

**Note:** For testing, you can modify expiration in `invitation.service.ts`:
```typescript
// Change from 7 days to 1 minute for testing
expiresAt: new Date(Date.now() + 60 * 1000), // 1 minute
```

---

## Test 7: Invalid Token

### Steps:
1. Open: `http://localhost:5173/invite/invalid_token_123`

### Expected Result:
✅ Shows "Invalid Invitation"  
✅ Shows "Invitation not found" message  
✅ "Go to Chat" button works  

---

## Test 8: Direct API Testing

### Test Backend Endpoints Directly:

#### Create Invitation (POST)
```javascript
fetch('http://localhost:3000/invitations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    inviterUsername: 'testuser',
    inviteeEmail: 'test@example.com'
  })
})
.then(r => r.json())
.then(console.log)
```

**Expected Response:**
```json
{
  "success": true,
  "invitation": {
    "id": "inv_xxx",
    "inviterUsername": "testuser",
    "inviteeEmail": "test@example.com",
    "status": "pending",
    "createdAt": "2024-11-23T...",
    "expiresAt": "2024-11-30T...",
    "invitationLink": "http://localhost:5173/invite/inv_xxx"
  }
}
```

#### Get Invitation by Token (GET)
```javascript
fetch('http://localhost:3000/invitations/token/inv_xxx')
  .then(r => r.json())
  .then(console.log)
```

**Expected Response:**
```json
{
  "success": true,
  "invitation": {
    "id": "inv_xxx",
    "inviterUsername": "testuser",
    "inviteeEmail": "test@example.com",
    "status": "pending",
    "createdAt": "...",
    "expiresAt": "..."
  }
}
```

#### Accept Invitation (POST)
```javascript
fetch('http://localhost:3000/invitations/accept/inv_xxx', {
  method: 'POST'
})
.then(r => r.json())
.then(console.log)
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Invitation accepted successfully"
}
```

---

## Test 9: Email Validation

### Test Invalid Emails:

```javascript
// Should FAIL - no @
inviteeEmail: "notanemail"

// Should FAIL - no domain
inviteeEmail: "test@"

// Should FAIL - no TLD
inviteeEmail: "test@example"

// Should PASS
inviteeEmail: "test@example.com"
```

### Steps:
1. Try sending invitation with invalid email
2. Should show error: "Invalid email format"

---

## Test 10: Notification Flow

### Steps:
1. **User A** logs in
2. **User A** sends invitation to `userb@example.com`
3. **User B** opens invitation link
4. **User B** accepts invitation
5. **User A** should receive notification (if still online)

### Expected Result:
✅ User A sees alert: "userb@example.com accepted your invitation!"  
✅ Backend logs show notification sent  

---

## Test 11: Multiple Invitations

### Steps:
1. Send 3 invitations to different emails
2. Click "View Invitations"
3. Should see all 3 invitations

### Expected Result:
✅ All invitations listed  
✅ Each has unique token  
✅ Status tracked independently  

---

## Test 12: AWS Deployment Testing

### After deploying to AWS:

1. **Send invitation from AWS:**
   ```
   Login at: http://98.84.171.210
   Send invitation
   Link should be: http://98.84.171.210/invite/inv_xxx
   ```

2. **Open invitation link:**
   ```
   http://98.84.171.210/invite/inv_xxx
   Should load invitation page
   ```

3. **Accept invitation:**
   ```
   Click Accept
   Should work without errors
   ```

---

## Troubleshooting

### Issue: "Failed to fetch"
**Solution:** Backend not running. Start with `npm run start:dev`

### Issue: "Invitation not found"
**Solution:** 
- Token might be invalid
- Backend was restarted (in-memory storage cleared)
- Generate new invitation

### Issue: Link shows localhost on AWS
**Solution:** Set `FRONTEND_URL` in docker-compose.yml:
```yaml
environment:
  - FRONTEND_URL=http://98.84.171.210
```

### Issue: CORS error
**Solution:** Check backend CORS settings in `main.ts`:
```typescript
app.enableCors({ origin: '*' });
```

---

## Quick Test Script

Run this in browser console after logging in:

```javascript
// Get socket from window
const socket = window.socket;

// Send invitation
socket.emit('sendInvitation', 
  { 
    inviterUsername: 'testuser', 
    inviteeEmail: 'test@example.com' 
  },
  (response) => {
    console.log('Response:', response);
    if (response.success) {
      console.log('✅ Invitation Link:', response.invitation.invitationLink);
      // Auto-open in new tab
      window.open(response.invitation.invitationLink, '_blank');
    }
  }
);
```

---

## Test Checklist

- [ ] Backend running on port 3000
- [ ] Frontend running on port 5173
- [ ] Can login to chat
- [ ] "Invite Friend" button visible
- [ ] Can enter email and send invitation
- [ ] Invitation link generated correctly
- [ ] Can open invitation link in new tab
- [ ] Invitation page loads with correct data
- [ ] Can accept invitation
- [ ] Can decline invitation
- [ ] "View Invitations" shows sent invitations
- [ ] Invalid emails rejected
- [ ] Invalid tokens show error
- [ ] Notification works when invitation accepted
- [ ] Works on AWS deployment

---

## Success Criteria

✅ **All 12 tests pass**  
✅ **No console errors**  
✅ **Backend logs show correct flow**  
✅ **Links work on both localhost and AWS**  
✅ **Email validation works**  
✅ **Notifications delivered**  

---

## Next Steps After Testing

1. **Add email sending** - Integrate AWS SES
2. **Add persistence** - Store invitations in database
3. **Add rate limiting** - Prevent spam
4. **Add invitation history** - Track all invitations
5. **Add custom messages** - Let users add personal note

# 1-to-1 Audio/Video Call Feature Design

## Overview
Implement peer-to-peer audio and video calling using WebRTC with Socket.IO signaling.

## Architecture

### Technology Stack
- **WebRTC**: Peer-to-peer media streaming
- **Socket.IO**: Signaling server for connection setup
- **STUN/TURN**: NAT traversal (Google's free STUN servers)
- **React**: UI components
- **Material-UI**: Call interface

---

## 1. Backend Changes

### 1.1 Call Signaling Events
**File**: `backend/src/app.gateway.ts`

Add WebRTC signaling handlers:

```typescript
// Call interfaces
interface CallOffer {
  to: string;
  offer: RTCSessionDescriptionInit;
  callType: 'audio' | 'video';
}

interface CallAnswer {
  to: string;
  answer: RTCSessionDescriptionInit;
}

interface IceCandidate {
  to: string;
  candidate: RTCIceCandidateInit;
}

// Signaling handlers
@SubscribeMessage('callOffer')
handleCallOffer(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: CallOffer,
): void {
  const caller = this.users.get(client.id);
  const recipient = this.users.get(data.to);

  if (!caller || !recipient) {
    client.emit('callError', { message: 'User not found' });
    return;
  }

  this.logger.log(`${data.callType} call from ${caller.username} to ${recipient.username}`);

  this.server.to(data.to).emit('incomingCall', {
    from: client.id,
    fromUsername: caller.username,
    offer: data.offer,
    callType: data.callType,
  });
}

@SubscribeMessage('callAnswer')
handleCallAnswer(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: CallAnswer,
): void {
  this.server.to(data.to).emit('callAnswered', {
    from: client.id,
    answer: data.answer,
  });
}

@SubscribeMessage('iceCandidate')
handleIceCandidate(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: IceCandidate,
): void {
  this.server.to(data.to).emit('iceCandidate', {
    from: client.id,
    candidate: data.candidate,
  });
}

@SubscribeMessage('callReject')
handleCallReject(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { to: string },
): void {
  this.server.to(data.to).emit('callRejected', {
    from: client.id,
  });
}

@SubscribeMessage('callEnd')
handleCallEnd(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { to: string },
): void {
  this.server.to(data.to).emit('callEnded', {
    from: client.id,
  });
}
```

---

## 2. Frontend Changes

### 2.1 WebRTC Hook
**File**: `frontend/src/hooks/useWebRTC.ts`

```typescript
import { useRef, useCallback, useState } from 'react';
import { Socket } from 'socket.io-client';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const useWebRTC = (socket: Socket | null) => {
  const [callState, setCallState] = useState<'idle' | 'calling' | 'ringing' | 'connected'>('idle');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);

  const createPeerConnection = useCallback((recipientId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('iceCandidate', {
          to: recipientId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      remoteStream.current = event.streams[0];
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallState('connected');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        endCall();
      }
    };

    peerConnection.current = pc;
    return pc;
  }, [socket]);

  const startCall = useCallback(async (recipientId: string, type: 'audio' | 'video') => {
    try {
      setCallType(type);
      setCallState('calling');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });

      localStream.current = stream;
      const pc = createPeerConnection(recipientId);

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket?.emit('callOffer', {
        to: recipientId,
        offer,
        callType: type,
      });
    } catch (error) {
      console.error('Failed to start call:', error);
      endCall();
    }
  }, [socket, createPeerConnection]);

  const answerCall = useCallback(async (callerId: string, offer: RTCSessionDescriptionInit, type: 'audio' | 'video') => {
    try {
      setCallType(type);
      setCallState('connected');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });

      localStream.current = stream;
      const pc = createPeerConnection(callerId);

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket?.emit('callAnswer', {
        to: callerId,
        answer,
      });
    } catch (error) {
      console.error('Failed to answer call:', error);
      endCall();
    }
  }, [socket, createPeerConnection]);

  const endCall = useCallback(() => {
    localStream.current?.getTracks().forEach(track => track.stop());
    peerConnection.current?.close();
    
    localStream.current = null;
    remoteStream.current = null;
    peerConnection.current = null;
    setCallState('idle');
  }, []);

  const toggleMute = useCallback(() => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      return !audioTrack.enabled;
    }
    return false;
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return !videoTrack.enabled;
      }
    }
    return false;
  }, []);

  return {
    callState,
    callType,
    localStream: localStream.current,
    remoteStream: remoteStream.current,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleVideo,
    peerConnection: peerConnection.current,
  };
};
```

### 2.2 Call Manager Hook
**File**: `frontend/src/hooks/useCallManager.ts`

```typescript
import { useEffect, useState } from 'react';
import { useAppSelector } from '../store/hooks';
import { useWebRTC } from './useWebRTC';

export const useCallManager = () => {
  const socket = useAppSelector(state => state.socket.socket);
  const [incomingCall, setIncomingCall] = useState<{
    from: string;
    fromUsername: string;
    offer: RTCSessionDescriptionInit;
    callType: 'audio' | 'video';
  } | null>(null);

  const webRTC = useWebRTC(socket);

  useEffect(() => {
    if (!socket) return;

    socket.on('incomingCall', (data) => {
      setIncomingCall(data);
    });

    socket.on('callAnswered', async (data) => {
      if (webRTC.peerConnection) {
        await webRTC.peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
      }
    });

    socket.on('iceCandidate', async (data) => {
      if (webRTC.peerConnection) {
        await webRTC.peerConnection.addIceCandidate(
          new RTCIceCandidate(data.candidate)
        );
      }
    });

    socket.on('callRejected', () => {
      webRTC.endCall();
      alert('Call was rejected');
    });

    socket.on('callEnded', () => {
      webRTC.endCall();
    });

    return () => {
      socket.off('incomingCall');
      socket.off('callAnswered');
      socket.off('iceCandidate');
      socket.off('callRejected');
      socket.off('callEnded');
    };
  }, [socket, webRTC]);

  const acceptCall = () => {
    if (incomingCall) {
      webRTC.answerCall(incomingCall.from, incomingCall.offer, incomingCall.callType);
      setIncomingCall(null);
    }
  };

  const rejectCall = () => {
    if (incomingCall && socket) {
      socket.emit('callReject', { to: incomingCall.from });
      setIncomingCall(null);
    }
  };

  return {
    ...webRTC,
    incomingCall,
    acceptCall,
    rejectCall,
  };
};
```

### 2.3 Call UI Component
**File**: `frontend/src/components/CallWindow.tsx`

```typescript
import { Box, IconButton, Avatar, Typography, Paper } from '@mui/material';
import {
  CallEnd,
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
} from '@mui/icons-material';
import { useRef, useEffect, useState } from 'react';

interface CallWindowProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callState: 'calling' | 'ringing' | 'connected';
  callType: 'audio' | 'video';
  remoteUsername: string;
  onEndCall: () => void;
  onToggleMute: () => boolean;
  onToggleVideo: () => boolean;
}

export default function CallWindow({
  localStream,
  remoteStream,
  callState,
  callType,
  remoteUsername,
  onEndCall,
  onToggleMute,
  onToggleVideo,
}: CallWindowProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <Paper
      sx={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: callType === 'video' ? '80vw' : '400px',
        height: callType === 'video' ? '80vh' : '300px',
        zIndex: 9999,
        background: '#1a1a1a',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Remote Video/Audio */}
      <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
        {callType === 'video' ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 2,
            }}
          >
            <Avatar sx={{ width: 100, height: 100, bgcolor: '#667eea' }}>
              {remoteUsername[0].toUpperCase()}
            </Avatar>
            <Typography variant="h5" color="white">
              {remoteUsername}
            </Typography>
            <Typography variant="body2" color="grey.400">
              {callState === 'calling' ? 'Calling...' : 
               callState === 'ringing' ? 'Ringing...' : 'Connected'}
            </Typography>
          </Box>
        )}

        {/* Local Video (Picture-in-Picture) */}
        {callType === 'video' && (
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 200,
              height: 150,
              borderRadius: 2,
              overflow: 'hidden',
              border: '2px solid white',
            }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Box>
        )}

        {/* Controls */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 2,
            p: 3,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
          }}
        >
          <IconButton
            onClick={() => setIsMuted(onToggleMute())}
            sx={{
              bgcolor: isMuted ? '#f44336' : 'rgba(255,255,255,0.2)',
              color: 'white',
              '&:hover': { bgcolor: isMuted ? '#d32f2f' : 'rgba(255,255,255,0.3)' },
            }}
          >
            {isMuted ? <MicOff /> : <Mic />}
          </IconButton>

          {callType === 'video' && (
            <IconButton
              onClick={() => setIsVideoOff(onToggleVideo())}
              sx={{
                bgcolor: isVideoOff ? '#f44336' : 'rgba(255,255,255,0.2)',
                color: 'white',
                '&:hover': { bgcolor: isVideoOff ? '#d32f2f' : 'rgba(255,255,255,0.3)' },
              }}
            >
              {isVideoOff ? <VideocamOff /> : <Videocam />}
            </IconButton>
          )}

          <IconButton
            onClick={onEndCall}
            sx={{
              bgcolor: '#f44336',
              color: 'white',
              '&:hover': { bgcolor: '#d32f2f' },
            }}
          >
            <CallEnd />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
}
```

### 2.4 Incoming Call Dialog
**File**: `frontend/src/components/IncomingCallDialog.tsx`

```typescript
import { Dialog, DialogContent, Box, Typography, Button, Avatar } from '@mui/material';
import { Call, CallEnd } from '@mui/icons-material';

interface IncomingCallDialogProps {
  open: boolean;
  callerUsername: string;
  callType: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallDialog({
  open,
  callerUsername,
  callType,
  onAccept,
  onReject,
}: IncomingCallDialogProps) {
  return (
    <Dialog open={open} maxWidth="xs" fullWidth>
      <DialogContent>
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Avatar sx={{ width: 80, height: 80, margin: '0 auto', bgcolor: '#667eea' }}>
            {callerUsername[0].toUpperCase()}
          </Avatar>
          <Typography variant="h6" sx={{ mt: 2 }}>
            {callerUsername}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Incoming {callType} call...
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mt: 4, justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="error"
              startIcon={<CallEnd />}
              onClick={onReject}
              sx={{ borderRadius: 10, px: 4 }}
            >
              Decline
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<Call />}
              onClick={onAccept}
              sx={{ borderRadius: 10, px: 4 }}
            >
              Accept
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
```

### 2.5 Add Call Buttons to Chat
**File**: `frontend/src/components/Chat.tsx`

```typescript
import { IconButton } from '@mui/material';
import { Call, Videocam } from '@mui/icons-material';
import { useCallManager } from '../hooks/useCallManager';
import CallWindow from './CallWindow';
import IncomingCallDialog from './IncomingCallDialog';

// In Chat component
const callManager = useCallManager();

// Add to header
<IconButton onClick={() => callManager.startCall(selectedUserId, 'audio')}>
  <Call />
</IconButton>
<IconButton onClick={() => callManager.startCall(selectedUserId, 'video')}>
  <Videocam />
</IconButton>

// Add to component
{callManager.callState !== 'idle' && (
  <CallWindow
    localStream={callManager.localStream}
    remoteStream={callManager.remoteStream}
    callState={callManager.callState}
    callType={callManager.callType}
    remoteUsername={activeChat}
    onEndCall={callManager.endCall}
    onToggleMute={callManager.toggleMute}
    onToggleVideo={callManager.toggleVideo}
  />
)}

{callManager.incomingCall && (
  <IncomingCallDialog
    open={true}
    callerUsername={callManager.incomingCall.fromUsername}
    callType={callManager.incomingCall.callType}
    onAccept={callManager.acceptCall}
    onReject={callManager.rejectCall}
  />
)}
```

---

## 3. Implementation Checklist

### Backend
- [ ] Add call signaling events to gateway
- [ ] Test signaling flow

### Frontend
- [ ] Create `useWebRTC` hook
- [ ] Create `useCallManager` hook
- [ ] Create `CallWindow` component
- [ ] Create `IncomingCallDialog` component
- [ ] Add call buttons to Chat
- [ ] Request camera/microphone permissions
- [ ] Test audio calls
- [ ] Test video calls
- [ ] Test call rejection
- [ ] Test call ending

---

## 4. Browser Permissions

Users must grant microphone/camera access:

```typescript
// Check permissions before calling
const checkPermissions = async (type: 'audio' | 'video') => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video',
    });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    alert('Please grant camera/microphone permissions');
    return false;
  }
};
```

---

## 5. Production Considerations

### TURN Server (Required for NAT traversal)
Free STUN works for ~80% of connections. For production, add TURN:

```typescript
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'username',
      credential: 'password',
    },
  ],
};
```

**TURN Server Options**:
- **Twilio TURN**: Pay-as-you-go
- **Xirsys**: Free tier available
- **Self-hosted**: coturn (open source)

### Call Quality
- Monitor connection quality
- Implement reconnection logic
- Add network quality indicators

### Security
- HTTPS required for getUserMedia
- Validate all signaling messages
- Rate limit call attempts

---

## 6. Estimated Effort

- **Backend**: 1-2 hours
- **Frontend**: 4-6 hours
- **Testing**: 2-3 hours
- **Total**: 8-12 hours

---

## 7. Future Enhancements

- [ ] Group calls (3+ participants)
- [ ] Screen sharing
- [ ] Call history/logs
- [ ] Call recording
- [ ] Background blur/virtual backgrounds
- [ ] Noise cancellation
- [ ] Call quality metrics

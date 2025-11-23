# Image Messaging Feature Design

## Overview
Add support for sending images in private messages with proper storage, delivery, and display.

## Architecture Changes

### 1. Backend Changes

#### 1.1 File Upload Service
**File**: `backend/src/upload/upload.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly logger = new Logger('UploadService');
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'images');
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  async onModuleInit() {
    // Create upload directory if it doesn't exist
    await fs.mkdir(this.uploadDir, { recursive: true });
  }

  async saveImage(buffer: Buffer, originalName: string, mimeType: string): Promise<string> {
    // Validate file size
    if (buffer.length > this.maxFileSize) {
      throw new Error('File size exceeds 5MB limit');
    }

    // Validate mime type
    if (!this.allowedMimeTypes.includes(mimeType)) {
      throw new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed');
    }

    // Generate unique filename
    const ext = path.extname(originalName);
    const filename = `${uuidv4()}${ext}`;
    const filepath = path.join(this.uploadDir, filename);

    // Save file
    await fs.writeFile(filepath, buffer);
    this.logger.log(`Image saved: ${filename}`);

    return filename;
  }

  async getImage(filename: string): Promise<Buffer> {
    const filepath = path.join(this.uploadDir, filename);
    return fs.readFile(filepath);
  }

  async deleteImage(filename: string): Promise<void> {
    const filepath = path.join(this.uploadDir, filename);
    await fs.unlink(filepath);
    this.logger.log(`Image deleted: ${filename}`);
  }
}
```

#### 1.2 Upload Controller
**File**: `backend/src/upload/upload.controller.ts`

```typescript
import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    try {
      const filename = await this.uploadService.saveImage(
        file.buffer,
        file.originalname,
        file.mimetype,
      );

      return {
        success: true,
        filename,
        url: `/upload/image/${filename}`,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get('image/:filename')
  async getImage(@Param('filename') filename: string, @Res() res: Response) {
    try {
      const image = await this.uploadService.getImage(filename);
      const ext = filename.split('.').pop()?.toLowerCase();
      
      const mimeTypes = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
      };

      res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.send(image);
    } catch (error) {
      res.status(HttpStatus.NOT_FOUND).json({ message: 'Image not found' });
    }
  }
}
```

#### 1.3 Update Message Interface
**File**: `backend/src/app.gateway.ts`

```typescript
interface MessagePayload {
  to: string;
  message?: string;
  image?: {
    filename: string;
    url: string;
    size: number;
  };
  messageType: 'text' | 'image';
}
```

#### 1.4 Update Gateway Handler
**File**: `backend/src/app.gateway.ts`

```typescript
@SubscribeMessage('privateMessage')
handlePrivateMessage(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: MessagePayload,
): void {
  const sender = this.users.get(client.id);
  const recipientSocketId = data.to;
  const recipient = this.users.get(recipientSocketId);

  if (!sender) {
    client.emit('error', { message: 'Not authenticated' });
    return;
  }

  if (!recipient) {
    client.emit('error', { message: 'Recipient not found' });
    return;
  }

  const messageData = {
    sender: sender.username,
    recipient: recipient.username,
    message: data.message || '',
    image: data.image,
    messageType: data.messageType,
    timestamp: new Date(),
    isPrivate: true,
    fromId: client.id,
    toId: recipientSocketId,
  };

  // Send to recipient
  this.server.to(recipientSocketId).emit('msgToClient', messageData);

  // Send back to sender (for confirmation)
  client.emit('msgToClient', messageData);

  // Persist message
  this.messageService.saveMessage(
    sender.username,
    recipient.username,
    data.message || '',
    data.image,
    data.messageType,
  );

  this.logger.log(
    `Private ${data.messageType} from ${sender.username} to ${recipient.username}`,
  );
}
```

#### 1.5 Update Message Service
**File**: `backend/src/database/message.service.ts`

```typescript
export interface StoredMessage {
  sender: string;
  recipient: string;
  message: string;
  image?: {
    filename: string;
    url: string;
    size: number;
  };
  messageType: 'text' | 'image';
  timestamp: Date;
}

saveMessage(
  sender: string,
  recipient: string,
  message: string,
  image?: { filename: string; url: string; size: number },
  messageType: 'text' | 'image' = 'text',
): void {
  // ... existing code with added image and messageType fields
}
```

#### 1.6 Install Dependencies
```bash
cd backend
npm install multer @types/multer uuid @types/uuid
```

#### 1.7 Update App Module
**File**: `backend/src/app.module.ts`

```typescript
import { UploadService } from './upload/upload.service';
import { UploadController } from './upload/upload.controller';

@Module({
  imports: [AuthModule],
  controllers: [AppController, InvitationController, UploadController],
  providers: [AppService, AppGateway, MessageService, InvitationService, UploadService],
})
export class AppModule {}
```

#### 1.8 Serve Static Files
**File**: `backend/src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Serve uploaded images
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  
  // ... rest of configuration
}
```

---

### 2. Frontend Changes

#### 2.1 Update Message Interface
**File**: `frontend/src/store/slices/chatSlice.ts`

```typescript
export interface Message {
  sender: string;
  recipient?: string;
  message: string;
  image?: {
    filename: string;
    url: string;
    size: number;
  };
  messageType: 'text' | 'image';
  timestamp: string;
  isPrivate?: boolean;
  fromId?: string;
  toId?: string;
}
```

#### 2.2 Image Upload Component
**File**: `frontend/src/components/ImageUpload.tsx`

```typescript
import { useState } from 'react';
import { IconButton, CircularProgress, Box } from '@mui/material';
import { Image as ImageIcon } from '@mui/icons-material';

interface ImageUploadProps {
  onImageSelected: (imageData: { filename: string; url: string; size: number }) => void;
  disabled?: boolean;
}

export default function ImageUpload({ onImageSelected, disabled }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/upload/image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        onImageSelected({
          filename: data.filename,
          url: data.url,
          size: file.size,
        });
      } else {
        alert(data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
      event.target.value = ''; // Reset input
    }
  };

  return (
    <Box>
      <input
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        id="image-upload"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
      />
      <label htmlFor="image-upload">
        <IconButton component="span" disabled={disabled || uploading}>
          {uploading ? <CircularProgress size={24} /> : <ImageIcon />}
        </IconButton>
      </label>
    </Box>
  );
}
```

#### 2.3 Update Chat Component
**File**: `frontend/src/components/Chat.tsx`

Add image upload button and handle image messages:

```typescript
import ImageUpload from './ImageUpload';

// In the message input area
<ImageUpload
  onImageSelected={(imageData) => {
    socket?.emit('privateMessage', {
      to: selectedUserId,
      image: imageData,
      messageType: 'image',
    });
  }}
  disabled={!activeChat}
/>
```

#### 2.4 Message Display Component
**File**: `frontend/src/components/MessageBubble.tsx`

```typescript
interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
}

export default function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
  
  return (
    <Box sx={{ /* existing styles */ }}>
      {message.messageType === 'image' && message.image ? (
        <Box>
          <img
            src={`${backendUrl}${message.image.url}`}
            alt="Shared image"
            style={{
              maxWidth: '300px',
              maxHeight: '300px',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
            onClick={() => window.open(`${backendUrl}${message.image.url}`, '_blank')}
          />
          {message.message && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {message.message}
            </Typography>
          )}
        </Box>
      ) : (
        <Typography variant="body2">{message.message}</Typography>
      )}
      <Typography variant="caption" sx={{ /* timestamp styles */ }}>
        {new Date(message.timestamp).toLocaleTimeString()}
      </Typography>
    </Box>
  );
}
```

---

### 3. Database Considerations (Future)

When migrating to a real database:

- **Store image metadata** in messages table
- **Use S3/CloudFront** for production image storage
- **Add image optimization** (resize, compress)
- **Implement cleanup** for deleted messages

---

### 4. Security Considerations

1. **File validation**: Check file type, size, and content
2. **Authentication**: Require JWT for uploads
3. **Rate limiting**: Prevent abuse
4. **Virus scanning**: Consider ClamAV for production
5. **Content moderation**: Consider image moderation APIs
6. **HTTPS**: Always use HTTPS in production

---

### 5. AWS S3 Integration (Production)

For production, replace local file storage with S3:

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class UploadService {
  private s3Client: S3Client;
  private bucketName = process.env.S3_BUCKET_NAME;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  async saveImage(buffer: Buffer, originalName: string, mimeType: string): Promise<string> {
    const filename = `${uuidv4()}${path.extname(originalName)}`;
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: `images/${filename}`,
      Body: buffer,
      ContentType: mimeType,
    });

    await this.s3Client.send(command);
    return filename;
  }

  async getImageUrl(filename: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: `images/${filename}`,
    });

    // Generate presigned URL (valid for 1 hour)
    return getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }
}
```

---

### 6. Implementation Steps

1. **Backend**:
   - [ ] Create `UploadService` and `UploadController`
   - [ ] Install dependencies (`multer`, `uuid`)
   - [ ] Update message interfaces
   - [ ] Update gateway handler
   - [ ] Update message service
   - [ ] Configure static file serving

2. **Frontend**:
   - [ ] Create `ImageUpload` component
   - [ ] Create `MessageBubble` component
   - [ ] Update message interface
   - [ ] Update Chat component
   - [ ] Handle image display in message list

3. **Testing**:
   - [ ] Test image upload
   - [ ] Test image display
   - [ ] Test file size limits
   - [ ] Test file type validation
   - [ ] Test persistence across sessions

4. **Production**:
   - [ ] Migrate to S3 storage
   - [ ] Add CloudFront CDN
   - [ ] Implement image optimization
   - [ ] Add cleanup for deleted messages

---

### 7. Estimated File Sizes

- **Backend changes**: ~500 lines
- **Frontend changes**: ~300 lines
- **Total effort**: 4-6 hours

---

### 8. Alternative: Base64 Encoding (Simple but not recommended)

For a quick prototype without file uploads:

```typescript
// Frontend: Convert image to base64
const reader = new FileReader();
reader.onload = () => {
  socket.emit('privateMessage', {
    to: userId,
    message: reader.result, // base64 string
    messageType: 'image',
  });
};
reader.readAsDataURL(file);

// Display: <img src={message.message} />
```

**Cons**: Large payload size, poor performance, not scalable.

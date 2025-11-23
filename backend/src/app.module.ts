import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppGateway } from './app.gateway';
import { MessageService } from './database/message.service';
import { InvitationService } from './database/invitation.service';
import { InvitationController } from './invitation.controller';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AppController, InvitationController],
  providers: [AppService, AppGateway, MessageService, InvitationService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppGateway } from './app.gateway';
import { MessageService } from './database/message.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, AppGateway, MessageService],
})
export class AppModule {}

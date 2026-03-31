import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DashboardSseService } from './dashboard-sse.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [ConfigModule],
  controllers: [DashboardController],
  providers: [DashboardSseService],
  exports: [DashboardSseService],
})
export class DashboardModule {}

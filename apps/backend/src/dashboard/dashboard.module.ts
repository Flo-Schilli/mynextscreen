import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from '../user/user.module';
import { DashboardSseService } from './dashboard-sse.service';
import { DashboardSummaryService } from './dashboard-summary.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [ConfigModule, UserModule],
  controllers: [DashboardController],
  providers: [DashboardSseService, DashboardSummaryService],
  exports: [DashboardSseService, DashboardSummaryService],
})
export class DashboardModule {}

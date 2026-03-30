import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DashboardGateway } from './dashboard.gateway';

@Module({
  imports: [ConfigModule],
  providers: [DashboardGateway],
  exports: [DashboardGateway],
})
export class DashboardModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditEntry } from './audit-entry.entity';
import { AuditLogService } from './audit-log.service';
import { AuditListener } from './audit.listener';
import {
  AuditLogController,
  AdminAuditLogController,
} from './audit-log.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AuditEntry])],
  controllers: [AuditLogController, AdminAuditLogController],
  providers: [AuditLogService, AuditListener],
  exports: [AuditLogService, TypeOrmModule],
})
export class AuditLogModule {}

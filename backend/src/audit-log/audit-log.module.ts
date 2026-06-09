import { Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditListener } from './audit.listener';
import { AuditLogController, AdminAuditLogController } from './audit-log.controller';

@Module({
  controllers: [AuditLogController, AdminAuditLogController],
  providers: [AuditLogService, AuditListener],
  exports: [AuditLogService],
})
export class AuditLogModule {}

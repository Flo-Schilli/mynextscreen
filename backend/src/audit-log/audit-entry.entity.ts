import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Organisation } from '../organisation/organisation.entity';
import { AuditAction } from './audit-action.enum';

@Entity('audit_entries')
export class AuditEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'datetime', default: () => "datetime('now')" })
  timestamp!: Date;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsUUID()
  userId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  organisationId!: string | null;

  @ManyToOne(() => Organisation, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'organisationId' })
  organisation!: Organisation | null;

  @Column({ type: 'varchar' })
  @IsEnum(AuditAction)
  action!: AuditAction;

  @Column({ type: 'varchar' })
  @IsString()
  resourceType!: string;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsUUID()
  resourceId!: string | null;

  @Column({ type: 'simple-json', nullable: true })
  @IsOptional()
  details!: Record<string, unknown> | null;
}

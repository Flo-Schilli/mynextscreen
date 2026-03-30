import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import {
  IsNotEmpty,
  IsUUID,
  IsBoolean,
  IsOptional,
  IsString,
  IsInt,
} from 'class-validator';
import { Organisation } from '../organisation/organisation.entity';

@Entity('organisation_notification_configs')
@Unique('UQ_org_notification_config_org', ['organisationId'])
export class OrganisationNotificationConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: false })
  @IsNotEmpty()
  @IsUUID()
  organisationId!: string;

  // SMTP settings
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  smtpHost!: string | null;

  @Column({ type: 'integer', nullable: true })
  @IsOptional()
  @IsInt()
  smtpPort!: number | null;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  smtpUser!: string | null;

  // TODO: Production deployments should use column-level encryption or a secrets manager
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  smtpPassword!: string | null;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  smtpFrom!: string | null;

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  smtpSecure!: boolean;

  // ntfy settings
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  ntfyUrl!: string | null;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  ntfyTopic!: string | null;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  ntfyToken!: string | null;

  @ManyToOne(() => Organisation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organisationId' })
  organisation!: Organisation;
}

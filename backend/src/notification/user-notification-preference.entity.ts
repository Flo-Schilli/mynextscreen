import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { IsNotEmpty, IsUUID, IsBoolean } from 'class-validator';
import { User } from '../user/user.entity';
import { Organisation } from '../organisation/organisation.entity';

@Entity('user_notification_preferences')
@Unique('UQ_user_notification_pref_user_org', ['userId', 'organisationId'])
export class UserNotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: false })
  @IsNotEmpty()
  @IsUUID()
  userId!: string;

  @Column({ type: 'varchar', nullable: false })
  @IsNotEmpty()
  @IsUUID()
  organisationId!: string;

  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  inAppEnabled!: boolean;

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  emailEnabled!: boolean;

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  ntfyEnabled!: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Organisation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organisationId' })
  organisation!: Organisation;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IsNotEmpty, IsString, IsBoolean, IsEnum } from 'class-validator';
import { User } from '../user/user.entity';
import { Organisation } from '../organisation/organisation.entity';
import { NotificationEventType } from './notification-event-type.enum';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: false })
  @IsNotEmpty()
  @IsString()
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'varchar', nullable: false })
  @IsNotEmpty()
  @IsString()
  organisationId!: string;

  @ManyToOne(() => Organisation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organisationId' })
  organisation!: Organisation;

  @Column({ type: 'varchar', nullable: false })
  @IsNotEmpty()
  @IsEnum(NotificationEventType)
  eventType!: NotificationEventType;

  @Column({ type: 'varchar', nullable: false })
  @IsNotEmpty()
  @IsString()
  title!: string;

  @Column({ type: 'varchar', nullable: false })
  @IsNotEmpty()
  @IsString()
  message!: string;

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  read!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IsNotEmpty, IsString, IsEnum, IsBoolean } from 'class-validator';
import { Organisation } from '../organisation/organisation.entity';
import { LiveStreamProtocol } from './live-stream-protocol.enum';
import { LiveStreamStatus } from './live-stream-status.enum';
import { TranscodingPreset } from './transcoding-preset.enum';

@Entity('live_streams')
export class LiveStream {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: false })
  @IsNotEmpty()
  @IsString()
  organisationId!: string;

  @ManyToOne(() => Organisation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organisationId' })
  organisation!: Organisation;

  @Column({ type: 'varchar', nullable: false })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @Column({ type: 'varchar', nullable: false })
  @IsNotEmpty()
  @IsString()
  sourceUrl!: string;

  @Column({ type: 'varchar', default: LiveStreamProtocol.Rtmp })
  @IsEnum(LiveStreamProtocol)
  protocol!: LiveStreamProtocol;

  @Column({ type: 'varchar', default: LiveStreamStatus.Idle })
  @IsEnum(LiveStreamStatus)
  status!: LiveStreamStatus;

  @Column({ type: 'varchar', default: TranscodingPreset.High1080p })
  @IsEnum(TranscodingPreset)
  transcodingPreset!: TranscodingPreset;

  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  audioEnabled!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

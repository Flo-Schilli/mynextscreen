import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { LiveStream } from './live-stream.entity';

@Entity('live_stream_activations')
@Unique('UQ_live_stream_activation_screen', ['screenId'])
export class LiveStreamActivation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: false })
  streamId!: string;

  @ManyToOne(() => LiveStream, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'streamId' })
  stream!: LiveStream;

  @Column({ type: 'varchar', nullable: false })
  screenId!: string;

  @CreateDateColumn()
  activatedAt!: Date;
}

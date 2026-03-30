import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IsNotEmpty, IsString, IsOptional, Matches } from 'class-validator';
import { Organisation } from '../organisation/organisation.entity';
import { Screen } from '../screen/screen.entity';
import { Playlist } from '../playlist/playlist.entity';

@Entity('schedule_entries')
export class ScheduleEntry {
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
  screenId!: string;

  @ManyToOne(() => Screen, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'screenId' })
  screen!: Screen;

  @Column({ type: 'varchar', nullable: false })
  @IsNotEmpty()
  @IsString()
  playlistId!: string;

  @ManyToOne(() => Playlist, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playlistId' })
  playlist!: Playlist;

  @Column({ type: 'datetime', nullable: false })
  startTime!: Date;

  @Column({ type: 'datetime', nullable: false })
  endTime!: Date;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  rrule!: string | null;

  @Column({ type: 'varchar', nullable: false })
  @IsNotEmpty()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'colour must be a hex colour (e.g. #FF5733)',
  })
  colour!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

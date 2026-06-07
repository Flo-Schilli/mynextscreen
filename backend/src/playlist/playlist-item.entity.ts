import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { IsNotEmpty, IsString, IsInt, IsEnum, Min, Max } from 'class-validator';
import { Playlist } from './playlist.entity';
import { Content } from '../content/content.entity';
import { TransitionType } from './transition-type.enum';

@Entity('playlist_items')
export class PlaylistItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: false })
  @IsNotEmpty()
  @IsString()
  playlistId!: string;

  @ManyToOne(() => Playlist, (playlist) => playlist.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'playlistId' })
  playlist!: Playlist;

  @Column({ type: 'varchar', nullable: false })
  @IsNotEmpty()
  @IsString()
  contentId!: string;

  @ManyToOne(() => Content, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contentId' })
  content!: Content;

  @Column({ type: 'integer' })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  position!: number;

  @Column({ type: 'integer' })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  durationSeconds!: number;

  @Column({ type: 'varchar', default: TransitionType.Fade })
  @IsEnum(TransitionType)
  transition!: TransitionType;

  @Column({ type: 'integer', default: 500 })
  @IsInt()
  @Min(0)
  @Max(3000)
  transitionDurationMs!: number;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';

@Entity('organisations')
export class Organisation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @Column({ type: 'varchar' })
  @IsNotEmpty()
  @IsString()
  timeZone!: string;

  @Column({ type: 'bigint', default: 0 })
  storageOriginalLimitBytes!: number;

  @Column({ type: 'bigint', default: 0 })
  storageTranscodedLimitBytes!: number;

  @Column({ type: 'bigint', default: 0 })
  storageOriginalUsedBytes!: number;

  @Column({ type: 'bigint', default: 0 })
  storageTranscodedUsedBytes!: number;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsUUID()
  defaultPlaylistId!: string | null;

  @ManyToOne('Playlist', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'defaultPlaylistId' })
  defaultPlaylist!: unknown;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

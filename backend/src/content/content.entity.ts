import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IsNotEmpty, IsString, IsOptional, IsEnum, IsArray, IsInt, Min } from 'class-validator';
import { Organisation } from '../organisation/organisation.entity';
import { ContentType } from './content-type.enum';
import { TranscodingStatus } from './transcoding-status.enum';

@Entity('contents')
export class Content {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: false })
  @IsNotEmpty()
  @IsString()
  organisationId!: string;

  @ManyToOne(() => Organisation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organisationId' })
  organisation!: Organisation;

  @Column({ type: 'varchar' })
  @IsNotEmpty()
  @IsString()
  title!: string;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  description!: string | null;

  @Column({ type: 'simple-json', default: '[]' })
  @IsArray()
  @IsString({ each: true })
  tags!: string[];

  @Column({ type: 'varchar' })
  @IsNotEmpty()
  @IsEnum(ContentType)
  type!: ContentType;

  @Column({ type: 'varchar' })
  @IsNotEmpty()
  @IsString()
  originalFilename!: string;

  @Column({ type: 'varchar' })
  @IsNotEmpty()
  @IsString()
  originalMimeType!: string;

  @Column({ type: 'bigint' })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  originalSizeBytes!: number;

  @Column({ type: 'bigint', nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  transcodedSizeBytes!: number | null;

  @Column({ type: 'integer', nullable: true, default: null })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds!: number | null;

  @Column({ type: 'varchar', default: TranscodingStatus.Pending })
  @IsEnum(TranscodingStatus)
  transcodingStatus!: TranscodingStatus;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  transcodingError!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

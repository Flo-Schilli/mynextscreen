import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { Organisation } from '../organisation/organisation.entity';
import { ScreenGroup } from '../screen-group/screen-group.entity';

@Entity('screens')
export class Screen {
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
  name!: string;

  @Column({ type: 'varchar' })
  @IsNotEmpty()
  @IsString()
  resolution!: string;

  @Column({ type: 'varchar' })
  @IsNotEmpty()
  @IsString()
  location!: string;

  @Column({ type: 'varchar' })
  @IsNotEmpty()
  @IsString()
  apiKeyHash!: string;

  @Column({ type: 'datetime', nullable: true })
  @IsOptional()
  lastHeartbeat!: Date | null;

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isOnline!: boolean;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  groupId!: string | null;

  @ManyToOne(() => ScreenGroup, (group) => group.screens, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'groupId' })
  group!: ScreenGroup | null;

  @Column({ type: 'integer', nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  gridRow!: number | null;

  @Column({ type: 'integer', nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  gridColumn!: number | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';
import { Organisation } from '../organisation/organisation.entity';
import { Screen } from '../screen/screen.entity';
import { ScreenGroupMode } from './screen-group-mode.enum';

@Entity('screen_groups')
export class ScreenGroup {
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

  @Column({ type: 'varchar', nullable: false, default: ScreenGroupMode.Mirror })
  @IsEnum(ScreenGroupMode)
  mode!: ScreenGroupMode;

  @Column({ type: 'integer', nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  gridColumns!: number | null;

  @Column({ type: 'integer', nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  gridRows!: number | null;

  @OneToMany(() => Screen, (screen) => screen.group)
  screens!: Screen[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

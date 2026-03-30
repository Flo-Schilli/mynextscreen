import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IsNotEmpty, IsString } from 'class-validator';
import { Organisation } from '../organisation/organisation.entity';
import { ScreenGroup } from '../screen-group/screen-group.entity';
import { Screen } from '../screen/screen.entity';
import { Content } from '../content/content.entity';

@Entity('sliced_renditions')
export class SlicedRendition {
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
  groupId!: string;

  @ManyToOne(() => ScreenGroup, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group!: ScreenGroup;

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
  contentItemId!: string;

  @ManyToOne(() => Content, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contentItemId' })
  content!: Content;

  @Column({ type: 'varchar', nullable: false })
  @IsNotEmpty()
  @IsString()
  filePath!: string;

  @Column({ type: 'varchar', nullable: false })
  @IsNotEmpty()
  @IsString()
  sourceHash!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

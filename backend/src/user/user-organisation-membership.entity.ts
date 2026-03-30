import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { User } from './user.entity';
import { Organisation } from '../organisation/organisation.entity';
import { OrganisationRole } from './organisation-role.enum';

@Entity('user_organisation_memberships')
@Unique('UQ_user_organisation', ['userId', 'organisationId'])
export class UserOrganisationMembership {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  @IsNotEmpty()
  @IsUUID()
  userId!: string;

  @Column({ type: 'varchar' })
  @IsNotEmpty()
  @IsUUID()
  organisationId!: string;

  @Column({ type: 'varchar' })
  @IsNotEmpty()
  @IsEnum(OrganisationRole)
  role!: OrganisationRole;

  @ManyToOne(() => User, (u) => u.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Organisation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organisationId' })
  organisation!: Organisation;

  @CreateDateColumn()
  createdAt!: Date;
}

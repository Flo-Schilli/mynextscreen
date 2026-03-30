import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserOrganisationMembership } from './user-organisation-membership.entity';

@Entity('users')
export class User {
  /** Maps to Hanko user ID — not auto-generated. */
  @PrimaryColumn({ type: 'varchar' })
  @IsNotEmpty()
  @IsString()
  id!: string;

  @Column({ type: 'varchar' })
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  name!: string | null;

  @OneToMany(() => UserOrganisationMembership, (m) => m.user)
  memberships!: UserOrganisationMembership[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

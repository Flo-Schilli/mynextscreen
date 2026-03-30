import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserOrganisationMembership } from './user-organisation-membership.entity';
import { UserService } from './user.service';
import { MembershipService } from './membership.service';
import { MembershipController } from './membership.controller';
import { UserController } from './user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserOrganisationMembership])],
  controllers: [MembershipController, UserController],
  providers: [UserService, MembershipService],
  exports: [UserService, MembershipService, TypeOrmModule],
})
export class UserModule {}

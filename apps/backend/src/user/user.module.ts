import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { MembershipService } from './membership.service';
import { MembershipController } from './membership.controller';
import { UserController } from './user.controller';

@Module({
  controllers: [MembershipController, UserController],
  providers: [UserService, MembershipService],
  exports: [UserService, MembershipService],
})
export class UserModule {}

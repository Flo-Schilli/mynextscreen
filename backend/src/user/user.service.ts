import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UserOrganisationMembership } from './user-organisation-membership.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserOrganisationMembership)
    private readonly membershipRepository: Repository<UserOrganisationMembership>,
  ) {}

  /**
   * Upserts a user on first login from Hanko JWT claims.
   * If the user already exists, updates email (in case it changed in Hanko).
   */
  async findOrCreate(userId: string, email: string): Promise<User> {
    const existing = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (existing) {
      if (existing.email !== email) {
        existing.email = email;
        return this.userRepository.save(existing);
      }
      return existing;
    }
    const user = this.userRepository.create({ id: userId, email, name: null });
    return this.userRepository.save(user);
  }

  async getMemberships(userId: string): Promise<UserOrganisationMembership[]> {
    return this.membershipRepository.find({
      where: { userId },
      relations: ['organisation'],
    });
  }

  async getMembership(
    userId: string,
    organisationId: string,
  ): Promise<UserOrganisationMembership | null> {
    return this.membershipRepository.findOne({
      where: { userId, organisationId },
    });
  }
}

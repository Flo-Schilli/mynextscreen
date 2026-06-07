import { NotFoundException } from '@nestjs/common';
import { Repository, FindOptionsWhere, DeepPartial } from 'typeorm';

/**
 * Interface that all organisation-scoped entities must implement.
 * Any entity that belongs to a tenant should have an `organisationId` column.
 */
export interface OrganisationScoped {
  id: string;
  organisationId: string;
}

/**
 * Base service class for organisation-scoped CRUD operations.
 *
 * Automatically applies `WHERE organisationId = :id` to all queries, ensuring
 * tenant isolation at the service layer. Extend this class instead of writing
 * manual scoping in every service.
 *
 * Usage:
 * ```ts
 * @Injectable()
 * export class ScreenService extends OrganisationScopedService<Screen> {
 *   constructor(
 *     @InjectRepository(Screen)
 *     repository: Repository<Screen>,
 *   ) {
 *     super(repository, 'Screen');
 *   }
 * }
 *
 * // In a controller:
 * @Get()
 * findAll(@CurrentOrganisation() organisationId: string) {
 *   return this.screenService.findAll(organisationId);
 * }
 * ```
 *
 * @template T - Entity type that implements OrganisationScoped
 */
export class OrganisationScopedService<T extends OrganisationScoped> {
  constructor(
    protected readonly repository: Repository<T>,
    protected readonly entityName: string,
  ) {}

  /**
   * Find all entities belonging to the given organisation.
   */
  async findAll(organisationId: string): Promise<T[]> {
    return this.repository.find({
      where: { organisationId } as FindOptionsWhere<T>,
    });
  }

  /**
   * Find a single entity by ID, scoped to the given organisation.
   * @throws NotFoundException if the entity does not exist within the organisation
   */
  async findOne(organisationId: string, id: string): Promise<T> {
    const entity = await this.repository.findOne({
      where: { organisationId, id } as FindOptionsWhere<T>,
    });

    if (!entity) {
      throw new NotFoundException(
        `${this.entityName} with id "${id}" not found in organisation "${organisationId}"`,
      );
    }

    return entity;
  }

  /**
   * Create a new entity, automatically setting the organisationId.
   */
  async create(organisationId: string, data: Omit<DeepPartial<T>, 'organisationId'>): Promise<T> {
    const entity = this.repository.create({
      ...data,
      organisationId,
    } as DeepPartial<T>);
    return this.repository.save(entity);
  }

  /**
   * Update an existing entity, scoped to the given organisation.
   * @throws NotFoundException if the entity does not exist within the organisation
   */
  async update(
    organisationId: string,
    id: string,
    data: Omit<DeepPartial<T>, 'organisationId' | 'id'>,
  ): Promise<T> {
    const entity = await this.findOne(organisationId, id);
    Object.assign(entity, data);
    return this.repository.save(entity);
  }

  /**
   * Remove an entity, scoped to the given organisation.
   * @throws NotFoundException if the entity does not exist within the organisation
   */
  async remove(organisationId: string, id: string): Promise<void> {
    const entity = await this.findOne(organisationId, id);
    await this.repository.remove(entity);
  }
}

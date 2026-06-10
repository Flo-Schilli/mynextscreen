import { NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { DrizzleDB } from '../db/drizzle.types';

/**
 * Interface that all organisation-scoped rows expose: an `id` and the tenant
 * `organisationId`. Any table that belongs to a tenant has both columns.
 */
export interface OrganisationScoped {
  id: string;
  organisationId: string;
}

/**
 * A Drizzle table exposing the `id` + `organisationId` columns every
 * tenant-scoped table has. Used to type the generic base service's table.
 */
export type ScopedTable = PgTable & {
  id: PgColumn;
  organisationId: PgColumn;
};

/**
 * Base service for organisation-scoped CRUD over Drizzle.
 *
 * Automatically applies `WHERE organisation_id = $1` to every query, enforcing
 * tenant isolation at the service layer. Subclasses extend this instead of
 * re-implementing scoping, and may use the protected `db` / `table` members for
 * domain-specific queries.
 *
 * Usage:
 * ```ts
 * @Injectable()
 * export class ScreenService extends OrganisationScopedService<Screen> {
 *   constructor(@Inject(DRIZZLE) db: DrizzleDB) {
 *     super(db, screens, 'Screen');
 *   }
 * }
 * ```
 *
 * @template T - Row type that implements {@link OrganisationScoped}
 */
export class OrganisationScopedService<T extends OrganisationScoped> {
  constructor(
    protected readonly db: DrizzleDB,
    protected readonly table: ScopedTable,
    protected readonly entityName: string,
  ) {}

  /** Find all rows belonging to the given organisation. */
  async findAll(organisationId: string): Promise<T[]> {
    const rows = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.organisationId, organisationId));
    return rows as T[];
  }

  /**
   * Find a single row by id, scoped to the given organisation.
   * @throws NotFoundException if it does not exist within the organisation
   */
  async findOne(organisationId: string, id: string): Promise<T> {
    const [row] = await this.db
      .select()
      .from(this.table)
      .where(and(eq(this.table.id, id), eq(this.table.organisationId, organisationId)))
      .limit(1);

    if (!row) {
      throw new NotFoundException(
        `${this.entityName} with id "${id}" not found in organisation "${organisationId}"`,
      );
    }

    return row as T;
  }

  /** Create a new row, automatically setting the organisationId. */
  async create(organisationId: string, data: Omit<Partial<T>, 'organisationId'>): Promise<T> {
    const [row] = await this.db
      .insert(this.table)
      .values({ ...data, organisationId } as Record<string, unknown>)
      .returning();
    return row as unknown as T;
  }

  /**
   * Update an existing row, scoped to the given organisation.
   * @throws NotFoundException if it does not exist within the organisation
   */
  async update(
    organisationId: string,
    id: string,
    data: Omit<Partial<T>, 'organisationId' | 'id'>,
  ): Promise<T> {
    await this.findOne(organisationId, id);
    const [row] = await this.db
      .update(this.table)
      .set(data as Record<string, unknown>)
      .where(and(eq(this.table.id, id), eq(this.table.organisationId, organisationId)))
      .returning();
    return row as unknown as T;
  }

  /**
   * Remove a row, scoped to the given organisation.
   * @throws NotFoundException if it does not exist within the organisation
   */
  async remove(organisationId: string, id: string): Promise<void> {
    await this.findOne(organisationId, id);
    await this.db
      .delete(this.table)
      .where(and(eq(this.table.id, id), eq(this.table.organisationId, organisationId)));
  }
}

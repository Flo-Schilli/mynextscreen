import { Repository, DeepPartial } from 'typeorm';
export interface OrganisationScoped {
    id: string;
    organisationId: string;
}
export declare class OrganisationScopedService<T extends OrganisationScoped> {
    protected readonly repository: Repository<T>;
    protected readonly entityName: string;
    constructor(repository: Repository<T>, entityName: string);
    findAll(organisationId: string): Promise<T[]>;
    findOne(organisationId: string, id: string): Promise<T>;
    create(organisationId: string, data: Omit<DeepPartial<T>, 'organisationId'>): Promise<T>;
    update(organisationId: string, id: string, data: Omit<DeepPartial<T>, 'organisationId' | 'id'>): Promise<T>;
    remove(organisationId: string, id: string): Promise<void>;
}

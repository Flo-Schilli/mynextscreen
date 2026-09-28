import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { OrgFromParam } from '../auth/org-from-param.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import { StorageService, StorageInfo } from './storage.service';

@Controller('organisations')
@OrgFromParam('orgId')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get(':orgId/storage')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer)
  getStorage(@Param('orgId', ParseUUIDPipe) orgId: string): Promise<StorageInfo> {
    return this.storageService.getStorageInfo(orgId);
  }
}

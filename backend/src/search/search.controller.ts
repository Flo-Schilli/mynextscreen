import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import { CurrentOrganisation } from '../organisation/current-organisation.decorator';
import { SearchService } from './search.service';
import { SearchResultsDto } from './dto/search-results.dto';
import { SearchQueryDto } from './dto/search-query.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Roles(
    OrganisationRole.OrgAdmin,
    OrganisationRole.Editor,
    OrganisationRole.Viewer,
  )
  search(
    @CurrentOrganisation() organisationId: string,
    @Query() query: SearchQueryDto,
  ): Promise<SearchResultsDto> {
    return this.searchService.search(query.q, organisationId);
  }
}

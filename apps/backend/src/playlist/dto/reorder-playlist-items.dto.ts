import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class ReorderPlaylistItemsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  itemIds!: string[];
}

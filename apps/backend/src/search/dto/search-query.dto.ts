import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SearchQueryDto {
  @IsString()
  @IsNotEmpty({ message: 'Query parameter "q" is required' })
  @MinLength(2, {
    message: 'Query must be at least 2 characters long',
  })
  q!: string;
}

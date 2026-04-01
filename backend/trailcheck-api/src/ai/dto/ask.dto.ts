import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AskDto {
  @IsString()
  @IsNotEmpty()
  parkSlug: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  question: string;
}

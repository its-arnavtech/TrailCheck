import { IsBoolean } from 'class-validator';

export class UpdateParkPreferenceDto {
  @IsBoolean()
  isFavorite!: boolean;

  @IsBoolean()
  wantsToGo!: boolean;
}

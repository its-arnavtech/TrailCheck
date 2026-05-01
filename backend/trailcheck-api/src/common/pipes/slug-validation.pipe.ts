import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class SlugValidationPipe implements PipeTransform {
  transform(value: unknown): string {
    const slug = String(value ?? '').trim().toLowerCase();

    if (!/^[a-z0-9-]{1,80}$/.test(slug)) {
      throw new BadRequestException('Invalid park slug.');
    }

    return slug;
  }
}

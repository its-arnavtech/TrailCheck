import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class SlugValidationPipe implements PipeTransform {
  transform(value: unknown): string {
    const raw =
      typeof value === 'string' || typeof value === 'number'
        ? String(value)
        : '';
    const slug = raw.trim().toLowerCase();

    if (!/^[a-z0-9-]{1,80}$/.test(slug)) {
      throw new BadRequestException('Invalid park slug.');
    }

    return slug;
  }
}

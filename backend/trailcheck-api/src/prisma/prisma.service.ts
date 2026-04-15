import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);
  private databaseAvailable = false;

  async onModuleInit() {
    try {
      await this.$connect();
      this.databaseAvailable = true;
    } catch (error) {
      this.databaseAvailable = false;
      this.logger.warn(
        `Starting without a database connection: ${
          error instanceof Error ? error.message : 'Unknown Prisma error'
        }`,
      );
    }
  }

  isAvailable() {
    return this.databaseAvailable;
  }

  requireConnection() {
    if (!this.databaseAvailable) {
      throw new ServiceUnavailableException(
        'Database is currently unavailable. Read-only park data is still available, but sign-in and saved data features are temporarily offline.',
      );
    }
  }
}

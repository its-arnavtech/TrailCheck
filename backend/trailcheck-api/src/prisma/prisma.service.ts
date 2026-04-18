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
  private connectInFlight: Promise<void> | null = null;
  private lastConnectionAttemptAt = 0;
  private readonly reconnectCooldownMs = 5_000;

  async onModuleInit() {
    await this.tryConnect('startup');
  }

  isAvailable() {
    return this.databaseAvailable;
  }

  async requireConnection() {
    if (this.databaseAvailable) {
      return;
    }

    await this.tryConnect('on-demand');

    if (this.databaseAvailable) {
      return;
    }

    throw new ServiceUnavailableException(
      'Database is currently unavailable. Read-only park data is still available, but sign-in and saved data features are temporarily offline.',
    );
  }

  private async tryConnect(reason: 'startup' | 'on-demand') {
    const now = Date.now();

    if (
      reason === 'on-demand' &&
      !this.connectInFlight &&
      now - this.lastConnectionAttemptAt < this.reconnectCooldownMs
    ) {
      return;
    }

    if (!this.connectInFlight) {
      this.lastConnectionAttemptAt = now;
      this.connectInFlight = this.$connect()
        .then(() => {
          const wasUnavailable = !this.databaseAvailable;
          this.databaseAvailable = true;

          if (wasUnavailable) {
            this.logger.log('Database connection is now available.');
          }
        })
        .catch((error) => {
          this.databaseAvailable = false;
          const message =
            error instanceof Error ? error.message : 'Unknown Prisma error';

          if (reason === 'startup') {
            this.logger.warn(`Starting without a database connection: ${message}`);
          } else {
            this.logger.warn(`Database reconnect attempt failed: ${message}`);
          }
        })
        .finally(() => {
          this.connectInFlight = null;
        });
    }

    await this.connectInFlight;
  }
}

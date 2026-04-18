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
  private userColumnCache: Set<string> | null = null;

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

  async findAuthUserByEmail(email: string) {
    const userColumns = await this.getUserColumns();

    if (userColumns.has('passwordVersion')) {
      return this.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          passwordVersion: true,
        },
      });
    }

    const rows = await this.$queryRaw<
      Array<{ id: number; email: string; password: string }>
    >`SELECT id, email, password FROM "User" WHERE email = ${email} LIMIT 1`;

    const user = rows[0];

    if (!user) {
      return null;
    }

    this.logger.warn(
      'Using legacy auth schema fallback without passwordVersion support.',
    );

    return {
      ...user,
      passwordVersion: 0,
    };
  }

  async findJwtUserById(id: number) {
    const userColumns = await this.getUserColumns();

    if (userColumns.has('passwordVersion')) {
      return this.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          passwordVersion: true,
        },
      });
    }

    const rows = await this.$queryRaw<Array<{ id: number; email: string }>>`
      SELECT id, email FROM "User" WHERE id = ${id} LIMIT 1
    `;

    const user = rows[0];

    if (!user) {
      return null;
    }

    this.logger.warn(
      'Using legacy JWT validation fallback without passwordVersion support.',
    );

    return {
      ...user,
      passwordVersion: 0,
    };
  }

  async supportsPasswordResetColumns() {
    const userColumns = await this.getUserColumns();
    return (
      userColumns.has('resetPasswordTokenHash') &&
      userColumns.has('resetPasswordExpiresAt')
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

  private async getUserColumns() {
    if (this.userColumnCache) {
      return this.userColumnCache;
    }

    const columns = await this.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'User'
    `;

    this.userColumnCache = new Set(columns.map((column) => column.column_name));
    return this.userColumnCache;
  }
}

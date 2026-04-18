import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create_report.dto';
import type { JwtUser } from '../auth/jwt.strategy';

const DAILY_REPORT_LIMIT = 2;
const DAILY_REPORT_LIMIT_MESSAGE =
  'You have reached the daily limit of 2 reports. Please try again tomorrow.';
const SERIALIZABLE_RETRY_LIMIT = 3;

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private prisma: PrismaService) {}

  async create(dto: CreateReportDto, user: JwtUser) {
    await this.prisma.requireConnection();

    for (let attempt = 1; attempt <= SERIALIZABLE_RETRY_LIMIT; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const { dayStart, nextDayStart } = this.getUtcDayRange();

            const reportsToday = await tx.trailReport.count({
              where: {
                userId: user.id,
                createdAt: {
                  gte: dayStart,
                  lt: nextDayStart,
                },
              },
            });

            if (reportsToday >= DAILY_REPORT_LIMIT) {
              this.logger.warn(
                `Daily report limit reached for user ${user.id}.`,
              );
              throw new HttpException(
                DAILY_REPORT_LIMIT_MESSAGE,
                HttpStatus.TOO_MANY_REQUESTS,
              );
            }

            return tx.trailReport.create({
              data: {
                trailId: dto.trailId,
                conditionRating: dto.conditionRating,
                surfaceCondition: dto.surfaceCondition,
                note: dto.note,
                reporterName: user.email,
                userId: user.id,
              },
            });
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          },
        );
      } catch (error) {
        if (
          error instanceof HttpException &&
          error.getStatus() === HttpStatus.TOO_MANY_REQUESTS
        ) {
          throw error;
        }

        if (this.isSerializableRetryableError(error)) {
          if (attempt === SERIALIZABLE_RETRY_LIMIT) {
            this.logger.warn(
              `Report submission serialization retries exhausted for user ${user.id}.`,
            );
            throw new HttpException(
              'We could not submit your report right now. Please try again in a moment.',
              HttpStatus.TOO_MANY_REQUESTS,
            );
          }

          continue;
        }

        throw error;
      }
    }
  }

  private getUtcDayRange(now = new Date()) {
    const dayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const nextDayStart = new Date(dayStart);
    nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);

    return {
      dayStart,
      nextDayStart,
    };
  }

  private isSerializableRetryableError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 'P2034'
    );
  }
}

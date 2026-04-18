import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: {
    requireConnection: jest.Mock;
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      requireConnection: jest.fn(),
      $transaction: jest.fn(),
    };

    service = new ReportsService(prisma as never);
  });

  function makeTransactionContext(count: number, createdId = 1) {
    return {
      trailReport: {
        count: jest.fn().mockResolvedValue(count),
        create: jest.fn().mockResolvedValue({
          id: createdId,
          trailId: 12,
          userId: 44,
        }),
      },
    };
  }

  it('allows a user with 0 reports today to submit', async () => {
    const tx = makeTransactionContext(0);
    prisma.$transaction.mockImplementation(async (callback: (txArg: typeof tx) => unknown) =>
      callback(tx),
    );

    const result = await service.create(
      {
        trailId: 12,
        conditionRating: 4,
        surfaceCondition: 'DRY',
        note: 'Looks good.',
      },
      { id: 44, email: 'hiker@gmail.com' },
    );

    expect(result).toEqual({ id: 1, trailId: 12, userId: 44 });
    expect(tx.trailReport.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 44,
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
            lt: expect.any(Date),
          }),
        }),
      }),
    );
    expect(tx.trailReport.create).toHaveBeenCalledWith({
      data: {
        trailId: 12,
        conditionRating: 4,
        surfaceCondition: 'DRY',
        note: 'Looks good.',
        reporterName: 'hiker@gmail.com',
        userId: 44,
      },
    });
  });

  it('allows a user with 1 report today to submit', async () => {
    const tx = makeTransactionContext(1, 2);
    prisma.$transaction.mockImplementation(async (callback: (txArg: typeof tx) => unknown) =>
      callback(tx),
    );

    const result = await service.create(
      {
        trailId: 12,
        conditionRating: 5,
        surfaceCondition: 'MUDDY',
      },
      { id: 44, email: 'hiker@gmail.com' },
    );

    expect(result).toEqual({ id: 2, trailId: 12, userId: 44 });
  });

  it('rejects a user with 2 reports today', async () => {
    const tx = makeTransactionContext(2);
    prisma.$transaction.mockImplementation(async (callback: (txArg: typeof tx) => unknown) =>
      callback(tx),
    );

    await expect(
      service.create(
        {
          trailId: 12,
          conditionRating: 5,
          surfaceCondition: 'ICY',
        },
        { id: 44, email: 'hiker@gmail.com' },
      ),
    ).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
    expect(tx.trailReport.create).not.toHaveBeenCalled();
  });

  it('retries serializable conflicts and succeeds when a later attempt wins', async () => {
    const serializationError = {
      code: 'P2034',
    };
    const tx = makeTransactionContext(1, 3);

    prisma.$transaction
      .mockRejectedValueOnce(serializationError)
      .mockImplementationOnce(async (callback: (txArg: typeof tx) => unknown) =>
        callback(tx),
      );

    const result = await service.create(
      {
        trailId: 99,
        conditionRating: 3,
        surfaceCondition: 'SNOWY',
      },
      { id: 55, email: 'other@gmail.com' },
    );

    expect(result).toEqual({ id: 3, trailId: 12, userId: 44 });
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('returns a safe retry message when serializable conflicts keep happening', async () => {
    const serializationError = {
      code: 'P2034',
    };
    prisma.$transaction.mockRejectedValue(serializationError);

    await expect(
      service.create(
        {
          trailId: 99,
          conditionRating: 3,
          surfaceCondition: 'SNOWY',
        },
        { id: 55, email: 'other@gmail.com' },
      ),
    ).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it('uses serializable isolation for concurrency protection', async () => {
    const tx = makeTransactionContext(0);
    prisma.$transaction.mockImplementation(async (callback: (txArg: typeof tx) => unknown) =>
      callback(tx),
    );

    await service.create(
      {
        trailId: 12,
        conditionRating: 4,
        surfaceCondition: 'DRY',
      },
      { id: 44, email: 'hiker@gmail.com' },
    );

    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  });
});

import { currentDate, utcDayStamp } from './deepseek.config';

export class DeepseekDailyBudget {
  private readonly usedByDay = new Map<string, number>();

  constructor(private readonly limit: number) {}

  tryConsume(now = currentDate()): boolean {
    const day = utcDayStamp(now);
    this.forgetOtherDays(day);
    const used = this.usedByDay.get(day) ?? 0;
    if (used >= this.limit) {
      return false;
    }

    this.usedByDay.set(day, used + 1);
    return true;
  }

  used(now = currentDate()): number {
    return this.usedByDay.get(utcDayStamp(now)) ?? 0;
  }

  private forgetOtherDays(day: string): void {
    for (const key of this.usedByDay.keys()) {
      if (key !== day) {
        this.usedByDay.delete(key);
      }
    }
  }
}

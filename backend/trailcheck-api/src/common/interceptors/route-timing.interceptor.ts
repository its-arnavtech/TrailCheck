import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class RouteTimingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RouteTimingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startedAt = performance.now();
    const http = context.switchToHttp();
    const request = http.getRequest<{ method?: string; originalUrl?: string }>();
    const response = http.getResponse<{ setHeader?: (name: string, value: string) => void }>();
    const method = request?.method ?? 'UNKNOWN';
    const path = request?.originalUrl ?? 'unknown-route';

    return next.handle().pipe(
      tap({
        next: () => {
          const elapsedMs = Math.round(performance.now() - startedAt);
          response?.setHeader?.('x-response-time', `${elapsedMs}ms`);

          const message = `${method} ${path} ${elapsedMs}ms`;

          if (elapsedMs >= 1500) {
            this.logger.warn(message);
            return;
          }

          this.logger.log(message);
        },
        error: () => {
          const elapsedMs = Math.round(performance.now() - startedAt);
          response?.setHeader?.('x-response-time', `${elapsedMs}ms`);
          this.logger.warn(`${method} ${path} failed after ${elapsedMs}ms`);
        },
      }),
    );
  }
}

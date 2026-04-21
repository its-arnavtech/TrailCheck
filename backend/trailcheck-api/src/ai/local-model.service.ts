import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import type { LocalModelResult } from './local-model.types';

const execFileAsync = promisify(execFile);

type LocalModelTransport = 'server' | 'subprocess';

type LocalModelRuntimeConfig = {
  transport: LocalModelTransport;
  timeoutMs: number;
  serverUrl: string;
  pythonExecutable: string;
  scriptPath: string;
  configPath: string;
  adapterPath: string;
};

@Injectable()
export class LocalModelService {
  private readonly logger = new Logger(LocalModelService.name);
  private readonly backendRoot = this.resolveBackendRoot();

  constructor(private readonly configService: ConfigService) {}

  isEnabled(): boolean {
    const rawValue = this.configService
      .get<string>('LOCAL_MODEL_ENABLED')
      ?.trim()
      .toLowerCase();

    if (!rawValue) {
      return true;
    }

    return !['false', '0', 'no', 'off'].includes(rawValue);
  }

  getTimeoutMs(): number {
    const configured = Number(
      this.configService.get<string>('LOCAL_MODEL_TIMEOUT_MS') ?? 180000,
    );
    return Number.isFinite(configured) && configured > 0 ? configured : 180000;
  }

  getRuntimeConfig(): LocalModelRuntimeConfig {
    return {
      transport: this.getTransport(),
      timeoutMs: this.getTimeoutMs(),
      serverUrl: this.getServerUrl(),
      pythonExecutable: this.getPythonExecutable(),
      scriptPath: this.getScriptPath(),
      configPath: this.getConfigPath(),
      adapterPath: this.getAdapterPath(),
    };
  }

  async generate(input: Record<string, unknown>): Promise<LocalModelResult> {
    const config = this.getRuntimeConfig();
    const readinessError = this.getReadinessError(config);
    if (readinessError) {
      this.logger.warn(`Local model is not ready: ${readinessError}`);
      return this.buildFailureResult(readinessError);
    }

    return config.transport === 'server'
      ? this.generateViaServer(config, input)
      : this.generateViaSubprocess(config, input);
  }

  private getTransport(): LocalModelTransport {
    const configured = this.configService
      .get<string>('LOCAL_MODEL_TRANSPORT')
      ?.trim()
      .toLowerCase();

    if (configured === 'subprocess') {
      return 'subprocess';
    }

    return 'server';
  }

  private getServerUrl(): string {
    return (
      this.configService.get<string>('LOCAL_MODEL_SERVER_URL')?.trim() ??
      'http://127.0.0.1:8001'
    ).replace(/\/+$/, '');
  }

  private async generateViaServer(
    config: LocalModelRuntimeConfig,
    input: Record<string, unknown>,
  ): Promise<LocalModelResult> {
    const startedAt = Date.now();

    try {
      const response = await fetch(`${config.serverUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
        signal: AbortSignal.timeout(config.timeoutMs),
      });

      const elapsedMs = Date.now() - startedAt;
      const payload = (await response.json()) as LocalModelResult | {
        errors?: string[];
      };

      if (!response.ok) {
        const message =
          Array.isArray(payload.errors) && payload.errors.length
            ? payload.errors.join('; ')
            : `Local model server returned ${response.status}`;
        this.logger.warn(
          `Local model server failed after ${elapsedMs}ms: ${message}`,
        );
        return this.buildFailureResult(message);
      }

      const result = this.normalizeResult(payload as LocalModelResult);
      if (!result.ok) {
        this.logger.warn(
          `Local model server requested fallback after ${elapsedMs}ms: ${result.errors.join('; ')}`,
        );
      }

      return result;
    } catch (error) {
      const message = this.describeServerError(error, config.timeoutMs);
      this.logger.warn(
        `Local model server request failed after ${Date.now() - startedAt}ms: ${message}`,
      );
      return this.buildFailureResult(message);
    }
  }

  private async generateViaSubprocess(
    config: LocalModelRuntimeConfig,
    input: Record<string, unknown>,
  ): Promise<LocalModelResult> {
    const startedAt = Date.now();
    const tempDirectory = await mkdtemp(join(tmpdir(), 'trailcheck-local-'));
    const inputPath = join(tempDirectory, 'input.json');

    try {
      this.logger.log(
        `Local model subprocess generation started (timeout=${config.timeoutMs}ms, script="${config.scriptPath}", adapter="${config.adapterPath}").`,
      );
      await writeFile(inputPath, JSON.stringify(input, null, 2), 'utf-8');

      const { stdout, stderr } = await execFileAsync(
        config.pythonExecutable,
        [
          config.scriptPath,
          '--config',
          config.configPath,
          '--adapter-path',
          config.adapterPath,
          '--input-json',
          inputPath,
        ],
        {
          cwd: this.backendRoot,
          timeout: config.timeoutMs,
          maxBuffer: 1024 * 1024 * 4,
          windowsHide: true,
        },
      );

      if (stderr?.trim()) {
        this.logger.warn(`Local model stderr: ${stderr.trim()}`);
      }

      const parsed = this.parseResult(stdout);
      if (!parsed.ok) {
        this.logger.warn(
          `Local model subprocess requested fallback after ${Date.now() - startedAt}ms: ${parsed.errors.join('; ')}`,
        );
      } else {
        this.logger.log(
          `Local model subprocess generation succeeded in ${Date.now() - startedAt}ms.`,
        );
      }

      return parsed;
    } catch (error) {
      const message = this.describeExecutionError(error, config.timeoutMs);
      this.logger.warn(
        `Local model subprocess failed after ${Date.now() - startedAt}ms: ${message}`,
      );
      return this.buildFailureResult(message);
    } finally {
      await rm(tempDirectory, { recursive: true, force: true }).catch(
        () => undefined,
      );
    }
  }

  private getPythonExecutable(): string {
    const configured =
      this.configService.get<string>('LOCAL_MODEL_PYTHON_BIN') ?? 'python';

    return this.resolvePathLikeValue(configured);
  }

  private getScriptPath(): string {
    return this.resolveFromRoot(
      this.configService.get<string>('LOCAL_MODEL_SCRIPT') ??
        'ml/inference/generate_local.py',
    );
  }

  private getConfigPath(): string {
    return this.resolveFromRoot(
      this.configService.get<string>('LOCAL_MODEL_CONFIG') ??
        'ml/configs/trailcheck_qlora_4060.yaml',
    );
  }

  private getAdapterPath(): string {
    return this.resolveFromRoot(
      this.configService.get<string>('LOCAL_MODEL_ADAPTER_PATH') ??
        'ml/models/trailcheck-qwen25-3b-json',
    );
  }

  private resolveBackendRoot(): string {
    const candidates = [
      process.cwd(),
      resolve(__dirname, '..', '..'),
      resolve(__dirname, '..', '..', '..'),
      resolve(__dirname, '..', '..', '..', '..'),
    ];

    for (const candidate of candidates) {
      if (
        existsSync(resolve(candidate, 'package.json')) &&
        existsSync(resolve(candidate, 'ml'))
      ) {
        return candidate;
      }
    }

    return process.cwd();
  }

  private resolveFromRoot(relativeOrAbsolutePath: string): string {
    return resolve(this.backendRoot, relativeOrAbsolutePath);
  }

  private resolvePathLikeValue(value: string): string {
    if (isAbsolute(value)) {
      return value;
    }

    if (/[\\/]/.test(value) || value.startsWith('.')) {
      return resolve(this.backendRoot, value);
    }

    return value;
  }

  private getReadinessError(config: LocalModelRuntimeConfig): string | null {
    if (config.transport === 'server') {
      return config.serverUrl ? null : 'Local model server URL is missing.';
    }

    const pythonPathLooksLocal =
      isAbsolute(config.pythonExecutable) ||
      /[\\/]/.test(config.pythonExecutable) ||
      config.pythonExecutable.endsWith('.exe');
    if (pythonPathLooksLocal && !existsSync(config.pythonExecutable)) {
      return `Local model python executable not found at ${config.pythonExecutable}.`;
    }

    if (!existsSync(config.scriptPath)) {
      return `Local model script not found at ${config.scriptPath}.`;
    }

    if (!existsSync(config.configPath)) {
      return `Local model config not found at ${config.configPath}.`;
    }

    const adapterConfigPath = resolve(config.adapterPath, 'adapter_config.json');
    if (!existsSync(adapterConfigPath)) {
      return `Local model adapter is not ready at ${config.adapterPath}. Train or point LOCAL_MODEL_ADAPTER_PATH to a saved adapter first.`;
    }

    return null;
  }

  private buildFailureResult(message: string): LocalModelResult {
    return {
      ok: false,
      fallbackRecommended: true,
      output: null,
      errors: [message],
    };
  }

  private describeServerError(error: unknown, timeoutMs: number): string {
    if (!(error instanceof Error)) {
      return 'Unknown local model server error';
    }

    if (
      error.name === 'AbortError' ||
      error.name === 'TimeoutError' ||
      error.message.toLowerCase().includes('timed out')
    ) {
      return `Local model server timed out after ${timeoutMs}ms.`;
    }

    return `Local model server request failed: ${error.message}`;
  }

  private describeExecutionError(error: unknown, timeoutMs: number): string {
    if (!(error instanceof Error)) {
      return 'Unknown local model execution error';
    }

    const execError = error as Error & {
      code?: string | number;
      signal?: string;
      killed?: boolean;
    };

    if (
      execError.killed ||
      execError.signal === 'SIGTERM' ||
      execError.message.toLowerCase().includes('timed out')
    ) {
      return `Local model process timed out after ${timeoutMs}ms.`;
    }

    return execError.message;
  }

  private parseResult(stdout: string): LocalModelResult {
    const text = stdout.trim();
    if (!text) {
      return this.buildFailureResult('Local model returned empty stdout.');
    }

    try {
      return this.normalizeResult(JSON.parse(text) as LocalModelResult);
    } catch {
      const extracted = this.extractFirstJsonObject(text);
      if (!extracted) {
        return {
          ...this.buildFailureResult('Unable to parse local model JSON output.'),
          rawText: text,
        };
      }

      return this.normalizeResult(JSON.parse(extracted) as LocalModelResult);
    }
  }

  private normalizeResult(result: LocalModelResult): LocalModelResult {
    return {
      rowId: result.rowId,
      ok: Boolean(result.ok),
      fallbackRecommended: Boolean(result.fallbackRecommended),
      output: result.output ?? null,
      errors: result.errors ?? [],
      rawText: result.rawText ?? null,
      extractedJson: result.extractedJson ?? null,
      metadata: result.metadata ?? undefined,
    };
  }

  private extractFirstJsonObject(text: string): string | null {
    const start = text.indexOf('{');
    if (start === -1) {
      return null;
    }

    let depth = 0;
    let inString = false;
    let escape = false;

    for (let index = start; index < text.length; index += 1) {
      const char = text[index];

      if (inString) {
        if (escape) {
          escape = false;
        } else if (char === '\\') {
          escape = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
      } else if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          return text.slice(start, index + 1);
        }
      }
    }

    return null;
  }
}

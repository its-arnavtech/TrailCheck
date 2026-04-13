import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import type { LocalModelResult } from './local-model.types';

const execFileAsync = promisify(execFile);

@Injectable()
export class LocalModelService {
  private readonly logger = new Logger(LocalModelService.name);
  private readonly backendRoot = resolve(__dirname, '..', '..');

  constructor(private readonly configService: ConfigService) {}

  isEnabled(): boolean {
    return (
      this.configService.get<string>('LOCAL_MODEL_ENABLED')?.toLowerCase() !==
      'false'
    );
  }

  async generate(input: Record<string, unknown>): Promise<LocalModelResult> {
    const readinessError = this.getReadinessError();
    if (readinessError) {
      return {
        ok: false,
        fallbackRecommended: true,
        output: null,
        errors: [readinessError],
      };
    }

    const tempDirectory = await mkdtemp(join(tmpdir(), 'trailcheck-local-'));
    const inputPath = join(tempDirectory, 'input.json');

    try {
      await writeFile(inputPath, JSON.stringify(input, null, 2), 'utf-8');

      const { stdout, stderr } = await execFileAsync(
        this.getPythonExecutable(),
        [
          this.getScriptPath(),
          '--config',
          this.getConfigPath(),
          '--adapter-path',
          this.getAdapterPath(),
          '--input-json',
          inputPath,
        ],
        {
          cwd: this.backendRoot,
          timeout: this.getTimeoutMs(),
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
          `Local model requested fallback: ${parsed.errors.join('; ')}`,
        );
      }

      return parsed;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown local model execution error';
      this.logger.warn(`Local model execution failed: ${message}`);

      return {
        ok: false,
        fallbackRecommended: true,
        output: null,
        errors: [message],
      };
    } finally {
      await rm(tempDirectory, { recursive: true, force: true }).catch(
        () => undefined,
      );
    }
  }

  private getPythonExecutable(): string {
    return this.configService.get<string>('LOCAL_MODEL_PYTHON_BIN') ?? 'python';
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

  private getTimeoutMs(): number {
    const configured = Number(
      this.configService.get<string>('LOCAL_MODEL_TIMEOUT_MS') ?? 90000,
    );
    return Number.isFinite(configured) && configured > 0 ? configured : 90000;
  }

  private resolveFromRoot(relativeOrAbsolutePath: string): string {
    return resolve(this.backendRoot, relativeOrAbsolutePath);
  }

  private getReadinessError(): string | null {
    const scriptPath = this.getScriptPath();
    if (!existsSync(scriptPath)) {
      return `Local model script not found at ${scriptPath}.`;
    }

    const configPath = this.getConfigPath();
    if (!existsSync(configPath)) {
      return `Local model config not found at ${configPath}.`;
    }

    const adapterConfigPath = resolve(this.getAdapterPath(), 'adapter_config.json');
    if (!existsSync(adapterConfigPath)) {
      return `Local model adapter is not ready at ${this.getAdapterPath()}. Train or point LOCAL_MODEL_ADAPTER_PATH to a saved adapter first.`;
    }

    return null;
  }

  private parseResult(stdout: string): LocalModelResult {
    const text = stdout.trim();
    if (!text) {
      return {
        ok: false,
        fallbackRecommended: true,
        output: null,
        errors: ['Local model returned empty stdout.'],
      };
    }

    try {
      return this.normalizeResult(JSON.parse(text) as LocalModelResult);
    } catch {
      const extracted = this.extractFirstJsonObject(text);
      if (!extracted) {
        return {
          ok: false,
          fallbackRecommended: true,
          output: null,
          errors: ['Unable to parse local model JSON output.'],
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

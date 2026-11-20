import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { CommonModule } from './common/common.module';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';

/**
 * Wiring guard. The #443 "wire up AppModule" fix regressed: ten feature modules
 * existed under src/ with nothing importing them, so /reports and /search were
 * 404. This reads the sources (no database or Redis needed) and fails when a
 * module is unreachable from AppModule or a controller is not registered in a
 * reachable module.
 */
const SRC = __dirname;

/** Modules that are intentionally not mounted. Keep this empty if you can. */
const DORMANT_MODULES: string[] = [];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === 'migrations') continue;
      walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

/** The text between the brackets of `key: [ ... ]`, matching nested brackets. */
function arrayOf(source: string, key: string): string {
  const start = source.search(new RegExp(`\\b${key}\\s*:\\s*\\[`));
  if (start === -1) return '';
  let i = source.indexOf('[', start);
  const from = i + 1;
  let depth = 0;
  for (; i < source.length; i++) {
    if (source[i] === '[') depth++;
    else if (source[i] === ']' && --depth === 0) return source.slice(from, i);
  }
  return source.slice(from);
}

function identifiers(text: string, suffix: string): string[] {
  const re = new RegExp(`\\b([A-Z]\\w*${suffix})\\b`, 'g');
  return [...text.matchAll(re)].map((m) => m[1]);
}

const files = walk(SRC).filter((f) => !f.endsWith('.spec.ts'));
const moduleFiles = files.filter((f) => f.endsWith('.module.ts'));

const modules = new Map<string, { file: string; imports: string[]; controllers: string[] }>();
for (const file of moduleFiles) {
  const source = readFileSync(file, 'utf8');
  const name = /export class (\w+Module)\b/.exec(source)?.[1];
  if (!name) continue;
  modules.set(name, {
    file,
    imports: identifiers(arrayOf(source, 'imports'), 'Module'),
    controllers: identifiers(arrayOf(source, 'controllers'), 'Controller'),
  });
}

function reachableFrom(root: string): Set<string> {
  const seen = new Set<string>();
  const stack = [root];
  while (stack.length) {
    const current = stack.pop()!;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const next of modules.get(current)?.imports ?? []) stack.push(next);
  }
  return seen;
}

describe('AppModule wiring', () => {
  const reachable = reachableFrom('AppModule');

  it('found AppModule and a plausible number of modules', () => {
    expect(modules.has('AppModule')).toBe(true);
    expect(modules.size).toBeGreaterThan(20);
  });

  it('mounts every module under src/ (directly or through another module)', () => {
    const unwired = [...modules.keys()].filter(
      (name) => !reachable.has(name) && !DORMANT_MODULES.includes(name),
    );
    expect(unwired).toEqual([]);
  });

  it('registers every controller in a mounted module', () => {
    const controllerFiles = files.filter((f) => f.endsWith('.controller.ts'));
    const registered = new Set<string>();
    for (const name of reachable) {
      for (const controller of modules.get(name)?.controllers ?? []) {
        registered.add(controller);
      }
    }

    const missing: string[] = [];
    for (const file of controllerFiles) {
      const source = readFileSync(file, 'utf8');
      const controller = /export class (\w+Controller)\b/.exec(source)?.[1];
      if (controller && !registered.has(controller)) missing.push(controller);
    }
    expect(missing).toEqual([]);
  });

  it('mounts the modules that serve the dashboard and search routes', () => {
    for (const name of [
      'ReportsModule',
      'SearchModule',
      'WebhooksModule',
      'ApiKeysModule',
      'ImportModule',
      'MailModule',
      'QueueModule',
      'AlertsModule',
      'StorageModule',
      'RedisCacheModule',
    ]) {
      expect(reachable.has(name)).toBe(true);
    }
  });
});

describe('CommonModule serialization', () => {
  it('registers ClassSerializerInterceptor after the response wrapper so it runs innermost', () => {
    const providers: { provide?: unknown; useClass?: unknown }[] =
      Reflect.getMetadata('providers', CommonModule);
    const interceptors = providers
      .filter((p) => typeof p.provide === 'string' && p.provide.includes('INTERCEPTOR'))
      .map((p) => p.useClass);

    expect(interceptors).toContain(ClassSerializerInterceptor);
    expect(interceptors.indexOf(ClassSerializerInterceptor)).toBeGreaterThan(
      interceptors.indexOf(ResponseTransformInterceptor),
    );
  });
});

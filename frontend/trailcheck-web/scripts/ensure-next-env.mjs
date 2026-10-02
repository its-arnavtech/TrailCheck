import { existsSync, writeFileSync } from 'node:fs';

const path = new URL('../next-env.d.ts', import.meta.url);
if (!existsSync(path)) {
  writeFileSync(
    path,
    '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n',
  );
}

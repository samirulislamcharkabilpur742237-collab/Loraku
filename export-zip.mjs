import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { ZipArchive } = require('archiver');

const outFile = path.resolve(process.cwd(), 'loraku-dry-fruits-project.zip');
const output = fs.createWriteStream(outFile);
const archive = new ZipArchive({ zlib: { level: 9 } });

output.on('close', () => {
  console.log(`Created ${outFile} (${archive.pointer()} bytes)`);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);
archive.glob(
  '**/*',
  {
    cwd: process.cwd(),
    dot: true,
    ignore: [
      'node_modules/**',
      'dist/**',
      'data/**',
      '.env',
      '.env.local',
      '.git/**',
      'loraku-dry-fruits-project.zip',
      '*.log',
    ],
  },
  { prefix: 'loraku-dry-fruits' }
);

await archive.finalize();

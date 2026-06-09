import { build } from 'esbuild';
import { statSync } from 'fs';

const sharedConfig = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  treeShaking: true,
  splitting: false, // Not needed for single entry
  metafile: true, // For bundle analysis
  external: [
    // File processing libraries 
    'pdf-parse',
    'mammoth', 
    'officeparser',
    'exceljs',
    'turndown',
    '@langchain/langgraph-checkpoint-sqlite'
  ]
};

const builds = [
  { entryPoints: ['src/cli.ts'], outfile: 'dist/cli.js', minify: true },
  { entryPoints: ['src/index.ts'], outfile: 'dist/index.js', minify: false }
];

Promise.all(
  builds.map(config => build({ ...sharedConfig, ...config }))
).then(() => {
  for (const { outfile } of builds) {
    console.log(`📦 ${outfile} size: ${(statSync(outfile).size / 1024 / 1024).toFixed(2)}MB`);
  }
}).catch(() => process.exit(1));

import { spawnSync } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Vitest 4 loads its runner twice when Windows reports this folder as d:\ and D:\.
const root = realpathSync.native(fileURLToPath(new URL('..', import.meta.url)))
const result = spawnSync(
  process.execPath,
  ['node_modules/vitest/vitest.mjs', 'run', ...process.argv.slice(2)],
  { cwd: root, stdio: 'inherit' },
)

process.exit(result.status ?? 1)

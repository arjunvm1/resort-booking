import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

function check(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) check(path)
    else if (entry.name.endsWith('.js')) {
      const result = spawnSync(process.execPath, ['--check', path], { stdio: 'inherit' })
      if (result.status !== 0) process.exit(1)
    }
  }
}
check(fileURLToPath(new URL('..', import.meta.url)))
console.log('API syntax checks passed')

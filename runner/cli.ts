import { readFile, writeFile } from 'node:fs/promises'
import { analyze } from './model.ts'

const [input, output] = process.argv.slice(2)
if (!input || !output || input === output) {
  process.stderr.write('Usage: pnpm process-reading input.lesson.json output.lesson.json\nUse different input and output paths. Set CHINESE_MODEL to a downloaded Ollama model.\n')
  process.exitCode = 1
} else {
  const controller = new AbortController()
  process.once('SIGINT', () => controller.abort())
  try {
    const raw = await readFile(input)
    if (raw.byteLength > 2_000_000) throw new Error('Input exceeds 2 MB.')
    const result = await analyze(JSON.parse(raw.toString('utf8')), controller.signal)
    await writeFile(output, JSON.stringify(result, null, 2), { flag: 'wx', mode: 0o600 })
    process.stdout.write('Processed lesson saved. Import the output JSON in Chinese Reader.\n')
  } catch (e) { process.stderr.write(`${e instanceof Error ? e.message : 'Processing failed.'}\n`); process.exitCode = 1 }
}

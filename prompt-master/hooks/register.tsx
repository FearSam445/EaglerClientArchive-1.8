import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

const hasDraft = atom({ plugin: 'prompt-master', key: 'hasDraft' } as const, false)
const isBusy = atom({ plugin: 'prompt-master', key: 'isBusy' } as const, false)

const SYSTEM = `You are Prompt Master, an expert prompt engineer.
You receive a rough prompt a person is about to send to Claude, an AI assistant
that can read and edit code, run commands and use tools.
Rewrite it into a better prompt that gets a great result on the first try:
- Keep the person's intent, facts, names, file paths, code and constraints exactly.
- State the goal clearly up front, then any context, requirements and constraints.
- Spell out what "done" looks like (expected output, format, tests to pass) when it can be inferred.
- Use short sections or bullet points only when the task has several parts.
- Fix spelling and grammar; remove filler; do not invent requirements or details.
- Write it in the person's voice ("I want...", "Please..."), in the same language they used.
Reply with the rewritten prompt ONLY: no preamble, no quotes, no explanation.`

// Rewrites `rough` and puts the result in the prompt box. Returns a status line.
async function rewrite($: EngineInterface, rough: string): Promise<string> {
  const text = rough.trim()
  if (text === '') return 'Type a rough prompt first, then run Prompt Master.'
  if (await read($, isBusy)) return 'Prompt Master is already working…'

  await update($, isBusy, () => true)
  $.ui.status('✨ Prompt Master: rewriting…')
  try {
    const r = await $.model.complete({
      model: 'sonnet',
      system: SYSTEM,
      prompt: `Rough prompt to rewrite:\n<rough_prompt>\n${text}\n</rough_prompt>`,
      maxTokens: 2048,
      effort: 'low',
      timeoutMs: 60000,
    })
    if (!r.isAnswered) return `Prompt Master couldn't rewrite it (${r.reason}). Your prompt is unchanged.`
    const better = r.text.trim().replace(/^<rough_prompt>\s*|\s*<\/rough_prompt>$/g, '').trim()
    const filled = await $.prompt.fill({ text: better, mode: 'replace' })
    if (!filled.isFilled) return `Rewritten prompt:\n\n${better}`
    return '✨ Prompt rewritten. Review it, then press Enter to send.'
  } finally {
    await update($, isBusy, () => false)
    $.ui.status(undefined)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'prompt-master',
      description: 'Rewrite a rough prompt into a better one: /prompt-master <rough prompt>',
    })
    return next(e)
  })

  // Track whether the box holds text so the button only shows when useful.
  on('prompt.change', async ($, e, next) => {
    const now = e.text.trim() !== ''
    if (now !== (await read($, hasDraft))) await update($, hasDraft, () => now)
    return next(e)
  })

  // Slash command: works on every surface, including mobile and VS Code.
  on('command.run', { command: 'prompt-master' }, async ($, e) => {
    const rough = e.args.trim() !== '' ? e.args : (await $.prompt.read()).text
    const msg = await rewrite($, rough)
    return { text: msg }
  })

  // The one-click button, drawn just above the composer.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || e.props.isWorking) return next(e)
    const busy = await read($, isBusy)
    if (!busy && !(await read($, hasDraft))) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    return (
      <Box>
        {busy ? (
          <Text dimColor>✨ Prompt Master is rewriting your prompt…</Text>
        ) : (
          <Button
            key="prompt-master"
            label="✨ Prompt Master"
            onPress={async () => {
              const box = await $.prompt.read()
              const msg = await rewrite($, box.text)
              $.ui.toast(msg)
            }}
          />
        )}
      </Box>
    )
  })
}

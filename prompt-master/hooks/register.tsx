import { atom, read, update } from 'claude-code'
import type { EngineInterface, PromptOrigin, Register } from 'claude-code'

// Auto mode: when on, every prompt you send is rewritten before Claude sees it.
const isOn = atom({ plugin: 'prompt-master', key: 'isOn' } as const, false)
const isBusy = atom({ plugin: 'prompt-master', key: 'isBusy' } as const, false)

// Start a message with this to rewrite just that one, even with auto mode off.
const ONE_OFF = '++'

const SYSTEM = `You are Prompt Master, an expert prompt engineer.
You receive a rough prompt a person is about to send to Claude, an AI assistant
that can read and edit code, run commands and use tools.
Rewrite it into a better prompt that gets a great result on the first try:
- Keep the person's intent, facts, names, file paths, code and constraints exactly.
- State the goal clearly up front, then any context, requirements and constraints.
- Spell out what "done" looks like (expected output, format, tests to pass) when it can be inferred.
- Use short sections or bullet points only when the task has several parts.
- Fix spelling and grammar; remove filler; do not invent requirements or details.
- If the prompt is already clear, or is a short reply like "yes", "thanks" or "continue", return it unchanged.
- Write it in the person's voice ("I want...", "Please..."), in the same language they used.
Reply with the rewritten prompt ONLY: no preamble, no quotes, no explanation.`

// Prompts a person typed, from any surface (terminal, desktop app, phone, web).
const HUMAN: ReadonlySet<PromptOrigin['kind']> = new Set(['composer', 'bridge', 'sdk', 'unclassified'])

// Asks the model for a better version of `rough`; null when it could not.
async function improve($: EngineInterface, rough: string): Promise<string | null> {
  await update($, isBusy, () => true)
  $.ui.status('✨ Prompt Master: rewriting…')
  try {
    const r = await $.model.complete({
      model: 'sonnet',
      system: SYSTEM,
      prompt: `Rough prompt to rewrite:\n<rough_prompt>\n${rough}\n</rough_prompt>`,
      maxTokens: 2048,
      effort: 'low',
      timeoutMs: 60000,
    })
    if (!r.isAnswered) return null
    const better = r.text.trim().replace(/^<rough_prompt>\s*|\s*<\/rough_prompt>$/g, '').trim()
    return better === '' ? null : better
  } finally {
    await update($, isBusy, () => false)
    await showStatus($)
  }
}

async function showStatus($: EngineInterface): Promise<void> {
  $.ui.status((await read($, isOn)) ? '✨ Prompt Master: ON' : undefined)
}

async function toggle($: EngineInterface): Promise<string> {
  const now = !(await read($, isOn))
  await update($, isOn, () => now)
  await showStatus($)
  return now
    ? '✨ Prompt Master is ON: every prompt you send is rewritten first. Run /prompt-master again to turn it off.'
    : 'Prompt Master is OFF. Start a message with ++ to rewrite just that one.'
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'prompt-master',
      description: 'Turn Prompt Master auto-rewrite on/off, or preview: /prompt-master <rough prompt>',
    })
    await showStatus($)
    return next(e)
  })

  // The rewrite itself: runs on the prompt as you send it, so it works in every app.
  on('prompt.submit', async ($, e, next) => {
    if (e.command || e.isMeta || e.turnId || !HUMAN.has(e.origin.kind)) return next(e)

    const trimmed = e.text.trim()
    const isOneOff = trimmed.startsWith(ONE_OFF)
    if (!isOneOff && !(await read($, isOn))) return next(e)

    const rough = isOneOff ? trimmed.slice(ONE_OFF.length).trim() : trimmed
    if (rough === '') return next(e)

    const better = await improve($, rough)
    if (better === null) {
      $.ui.log("✨ Prompt Master couldn't rewrite this one, so it was sent as you wrote it.")
      return next({ ...e, text: rough })
    }
    $.ui.log(`✨ Prompt Master sent this instead:\n\n${better}`)
    return next({ ...e, text: better })
  })

  // /prompt-master            -> toggle auto mode (works on phone, desktop, terminal)
  // /prompt-master <rough>    -> preview the rewrite without sending it
  on('command.run', { command: 'prompt-master' }, async ($, e) => {
    const rough = e.args.trim()
    if (rough === '') return { text: await toggle($) }

    const better = await improve($, rough)
    if (better === null) return { text: "Prompt Master couldn't rewrite it. Try again in a moment." }
    const filled = await $.prompt.fill({ text: better, mode: 'replace' })
    return filled.isFilled
      ? { text: '✨ Rewritten prompt is in your prompt box. Review it, then press Enter to send.' }
      : { text: `✨ Rewritten prompt (copy it, or send it with ++ in front):\n\n${better}` }
  })

  // One-click toggle just above the prompt box, on surfaces that draw this band.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    if (await read($, isBusy)) {
      return (
        <Box>
          <Text dimColor>✨ Prompt Master is rewriting your prompt…</Text>
        </Box>
      )
    }
    const on_ = await read($, isOn)
    return (
      <Box>
        <Button
          key="prompt-master"
          label={on_ ? '✨ Prompt Master: ON' : '✨ Prompt Master: OFF'}
          onPress={async () => $.ui.toast(await toggle($))}
        />
        <Text dimColor>{on_ ? '  every prompt you send is improved first' : '  click to improve every prompt you send'}</Text>
      </Box>
    )
  })
}

import { expect, test } from 'claude-code/testing'

const reply = (text: string) => ({
  value: { isAnswered: true, text, usage: { input_tokens: 1, output_tokens: 1 } },
})

test('++ rewrites one prompt before it is sent', async ($, on) => {
  let asked = ''
  let sent = ''
  on('model.complete', (_, e) => {
    asked = typeof e.prompt === 'string' ? e.prompt : ''
    return reply('Please fix the login bug.')
  })
  on('prompt.submit', (_, e) => {
    sent = e.text
    return { text: e.text }
  })

  await $.prompt.submit({ text: '++ fix login its broke', origin: { kind: 'bridge' }, wait: false })
  expect(asked).toContain('fix login its broke')
  expect(sent).toBe('Please fix the login bug.')
})

test('with auto mode off, a plain prompt is untouched', async ($, on) => {
  let called = false
  let sent = ''
  on('model.complete', () => {
    called = true
    return reply('x')
  })
  on('prompt.submit', (_, e) => {
    sent = e.text
    return { text: e.text }
  })

  await $.prompt.submit({ text: 'hello', origin: { kind: 'composer' }, wait: false })
  expect(called).toBe(false)
  expect(sent).toBe('hello')
})

test('/prompt-master turns auto mode on, then every prompt is rewritten', async ($, on) => {
  let sent = ''
  on('model.complete', () => reply('Better prompt.'))
  on('prompt.submit', (_, e) => {
    sent = e.text
    return { text: e.text }
  })

  const r = await $.command.run({ command: 'prompt-master', args: '' })
  expect(r.text).toContain('ON')
  await $.prompt.submit({ text: 'make game snake', origin: { kind: 'sdk' }, wait: false })
  expect(sent).toBe('Better prompt.')
})

test('/prompt-master <text> previews when the app has its own prompt box', async ($, on) => {
  on('model.complete', () => reply('Better.'))
  on('prompt.fill', () => ({ isFilled: false, refusal: 'no_composer' as const }))

  const r = await $.command.run({ command: 'prompt-master', args: 'make a snake game' })
  expect(r.text).toContain('Better.')
})

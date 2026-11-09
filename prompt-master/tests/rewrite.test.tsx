import { expect, test } from 'claude-code/testing'

test('/prompt-master rewrites the draft and fills the box', async ($, on) => {
  let filled = ''
  let asked = ''
  on('prompt.read', () => ({ value: { text: 'fix the login bug its broken', cursor: 0 } }))
  on('model.complete', (_, e) => {
    asked = typeof e.prompt === 'string' ? e.prompt : ''
    return { value: { isAnswered: true, text: 'Please fix the login bug.', usage: { input_tokens: 1, output_tokens: 1 } } }
  })
  on('prompt.fill', (_, e) => {
    filled = e.text
    return { isFilled: true, text: e.text, cursor: e.text.length }
  })

  const r = await $.command.run({ command: 'prompt-master', args: '' })
  expect(asked).toContain('fix the login bug its broken')
  expect(filled).toBe('Please fix the login bug.')
  expect(r.text).toContain('rewritten')
})

test('an empty draft is not sent to the model', async ($, on) => {
  let called = false
  on('prompt.read', () => ({ value: { text: '   ', cursor: 0 } }))
  on('model.complete', () => {
    called = true
    return { value: { isAnswered: true, text: 'x', usage: { input_tokens: 0, output_tokens: 0 } } }
  })

  const r = await $.command.run({ command: 'prompt-master', args: '' })
  expect(called).toBe(false)
  expect(r.text).toContain('Type a rough prompt first')
})

test('/prompt-master <text> rewrites the typed text', async ($, on) => {
  let asked = ''
  on('model.complete', (_, e) => {
    asked = typeof e.prompt === 'string' ? e.prompt : ''
    return { value: { isAnswered: true, text: 'Better.', usage: { input_tokens: 1, output_tokens: 1 } } }
  })
  on('prompt.fill', (_, e) => ({ isFilled: true, text: e.text, cursor: 0 }))

  await $.command.run({ command: 'prompt-master', args: 'make a snake game' })
  expect(asked).toContain('make a snake game')
})

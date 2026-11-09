export type Draft = boolean

declare module 'claude-code' {
  interface PluginState {
    'prompt-master': { hasDraft: boolean; isBusy: boolean }
  }
}

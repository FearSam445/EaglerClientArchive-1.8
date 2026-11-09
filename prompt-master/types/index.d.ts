export type Draft = boolean

declare module 'claude-code' {
  interface PluginState {
    'prompt-master': { isOn: boolean; isBusy: boolean }
  }
}

/**
 * Client half of dock: publishes the `ctx.workbench` registry
 * service, then mounts the workbench shell as a fixed right-docked root on
 * document.body (the base owns this single portal; feature plugins never
 * touch the page layout). DSH's native UI stays untouched — the workbench
 * floats alongside it like the macOS Dock.
 */
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { WorkbenchContext } from './contract.ts'
import { createLayoutStore } from './layout.ts'
import { createSettingsStore } from './settings.ts'
import { createWorkbenchService } from './service.ts'
import { WorkbenchRoot } from './parts.tsx'
import { mountStyles } from './styles.ts'

/**
 * The shell resolves the active Session from `uiSession`, whose scope adapter
 * is the view owner's selection source; waiting for it keeps every view's
 * sessionId correct on its first render instead of racing boot order.
 */
export const inject: string[] = ['uiSession']

/** Client plugin body. */
export function apply(ctx: WorkbenchContext): void {
  // Publish the registry BEFORE the shell mounts so feature plugins
  // injecting 'workbench' are ready by the time the shell renders.
  const store = createLayoutStore()
  const settings = createSettingsStore()
  const service = createWorkbenchService(store, settings)
  ctx.provide('workbench', service)

  ctx.effect(() => {
    let root: Root | undefined
    let host: HTMLDivElement | undefined
    let unstyle: (() => void) | undefined
    let cleaned = false
    const cleanup = (): void => {
      if (cleaned) return
      cleaned = true
      root?.unmount()
      root = undefined
      host?.remove()
      host = undefined
      unstyle?.()
      unstyle = undefined
      service.dispose()
    }
    try {
      unstyle = mountStyles()
      host = document.createElement('div')
      host.setAttribute('data-dock', '')
      document.body.appendChild(host)
      root = createRoot(host)
      root.render(createElement(WorkbenchRoot, { ctx, service, store }))
      return cleanup
    } catch (error) {
      console.error('[dock] mount error:', error)
      // The effect callback may never be disposed after a failed mount, so
      // release every resource immediately as well as returning an idempotent
      // disposer for Cordis.
      cleanup()
      return cleanup
    }
  }, 'dock: shell mount')
}

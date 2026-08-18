/**
 * Client half of desk: publishes the `ctx.workbench` registry
 * service, then mounts the workbench shell as a fixed right-docked root on
 * document.body (the base owns this single portal; feature plugins never
 * touch the page layout). DSH's native UI stays untouched in Phase 1 —
 * absorbing it into the shell (session list → activity bar, chat →
 * editor area) is Phase 3 work.
 */
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { WorkbenchContext } from './contract.ts'
import { createLayoutStore } from './layout.ts'
import { createWorkbenchService } from './service.ts'
import { WorkbenchRoot } from './parts.tsx'
import { mountStyles } from './styles.ts'

/** No runtime services required: the base only needs the cordis context. */
export const inject: string[] = []

/** Client plugin body. */
export function apply(ctx: WorkbenchContext): void {
  // Publish the registry BEFORE the shell mounts so feature plugins
  // injecting 'workbench' are ready by the time the shell renders.
  const store = createLayoutStore()
  const service = createWorkbenchService(store)
  ctx.provide('workbench', service)

  ctx.effect(() => {
    let disposed = false
    let root: Root | undefined
    let host: HTMLDivElement | undefined
    try {
      const unstyle = mountStyles()
      host = document.createElement('div')
      host.setAttribute('data-desk', '')
      document.body.appendChild(host)
      root = createRoot(host)
      root.render(createElement(WorkbenchRoot, { ctx, service, store }))
      return () => {
        disposed = true
        root?.unmount()
        host?.remove()
        unstyle()
      }
    } catch (error) {
      console.error('[desk] mount error:', error)
      return () => {
        disposed = true
        root?.unmount()
        host?.remove()
      }
    }
  }, 'desk: shell mount')
}

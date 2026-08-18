/**
 * Host half of dock — Phase 1 empty shell.
 *
 * The base owns the *window* (client layout shell + registry service); all
 * feature domains (fs / git / terminal / ...) live in feature plugins with
 * their own host routes. Layout persistence happens on the client
 * (localStorage), so the host half has no routes yet. Future host surfaces
 * (cross-plugin layout sharing, permissions manifest, /workbench/bundle
 * chunk serving) land in Phase 2+.
 */
export const name = 'dock'

/** No host-side services required yet. */
export function apply(): void {
  // no-op in Phase 1
}

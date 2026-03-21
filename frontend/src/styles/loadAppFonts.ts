let appFontsPromise: Promise<unknown> | null = null

export function ensureAppFontsLoaded() {
  appFontsPromise ??= import('./appFonts.css')

  return appFontsPromise
}

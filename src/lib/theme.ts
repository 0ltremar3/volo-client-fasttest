export type ThemeName = 'default' | 'dark'

const storageKey = 'ui-theme'

function isThemeName(value: string | null | undefined): value is ThemeName {
  return value === 'default' || value === 'dark'
}

export function getTheme(): ThemeName {
  const currentTheme = document.documentElement.dataset.theme
  return isThemeName(currentTheme) ? currentTheme : 'default'
}

export function setTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme
  localStorage.setItem(storageKey, theme)
  syncThemeColor()
}

export function applyStoredTheme() {
  const storedTheme = localStorage.getItem(storageKey)
  if (isThemeName(storedTheme)) {
    document.documentElement.dataset.theme = storedTheme
  }
  syncThemeColor()
}

function syncThemeColor() {
  const themeColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--background')
    .trim()
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta && themeColor) meta.content = themeColor
}

import { Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { getTheme, setTheme, type ThemeName } from '@/lib/theme'

export function ThemeToggle() {
  const { t } = useTranslation('common')
  const [theme, setCurrentTheme] = useState<ThemeName>(getTheme)
  const isDark = theme === 'dark'

  function toggleTheme() {
    const nextTheme: ThemeName = isDark ? 'default' : 'dark'
    setTheme(nextTheme)
    setCurrentTheme(nextTheme)
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={isDark ? t('theme.switchToDefault') : t('theme.switchToDark')}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  )
}

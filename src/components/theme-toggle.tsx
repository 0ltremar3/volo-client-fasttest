import { Moon, Sun } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { getTheme, setTheme, type ThemeName } from '@/lib/theme'

export function ThemeToggle() {
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
      aria-label={`Switch to ${isDark ? 'default' : 'dark'} theme`}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  )
}

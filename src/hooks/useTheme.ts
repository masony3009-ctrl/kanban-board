import { useCallback, useState } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  )

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light'
      document.documentElement.classList.toggle('dark', next === 'dark')
      try {
        localStorage.setItem('kanban-theme', next)
      } catch {
        // Private-mode storage restrictions: the theme just won't persist.
      }
      return next
    })
  }, [])

  return { theme, toggleTheme }
}

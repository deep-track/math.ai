import { createContext, type ReactNode } from 'react'

export type Theme = 'dark' | 'light'

export type ThemeContextType = {
  theme: Theme
}

// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext = createContext<ThemeContextType | null>(null)

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const theme: Theme = 'dark'

  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  )
}
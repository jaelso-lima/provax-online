import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type DarkMode = "light" | "dark";

interface ThemeContextType {
  theme: DarkMode;
  toggleTheme: () => void;
  colorTheme: string;
  setColorTheme: (t: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<DarkMode>(() => {
    const stored = localStorage.getItem("provax-theme");
    return (stored as DarkMode) || "light";
  });

  const [colorTheme, setColorThemeState] = useState(() => {
    return localStorage.getItem("provax-color-theme") || "blue";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("provax-theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-color-theme", colorTheme);
    localStorage.setItem("provax-color-theme", colorTheme);
  }, [colorTheme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));
  const setColorTheme = (t: string) => setColorThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colorTheme, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}

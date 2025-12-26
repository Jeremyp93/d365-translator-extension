import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Theme, webLightTheme, webDarkTheme } from "@fluentui/react-components";

type ThemeMode = "light" | "dark";

interface ThemeContextType {
  mode: ThemeMode;
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("dark");

  // Load theme preference from storage on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const result = await chrome.storage.local.get("themeMode");
        if (result.themeMode === "light" || result.themeMode === "dark") {
          setMode(result.themeMode);
        }
      } catch (e) {
        console.error("Failed to load theme:", e);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = useCallback(async () => {
    const newMode: ThemeMode = mode === "dark" ? "light" : "dark";
    setMode(newMode);
    try {
      await chrome.storage.local.set({ themeMode: newMode });
    } catch (e) {
      console.error("Failed to save theme:", e);
    }
  }, [mode]);

  const theme = mode === "dark" ? webDarkTheme : webLightTheme;

  return (
    <ThemeContext.Provider value={{ mode, theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

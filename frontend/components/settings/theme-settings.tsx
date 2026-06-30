"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Laptop } from "lucide-react";

const themes = [
  { name: "Light", icon: Sun },
  { name: "Dark", icon: Moon },
  { name: "System", icon: Laptop },
];

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid grid-cols-3 gap-4">
      {themes.map(({ name, icon: Icon }) => (
        <button
          key={name}
          onClick={() => setTheme(name.toLowerCase())}
          className={`
            border rounded-lg px-4 py-3 flex flex-col items-center justify-center gap-2
            transition-colors
            ${
              theme === name.toLowerCase()
                ? "border-gray-900 dark:border-white bg-gray-100 dark:bg-gray-800"
                : "border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            }
          `}
        >
          <Icon size={20} />
          <span className="text-sm font-medium">{name}</span>
        </button>
      ))}
    </div>
  );
}
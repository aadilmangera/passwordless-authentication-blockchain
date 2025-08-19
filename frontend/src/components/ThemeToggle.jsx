import { Monitor, Moon, Sun } from "lucide-react";
import useTheme from "../hooks/useTheme";

export default function ThemeToggle() {
  const { theme, cycle } = useTheme();
  const Icon = theme === "system" ? Monitor : theme === "light" ? Sun : Moon;
  const label = theme === "system" ? "System" : theme === "light" ? "Light" : "Dark";

  return (
    <button
      onClick={cycle}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm
                 bg-white text-gray-900 hover:bg-gray-100
                 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-700
                 focus:outline-none focus:ring-2 focus:ring-blue-400"
      title={`Theme: ${label} (click to change)`}
    >
      <Icon size={16} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

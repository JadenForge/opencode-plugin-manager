import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/theme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const THEME_OPTIONS: readonly {
  readonly value: Theme;
  readonly label: string;
  readonly icon: typeof Sun;
}[] = [
  { value: "light", label: "浅色", icon: Sun },
  { value: "dark", label: "深色", icon: Moon },
  { value: "system", label: "跟随系统", icon: Monitor },
] as const;

export const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();

  const current = THEME_OPTIONS.find((option) => option.value === theme) ?? THEME_OPTIONS[0];
  const CurrentIcon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="min-w-28 justify-start">
          <CurrentIcon />
          {current.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon;

          return (
            <DropdownMenuItem key={option.value} onClick={() => setTheme(option.value)}>
              <Icon />
              {option.label}
              {theme === option.value && <Check className="ml-auto" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

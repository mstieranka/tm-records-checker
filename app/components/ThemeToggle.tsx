import { useTheme } from "next-themes";
import { IconDeviceLaptop, IconMoon, IconSun } from "@tabler/icons-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

export function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={(props) => (
          <Button {...props} variant="ghost" size={showLabel ? "sm" : "icon-sm"} />
        )}
      >
        <IconSun className="inline-block dark:hidden" />
        <IconMoon className="hidden dark:inline-block" />
        {showLabel && (
          <span className="ml-1">
            {theme === "system" && "System"}
            {theme === "dark" && "Dark"}
            {theme === "light" && "Light"}
          </span>
        )}
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="system" closeOnClick>
            <IconDeviceLaptop />
            System
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light" closeOnClick>
            <IconSun />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark" closeOnClick>
            <IconMoon />
            Dark
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

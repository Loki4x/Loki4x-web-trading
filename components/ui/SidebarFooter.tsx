import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeSwitch } from "@/components/ui/ThemeSwitch";

/** Pengatur tema dan bahasa di kiri bawah sidebar. */
export function SidebarFooter() {
  return (
    <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-4">
      <ThemeSwitch />
      <LanguageToggle />
    </div>
  );
}

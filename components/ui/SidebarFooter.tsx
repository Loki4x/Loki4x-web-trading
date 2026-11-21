import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { GlassToggle, ThemeSwitch } from "@/components/ui/ThemeSwitch";

/** Pengatur tema dan bahasa di kiri bawah sidebar. */
export function SidebarFooter() {
  return (
    <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-4">
      <div className="flex items-center gap-1.5">
        <ThemeSwitch />
        <GlassToggle />
      </div>
      <LanguageToggle />
    </div>
  );
}

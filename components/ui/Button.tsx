import { ButtonHTMLAttributes, forwardRef } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { cx } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  withArrow?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", withArrow, loading, className, children, disabled, ...props },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-body font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none";
    const variants = {
      primary: "bg-primary text-text-on-primary shadow-glow hover:bg-primary-hover",
      secondary:
        "border border-border bg-surface-2 text-text-primary hover:bg-surface-hover",
      ghost: "text-text-secondary hover:text-text-primary",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cx(base, variants[variant], className)}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
        {withArrow && !loading && <ArrowRight className="h-4 w-4" />}
      </button>
    );
  }
);
Button.displayName = "Button";

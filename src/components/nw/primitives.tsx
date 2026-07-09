/**
 * NomadWealth design-system primitives.
 *
 * These implement the components in design-exports/component-inventory.md using
 * the design tokens (globals.css / tailwind.config.ts). They are used by the
 * marketing landing, the setup wizard, the cockpit showcase and the FIRE page —
 * the "product surface" the buyer sees. The existing dashboard keeps its own
 * primitives (components/ui/primitives.tsx); these are intentionally separate.
 */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ Button */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)] disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary:
          "rounded-btn bg-brand text-brand-on shadow-brand-glow hover:-translate-y-0.5 hover:shadow-brand-glow-hover hover:brightness-[1.06]",
        secondary:
          "rounded-btn border border-btn bg-[color:var(--chip)] text-text hover:-translate-y-0.5 hover:border-[color:var(--accent-ring)] hover:bg-[color:var(--hair)]",
        ghost: "rounded-btn text-text-2 hover:text-brand",
        success:
          "rounded-btn border border-[color:var(--nw-gain)] bg-[rgba(63,191,159,0.12)] text-[color:var(--nw-gain)]",
      },
      size: {
        sm: "px-3 py-2 text-[13px]",
        md: "px-5 py-2.5 text-[14px]",
        lg: "px-6 py-3 text-[15px]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled ?? undefined}
      className={cn(
        buttonVariants({ variant, size }),
        disabled &&
          "!bg-[color:var(--line)] !text-disabled !shadow-none hover:!translate-y-0 hover:!brightness-100",
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";

/* -------------------------------------------------------------------- Card */
export function Card({
  variant = "flat",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "flat" | "elevated" | "accent";
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface",
        variant === "elevated" && "shadow-float",
        variant === "accent" &&
          "border-[1.5px] border-brand bg-[linear-gradient(180deg,var(--accent-tint-2),var(--surface))]",
        className,
      )}
      {...props}
    />
  );
}

/* ----------------------------------------------------------------- Eyebrow */
export function Eyebrow({
  className,
  tone = "accent",
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & { tone?: "accent" | "dim" }) {
  return (
    <p
      className={cn(
        "text-[12px] font-semibold uppercase tracking-[0.08em]",
        tone === "accent" ? "text-brand" : "text-dim",
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------- Pill */
export function Pill({
  variant = "outline",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "accent-soft" | "outline" | "coming-soon";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        variant === "accent-soft" && "bg-brand-tint text-brand",
        variant === "outline" && "border border-line-strong text-muted",
        variant === "coming-soon" && "border border-line-strong text-dim",
        className,
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------ SegmentedNav */
export interface SegOption {
  value: string;
  label: string;
}
export function SegmentedNav({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: SegOption[];
  value: string;
  onChange: (v: string) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex gap-1 rounded-md border border-line bg-[color:var(--chip)] p-1",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-pill px-3.5 py-1.5 text-[13px] transition-all duration-150",
              active
                ? "bg-brand font-semibold text-brand-on"
                : "font-medium text-muted hover:text-text",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------- TextField */
export const TextField = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { mono?: boolean }
>(({ className, mono, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "w-full rounded-md border border-line-strong bg-input px-3.5 py-3 text-[14px] text-text placeholder:text-dim",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)]",
      mono && "mono",
      className,
    )}
    {...props}
  />
));
TextField.displayName = "TextField";

/* ----------------------------------------------------------- MetricBlock */
export function MetricBlock({
  label,
  value,
  delta,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  delta?: string;
  tone?: "default" | "gain" | "loss";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-line bg-surface-2 p-3",
        className,
      )}
    >
      <div className="text-[11px] uppercase tracking-[0.05em] text-dim">
        {label}
      </div>
      <div className="mono mt-1 text-[18px] font-semibold text-text">
        {value}
      </div>
      {delta && (
        <div
          className={cn(
            "mono mt-0.5 text-[12px]",
            tone === "gain" && "text-[color:var(--nw-gain)]",
            tone === "loss" && "text-[color:var(--nw-loss)]",
            tone === "default" && "text-muted",
          )}
        >
          {delta}
        </div>
      )}
    </div>
  );
}

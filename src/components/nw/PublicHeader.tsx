import Link from "next/link";
import { Wordmark } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./primitives";
import { STRIPE_SELFHOST_URL } from "@/components/marketing/content";

/**
 * Sticky, blurred header used on the public marketing / setup surfaces.
 * `variant="minimal"` (setup) drops the section nav and CTA.
 */
export function PublicHeader({
  variant = "full",
}: {
  variant?: "full" | "minimal";
}) {
  return (
    <header
      className="sticky top-0 z-40 border-b border-line backdrop-blur-md"
      style={{ background: "var(--header-bg)" }}
    >
      <div className="mx-auto flex max-w-[1120px] items-center justify-between px-5 py-2.5">
        <Link href="/" className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)]">
          <Wordmark />
        </Link>

        <div className="flex items-center gap-3">
          {variant === "full" && (
            <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
              {[
                ["Features", "/#features"],
                ["Cockpit", "/cockpit"],
                ["Live demo", "/demo"],
                ["Pricing", "/#pricing"],
                ["Security", "/security"],
              ].map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  className="rounded-pill px-3 py-1.5 text-[13px] font-medium text-muted transition-colors hover:text-text"
                >
                  {label}
                </Link>
              ))}
            </nav>
          )}
          <ThemeToggle />
          {variant === "full" && (
            <a href={STRIPE_SELFHOST_URL} target="_blank" rel="noopener noreferrer">
              <Button size="sm">Buy license</Button>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}

/** Dark-always MacBook showcase frame (mac-* tokens). Content stays dark
 *  regardless of page theme, matching the design. */
export function MacBookFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[640px]">
      <div
        className="rounded-[18px] p-2.5"
        style={{ background: "var(--mac-lid)" }}
      >
        <div
          className="mb-1 flex justify-center"
          aria-hidden
        >
          <span
            className="h-1 w-1 rounded-full"
            style={{ background: "var(--mac-dim)" }}
          />
        </div>
        <div
          className="overflow-hidden rounded-[9px]"
          style={{ background: "var(--mac-screen-bg)", color: "var(--mac-text)" }}
        >
          {children}
        </div>
      </div>
      <div
        className="mx-auto h-3 w-[86%] rounded-b-[10px]"
        style={{
          background: "linear-gradient(180deg,var(--mac-base-top),var(--mac-base-bot))",
        }}
      >
        <div
          className="mx-auto h-full w-16 rounded-b-md"
          style={{ background: "rgba(0,0,0,.12)" }}
        />
      </div>
    </div>
  );
}

/** Slim sidebar shared by the mini dashboards. */
export function MiniSidebar({ active }: { active: string }) {
  const items = ["Overview", "Holdings", "Performance", "Real Estate", "Loans", "FIRE"];
  return (
    <div
      className="w-[112px] flex-none border-r p-2"
      style={{ background: "var(--mac-sidebar)", borderColor: "rgba(255,255,255,.06)" }}
    >
      <div className="mb-3 flex items-center gap-1.5 px-1">
        <span className="grid h-4 w-4 place-items-center rounded bg-brand text-[9px] font-extrabold text-brand-on">
          N
        </span>
        <span className="text-[10px] font-bold">NomadWealth</span>
      </div>
      {items.map((it) => (
        <div
          key={it}
          className="mb-0.5 rounded px-2 py-1 text-[9px]"
          style={{
            background: it === active ? "var(--accent-tint)" : "transparent",
            color: it === active ? "var(--accent)" : "var(--mac-muted)",
          }}
        >
          {it}
        </div>
      ))}
    </div>
  );
}

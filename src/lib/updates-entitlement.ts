/**
 * Update entitlement derived from a license's `updatesUntil`.
 *
 * This turns the (previously cosmetic) `updatesUntil` date into a real,
 * honest status shown on the License page. It is deliberately **non-blocking**:
 * NomadWealth is self-hosted and never disables itself. A lapsed `updates`
 * subscription means "not entitled to NEW versions" — enforced at the release
 * channel, not by crippling the running app — so here we only inform and nudge
 * the owner to renew. Pure date math, no network, safe on client or server.
 */
export type UpdatesState =
  | "trial" // trial / unlicensed — updates entitlement N/A
  | "perpetual" // licensed with no updates window recorded
  | "active" // updates window open, comfortably in the future
  | "expiring" // updates window open but within the renewal-nudge window
  | "expired"; // updates window has passed — renew for new versions

export interface UpdatesEntitlement {
  state: UpdatesState;
  updatesUntil: string | null;
  /** Whole days until `updatesUntil` (negative once expired); null when N/A. */
  daysRemaining: number | null;
  /** True while the owner is still entitled to new versions. */
  entitled: boolean;
}

const DAY_MS = 86_400_000;
/** How far ahead of expiry to start nudging a renewal. */
export const EXPIRING_WINDOW_DAYS = 30;

export function updatesEntitlement(
  tier: string,
  updatesUntil: string | null,
  now: Date = new Date(),
): UpdatesEntitlement {
  if (tier === "trial" || tier === "none") {
    return { state: "trial", updatesUntil, daysRemaining: null, entitled: true };
  }
  if (!updatesUntil) {
    return { state: "perpetual", updatesUntil: null, daysRemaining: null, entitled: true };
  }

  const until = new Date(updatesUntil).getTime();
  if (Number.isNaN(until)) {
    // Unparseable date → treat as perpetual rather than falsely "expired".
    return { state: "perpetual", updatesUntil, daysRemaining: null, entitled: true };
  }

  const daysRemaining = Math.ceil((until - now.getTime()) / DAY_MS);
  if (daysRemaining <= 0) {
    return { state: "expired", updatesUntil, daysRemaining, entitled: false };
  }
  if (daysRemaining <= EXPIRING_WINDOW_DAYS) {
    return { state: "expiring", updatesUntil, daysRemaining, entitled: true };
  }
  return { state: "active", updatesUntil, daysRemaining, entitled: true };
}

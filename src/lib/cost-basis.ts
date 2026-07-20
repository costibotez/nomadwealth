/**
 * Moving-average cost basis for a single symbol's transaction history.
 *
 * Pure and currency-aware: callers inject a `toEur` converter so this module
 * stays free of server-only FX imports and is trivially unit-testable.
 *
 * Why a chronological pass (not a pooled sum of every buy):
 *  - A position that is fully sold and later re-bought must NOT inherit the
 *    pre-sale average cost — selling out realizes the old lots and the re-buy
 *    starts a fresh basis. A lifetime pool of all buys leaks the closed lots'
 *    cost (and quantity) into the still-open position.
 *  - Amounts are accumulated in EUR per lot, so a symbol traded in more than
 *    one currency (e.g. USD lots, then EUR lots) is never summed nominally.
 */
import type { TransactionRow } from "@/db/queries";

/** Quantities below this are treated as a fully-closed position. */
const EPS = 1e-9;

export interface RealizedLot {
  closeDate: string;
  quantity: number;
  costEur: number;
  proceedsEur: number;
  plEur: number;
}

export interface SymbolBasis {
  /** Shares still held after netting sells against buys. */
  remainingQty: number;
  /** Average cost per share, in the cost currency of the still-open lots. */
  avgCostNative: number;
  /** EUR cost basis of the still-open lots (== avgCostEur × remainingQty). */
  investedEur: number;
  /** One entry per sell, using the average cost at the moment of the sell. */
  realized: RealizedLot[];
}

/**
 * Compute the moving-average cost basis over `lots` (one symbol's rows).
 *
 * Processes transactions oldest-first. Buys add to quantity and basis;
 * commission on a buy is part of the cost. Sells reduce the basis
 * proportionally (average-cost method) and realize P/L against it. When the
 * running quantity reaches zero the basis resets, so a later re-buy is
 * independent of the closed lots.
 */
export function movingAverageBasis(
  lots: TransactionRow[],
  toEur: (amount: number, currency: string) => number,
): SymbolBasis {
  // Oldest-first; on the same day, buys settle before sells so you can't sell
  // shares you haven't acquired yet.
  const ordered = [...lots].sort((a, b) => {
    if (a.tradeDate !== b.tradeDate) return a.tradeDate < b.tradeDate ? -1 : 1;
    if (a.direction !== b.direction) return a.direction === "buy" ? -1 : 1;
    return 0;
  });

  let qty = 0;
  let basisNative = 0;
  let basisEur = 0;
  const realized: RealizedLot[] = [];

  for (const l of ordered) {
    if (l.direction === "buy") {
      // Commission on a buy is part of what you paid → into the cost basis.
      const grossNative = l.quantity * l.unitCost + (l.commission ?? 0);
      qty += l.quantity;
      basisNative += grossNative;
      basisEur += toEur(grossNative, l.costCurrency);
    } else {
      const avgNative = qty > EPS ? basisNative / qty : 0;
      const avgEur = qty > EPS ? basisEur / qty : 0;
      // Net proceeds = gross − sell commission − sale tax.
      const netNative = l.quantity * l.unitCost - (l.commission ?? 0) - (l.saleTax ?? 0);
      const proceedsEur = toEur(netNative, l.costCurrency);
      const costEur = avgEur * l.quantity;
      realized.push({
        closeDate: l.tradeDate,
        quantity: l.quantity,
        costEur,
        proceedsEur,
        plEur: proceedsEur - costEur,
      });
      qty -= l.quantity;
      basisNative -= avgNative * l.quantity;
      basisEur -= avgEur * l.quantity;
      // Full close → reset so a re-buy starts a fresh average.
      if (qty <= EPS) {
        qty = 0;
        basisNative = 0;
        basisEur = 0;
      }
    }
  }

  return {
    remainingQty: qty,
    avgCostNative: qty > EPS ? basisNative / qty : 0,
    investedEur: basisEur,
    realized,
  };
}

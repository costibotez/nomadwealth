import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  CandlestickChart,
  ArrowLeftRight,
  Tags,
  Building2,
  HandCoins,
  Coins,
  Receipt,
  Rocket,
  Heart,
  Briefcase,
  Users,
  Share2,
  Trash2,
  Upload,
  KeyRound,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/holdings", label: "Holdings", icon: Wallet },
  { href: "/dashboard/transactions", label: "Transactions", icon: Receipt },
  { href: "/dashboard/watchlist", label: "Watchlist", icon: CandlestickChart },
  { href: "/dashboard/performance", label: "Performance", icon: TrendingUp },
  { href: "/dashboard/dividends", label: "Dividends", icon: Coins },
  // Temporarily hidden — uncomment to restore:
  // { href: "/dashboard/cashflow", label: "Cash Flow", icon: ArrowLeftRight },
  // { href: "/dashboard/legend", label: "Income Legend", icon: Tags },
  { href: "/dashboard/real-estate", label: "Real Estate", icon: Building2 },
  { href: "/dashboard/businesses", label: "Businesses", icon: Briefcase },
  { href: "/dashboard/clients", label: "Clients", icon: Users },
  { href: "/dashboard/loans", label: "Loans", icon: HandCoins },
  { href: "/dashboard/import", label: "Import", icon: Upload },
  { href: "/dashboard/projection", label: "FIRE / Projection", icon: Rocket },
  { href: "/dashboard/wedding", label: "Wedding 2026", icon: Heart },
  { href: "/dashboard/sharing", label: "Share", icon: Share2 },
  { href: "/dashboard/license", label: "License", icon: KeyRound },
  { href: "/dashboard/trash", label: "Trash", icon: Trash2 },
];

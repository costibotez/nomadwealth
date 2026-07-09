import type { Metadata } from "next";
import { PublicHeader } from "@/components/nw/PublicHeader";
import { SetupWizard } from "@/components/setup/SetupWizard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Set up · NomadWealth" },
  description: "First-run setup for your self-hosted NomadWealth cockpit.",
  robots: { index: false, follow: false },
};

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <PublicHeader variant="minimal" />
      <main>
        <SetupWizard />
      </main>
    </div>
  );
}

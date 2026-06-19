"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { IntegrationsPanel } from "@/components/integrations/IntegrationsPanel";
import { PlanningTab } from "@/components/planning/PlanningTab";

export default function PlanningPage() {
  const [showIntegrations, setShowIntegrations] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <TopBar
        title="Planning"
        showBack
        onIntegrationsClick={() => setShowIntegrations(true)}
      />

      <IntegrationsPanel
        open={showIntegrations}
        onClose={() => setShowIntegrations(false)}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-8 sm:px-6">
          <PlanningTab onIntegrationsOpen={() => setShowIntegrations(true)} />
        </div>
      </main>
    </div>
  );
}

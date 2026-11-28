"use client";

import { DashboardState } from "./dashboard-state";
import { tw } from "@/lib/tw";

export default function DashboardError({ retry }: { retry: () => void }) {
  return (
    <div className="dashboard-theme dashboard-bootstrap">
      <DashboardState
        kind="error"
        title="Halaman belum dapat dimuat"
        description="Coba muat ulang halaman ini."
        action={
          <button className={tw("secondary")} onClick={retry}>
            Coba lagi
          </button>
        }
      />
    </div>
  );
}

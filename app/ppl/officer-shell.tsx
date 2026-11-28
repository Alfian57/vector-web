"use client";

import { usePathname } from "next/navigation";
import { Radio } from "lucide-react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Account } from "@/lib/domain";
import { whatsappLinkPath } from "@/lib/routes";
import { DashboardWorkspace } from "../_components/dashboard-workspace";

const revisionContext = createContext("");

export function useOfficerRevision() {
  return useContext(revisionContext);
}

export function OfficerShell({ account, children }: { account: Account; children: ReactNode }) {
  const pathname = usePathname();
  const [connection, setConnection] = useState<"connecting" | "live" | "retrying">("connecting");
  const [revision, setRevision] = useState("");

  useEffect(() => {
    const stream = new EventSource("/api/ppl/events");
    stream.addEventListener("refresh", (event: MessageEvent) => {
      setConnection("live");
      setRevision(event.lastEventId);
    });
    stream.onerror = () => setConnection("retrying");
    return () => stream.close();
  }, []);

  return (
    <DashboardWorkspace
      account={account}
      workspace="officer"
      whatsappHref={!account.whatsappLinked ? `${whatsappLinkPath}&next=${encodeURIComponent(pathname)}` : undefined}
      status={
        <span
          className={`dashboard-connection${connection === "live" ? "" : "dashboard-connection--offline"}`}
          role="status"
        >
          <Radio size={15} aria-hidden="true" />{" "}
          {connection === "live"
            ? "Daring"
            : connection === "retrying"
              ? "Menyambungkan ulang…"
              : "Menyambungkan…"}
        </span>
      }
    >
      <revisionContext.Provider value={revision}>{children}</revisionContext.Provider>
    </DashboardWorkspace>
  );
}

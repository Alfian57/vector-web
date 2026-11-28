import type { ReactNode } from "react";
import { Barlow_Semi_Condensed } from "next/font/google";
import { Brand } from "./brand";

const barlow = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-dashboard-heading",
});

export function DashboardShell({
  navigation,
  links,
  search,
  controls,
  children,
}: {
  navigation: ReactNode;
  links: ReactNode;
  search: ReactNode;
  controls: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`dashboard-theme dashboard-shell ${barlow.variable}`}>
      <a className="dashboard-skip" href="#dashboard-content">
        Lewati ke konten
      </a>
      <aside className="dashboard-rail">
        <div className="dashboard-brand">
          <Brand />
        </div>
        {navigation}
        <div className="dashboard-rail-links">{links}</div>
      </aside>
      <div className="dashboard-body">
        <header className="dashboard-top">
          {search}
          <div className="dashboard-controls">{controls}</div>
        </header>
        <main className="dashboard-content" id="dashboard-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}

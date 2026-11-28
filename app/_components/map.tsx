"use client";

import type { ComponentProps } from "react";
import type { RadarMap } from "./radar-map";
import dynamic from "next/dynamic";
import { DashboardSkeleton } from "./dashboard-state";

const MapContent = dynamic(() => import("./radar-map").then((module) => module.RadarMap), {
  ssr: false,
  loading: () => (
    <div className="dashboard-map-frame">
      <DashboardSkeleton kind="map" label="Memuat peta Karawang…" />
    </div>
  ),
});

export function Map(props: ComponentProps<typeof RadarMap>) {
  return (
    <MapContent
      key={props.offlineMap?.version ?? props.tileUrl ?? "districts"}
      {...props}
      tileUrl={props.offlineMap ? undefined : props.tileUrl}
    />
  );
}

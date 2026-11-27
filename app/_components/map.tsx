"use client";

import type { ComponentProps } from "react";
import type { RadarMap } from "./radar-map";
import dynamic from "next/dynamic";
import { tw } from "@/lib/tw";

const MapContent = dynamic(() => import("./radar-map").then((module) => module.RadarMap), {
  ssr: false,
  loading: () => (
    <div className={tw("map-frame")}>
      <p className={tw("map-message")} role="status">
        Memuat peta Karawang…
      </p>
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

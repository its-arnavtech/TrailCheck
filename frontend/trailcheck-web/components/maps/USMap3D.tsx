"use client";
import { useState } from "react";
import USGlobePanel from "./USGlobePanel";
import type { ParkMapRegion } from "@/lib/park-map-data";
const regions: { id: ParkMapRegion; label: string }[] = [
  { id: "mainland", label: "Contiguous U.S." },
  { id: "alaska", label: "Alaska" },
  { id: "hawaii", label: "Hawaii" },
  { id: "pacific", label: "American Samoa" },
  { id: "caribbean", label: "Virgin Islands" },
];
export default function USMap3D() {
  const [region, setRegion] = useState<ParkMapRegion>("mainland");
  const active = regions.find((item) => item.id === region)!;
  return (
    <section className="park-map-panel" aria-label="National park map">
      <div className="map-toolbar">
        <div className="map-regions" role="group" aria-label="Map region">
          {regions.map((item) => (
            <button
              key={item.id}
              aria-pressed={region === item.id}
              onClick={() => setRegion(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p>Choose a marker to explore.</p>
      </div>
      <USGlobePanel
        key={region}
        label={active.label}
        region={region}
        className="min-h-[22rem] sm:min-h-[28rem] lg:min-h-[34rem]"
      />
      <p className="map-attribution">
        Map tiles © OpenStreetMap contributors · Boundaries: U.S. Census Bureau
      </p>
    </section>
  );
}

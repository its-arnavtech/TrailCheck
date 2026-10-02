"use client";
import dynamic from "next/dynamic";
const ParkMapScene = dynamic(() => import("@/components/maps/USMap3D"), {
  ssr: false,
  loading: () => (
    <div className="map-loading" role="status">
      Finding your next adventure on the map…
    </div>
  ),
});
export default function ParkMap() {
  return <ParkMapScene />;
}

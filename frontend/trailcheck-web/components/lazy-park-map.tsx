"use client";
import dynamic from "next/dynamic";
const ParkMap = dynamic(() => import("@/components/park-map"), {
  ssr: false,
  loading: () => (
    <div className="map-loading" role="status">
      Loading the park map…
    </div>
  ),
});
export default function LazyParkMap() {
  return <ParkMap />;
}

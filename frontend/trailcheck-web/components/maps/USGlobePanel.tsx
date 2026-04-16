'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';
import SlippyMapGlobe from 'three-slippy-map-globe';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import type { ParkMapRegion } from '@/lib/park-map-data';
import { PARK_GLOBE_POINTS } from '@/lib/park-globe-data';
import { getUSGlobeOverlays } from './usGlobeOverlays';

type ParkPoint = (typeof PARK_GLOBE_POINTS)[number];

type HoverState = {
  park: ParkPoint;
  x: number;
  y: number;
} | null;

type ProjectedMarker = {
  x: number;
  y: number;
  visible: boolean;
};

const TILE_WARMUP_MS = 2500;

const REGION_TO_SCENE_KEY: Record<
  ParkMapRegion,
  'mainland' | 'alaska' | 'hawaii' | 'pacific' | 'caribbean'
> = {
  mainland: 'mainland',
  alaska: 'alaska',
  hawaii: 'hawaii',
  pacific: 'pacific',
  caribbean: 'caribbean',
};

const REGION_CAMERA: Record<ParkMapRegion, { lat: number; lng: number; distance: number }> = {
  mainland: { lat: 38, lng: -98, distance: 2.18 },
  alaska: { lat: 63.5, lng: -151, distance: 1.96 },
  hawaii: { lat: 20.6, lng: -156.2, distance: 1.7 },
  pacific: { lat: -14.3, lng: -170.7, distance: 1.58 },
  caribbean: { lat: 18.25, lng: -64.85, distance: 1.54 },
};

function latLngToVector(lat: number, lng: number, radius = 1) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (90 - lng) * (Math.PI / 180);

  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function polygonToShape(
  polygon: Feature<Polygon | MultiPolygon>,
  radius: number,
  color: string,
  altitude: number,
) {
  const group = new THREE.Group();
  const coordinates =
    polygon.geometry.type === 'Polygon'
      ? [polygon.geometry.coordinates]
      : polygon.geometry.coordinates;

  coordinates.forEach((rings) => {
    const outerRing = rings[0];
    if (!outerRing || outerRing.length < 3) {
      return;
    }

    const points = outerRing.map(([lng, lat]) => latLngToVector(lat, lng, radius + altitude));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.72,
    });
    const line = new THREE.LineLoop(geometry, material);
    group.add(line);
  });

  return group;
}

function disposeMaterial(material: THREE.Material | THREE.Material[] | undefined) {
  if (!material) {
    return;
  }

  if (Array.isArray(material)) {
    material.forEach((entry) => disposeMaterial(entry));
    return;
  }

  const materialWithMaps = material as THREE.Material & {
    map?: THREE.Texture | null;
    alphaMap?: THREE.Texture | null;
  };

  materialWithMaps.map?.dispose();
  materialWithMaps.alphaMap?.dispose();
  material.dispose();
}

function disposeObject3D(root: THREE.Object3D) {
  root.traverse((object) => {
    const geometry = (object as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    const material = (object as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;

    geometry?.dispose();
    disposeMaterial(material);
  });
}

export default function USGlobePanel({
  label,
  region,
  className,
}: {
  label: string;
  region: ParkMapRegion;
  className?: string;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeHoverSlugRef = useRef<string | null>(null);
  const projectedMarkersRef = useRef<Record<string, ProjectedMarker>>({});
  const [hovered, setHovered] = useState<HoverState>(null);
  const [projectedMarkers, setProjectedMarkers] = useState<Record<string, ProjectedMarker>>({});

  const points = useMemo(
    () => PARK_GLOBE_POINTS.filter((park) => park.region === region),
    [region],
  );

  const overlays = useMemo(
    () => getUSGlobeOverlays(REGION_TO_SCENE_KEY[region]),
    [region],
  );

  function updateHoveredMarker(park: ParkPoint | null) {
    activeHoverSlugRef.current = park?.slug ?? null;

    if (!park) {
      setHovered(null);
      return;
    }

    const marker = projectedMarkersRef.current[park.slug];

    if (!marker?.visible) {
      setHovered(null);
      return;
    }

    setHovered({
      park,
      x: marker.x,
      y: marker.y,
    });
  }

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const host = container;
    const radius = 1;
    const pointPositions = points.map((park) => latLngToVector(park.lat, park.lng, radius + 0.028));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      38,
      host.clientWidth / host.clientHeight,
      0.1,
      100,
    );

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.14);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xf0f7ff, 0.88);
    keyLight.position.set(-2.5, 1.9, 2.8);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x9cbfe3, 0.36);
    fillLight.position.set(2.8, -0.8, 1.45);
    scene.add(fillLight);

    const slippyGlobe = new SlippyMapGlobe(radius, {
      tileUrl: (x, y, level) => `https://tile.openstreetmap.org/${level}/${x}/${y}.png`,
      minLevel: 0,
      maxLevel: region === 'mainland' ? 5 : 6,
    });
    slippyGlobe.tileMargin = 0;
    globeGroup.add(slippyGlobe);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.035, 64, 64),
      new THREE.MeshBasicMaterial({
        color: '#7ba6d1',
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide,
      }),
    );
    globeGroup.add(atmosphere);

    overlays.polygons.forEach((polygon) => {
      globeGroup.add(polygonToShape(polygon, radius, '#f4f8ff', 0.011));
    });

    [...overlays.borderPaths, ...overlays.outlinePaths].forEach((path) => {
      const positions = path.coords.map((coord) =>
        latLngToVector(coord.lat, coord.lng, radius + (path.kind === 'outline' ? 0.013 : 0.011)),
      );
      const geometry = new THREE.BufferGeometry().setFromPoints(positions);
      const material = new THREE.LineBasicMaterial({
        color: path.kind === 'outline' ? '#f9fbff' : '#d6e4f3',
        transparent: true,
        opacity: path.kind === 'outline' ? 0.92 : 0.6,
      });
      const line = new THREE.Line(geometry, material);
      globeGroup.add(line);
    });

    const focus = latLngToVector(REGION_CAMERA[region].lat, REGION_CAMERA[region].lng, radius);
    camera.position.copy(focus.clone().multiplyScalar(REGION_CAMERA[region].distance));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    slippyGlobe.updatePov(camera);

    let animationFrame = 0;
    let renderUntil = 0;
    let disposed = false;

    function projectMarkers() {
      camera.updateMatrixWorld(true);

      const nextMarkers = points.reduce<Record<string, ProjectedMarker>>((accumulator, park, index) => {
        const position = pointPositions[index];
        const projected = position.clone().project(camera);
        const x = ((projected.x + 1) / 2) * host.clientWidth;
        const y = ((-projected.y + 1) / 2) * host.clientHeight;
        const normal = position.clone().normalize();
        const toCamera = camera.position.clone().sub(position).normalize();
        const visible =
          normal.dot(toCamera) > 0.08 &&
          projected.z > -1 &&
          projected.z < 1 &&
          x >= -24 &&
          x <= host.clientWidth + 24 &&
          y >= -24 &&
          y <= host.clientHeight + 24;

        accumulator[park.slug] = { x, y, visible };
        return accumulator;
      }, {});

      projectedMarkersRef.current = nextMarkers;

      if (!disposed) {
        setProjectedMarkers(nextMarkers);
      }

      if (activeHoverSlugRef.current) {
        updateHoveredMarker(
          points.find((park) => park.slug === activeHoverSlugRef.current) ?? null,
        );
      }
    }

    function renderFrame(now: number) {
      animationFrame = 0;

      if (disposed) {
        return;
      }

      slippyGlobe.updatePov(camera);
      renderer.render(scene, camera);

      if (now < renderUntil) {
        animationFrame = window.requestAnimationFrame(renderFrame);
      }
    }

    function scheduleRender(extraMs = 0) {
      renderUntil = Math.max(renderUntil, performance.now() + extraMs);

      if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(renderFrame);
      }
    }

    function handleResize() {
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(host.clientWidth, host.clientHeight);
      slippyGlobe.updatePov(camera);
      projectMarkers();
      scheduleRender(800);
    }

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(host);

    projectMarkers();
    scheduleRender(TILE_WARMUP_MS);

    return () => {
      disposed = true;
      resizeObserver.disconnect();

      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }

      slippyGlobe.clearTiles();
      disposeObject3D(globeGroup);
      renderer.dispose();
      host.replaceChildren();
    };
  }, [overlays, points, region]);

  return (
    <article
      className={`group relative overflow-hidden rounded-[1.7rem] border border-white/12 bg-[radial-gradient(circle_at_top,rgba(21,35,52,0.9),rgba(6,14,23,0.96)_48%,rgba(4,10,18,0.98)_100%)] shadow-[0_32px_90px_rgba(2,8,18,0.4)] ${className ?? ''}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(122,166,203,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_24%,rgba(3,10,18,0.18)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-3 sm:px-5">
        <span className="rounded-full border border-white/14 bg-black/18 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/74 backdrop-blur-md sm:text-[11px]">
          {label}
        </span>
      </div>

      <div ref={containerRef} className="absolute inset-0" />

      {points.map((park) => {
        const marker = projectedMarkers[park.slug];
        const isMainland = region === 'mainland';

        if (!marker?.visible) {
          return null;
        }

        return (
          <button
            key={park.slug}
            type="button"
            aria-label={`${park.name}, ${park.state}`}
            title={`${park.name}, ${park.state}`}
            className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#ffd9a6]/95 bg-[#cf6225]/90 shadow-[0_0_0_3px_rgba(207,98,37,0.28),0_0_18px_rgba(248,149,56,0.48)] transition duration-150 hover:scale-110 hover:shadow-[0_0_0_4px_rgba(207,98,37,0.34),0_0_22px_rgba(248,149,56,0.56)] focus:scale-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd9a6]/30 ${
              isMainland ? 'h-4 w-4' : 'h-5 w-5'
            }`}
            style={{ left: marker.x, top: marker.y }}
            onMouseEnter={() => updateHoveredMarker(park)}
            onMouseLeave={() => updateHoveredMarker(null)}
            onFocus={() => updateHoveredMarker(park)}
            onBlur={() => updateHoveredMarker(null)}
            onClick={() => router.push(`/parks/${park.slug}`)}
          >
            <span
              aria-hidden="true"
              className={`absolute rounded-full bg-[#fff6dd] ${
                isMainland ? 'inset-[3px]' : 'inset-[4px]'
              }`}
            />
          </button>
        );
      })}

      {hovered ? (
        <div
          className="pointer-events-none absolute z-30 w-max max-w-[15rem] -translate-x-1/2 -translate-y-[calc(100%+0.9rem)] rounded-2xl border border-white/14 bg-[rgba(8,14,22,0.92)] px-3 py-2 text-center shadow-[0_18px_48px_rgba(0,0,0,0.38)] backdrop-blur-md"
          style={{ left: hovered.x, top: hovered.y }}
        >
          <div className="text-xs font-semibold text-white sm:text-sm">{hovered.park.name}</div>
          <div className="mt-0.5 text-[11px] text-white/66 sm:text-xs">{hovered.park.state}</div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,8,15,0.03),transparent_26%,transparent_72%,rgba(2,8,15,0.24))]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(2,8,14,0.3))]" />
    </article>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

const REGION_CAMERA: Record<
  ParkMapRegion,
  { lat: number; lng: number; distance: number; markerSize: number; hoverThreshold: number }
> = {
  mainland: { lat: 38, lng: -98, distance: 2.18, markerSize: 18, hoverThreshold: 0.06 },
  alaska: { lat: 63.5, lng: -151, distance: 1.96, markerSize: 20, hoverThreshold: 0.075 },
  hawaii: { lat: 20.6, lng: -156.2, distance: 1.7, markerSize: 22, hoverThreshold: 0.085 },
  pacific: { lat: -14.3, lng: -170.7, distance: 1.58, markerSize: 22, hoverThreshold: 0.085 },
  caribbean: { lat: 18.25, lng: -64.85, distance: 1.54, markerSize: 22, hoverThreshold: 0.085 },
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

function createMarkerTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');

  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  const glow = context.createRadialGradient(64, 64, 6, 64, 64, 48);
  glow.addColorStop(0, 'rgba(255,220,145,0.98)');
  glow.addColorStop(0.36, 'rgba(248,149,56,0.94)');
  glow.addColorStop(0.72, 'rgba(207,98,37,0.38)');
  glow.addColorStop(1, 'rgba(207,98,37,0)');
  context.fillStyle = glow;
  context.beginPath();
  context.arc(64, 64, 48, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#cf6225';
  context.beginPath();
  context.arc(64, 64, 18, 0, Math.PI * 2);
  context.fill();

  context.lineWidth = 4;
  context.strokeStyle = 'rgba(255,255,255,0.92)';
  context.beginPath();
  context.arc(64, 64, 18, 0, Math.PI * 2);
  context.stroke();

  context.fillStyle = '#fff6dd';
  context.beginPath();
  context.arc(64, 64, 6.5, 0, Math.PI * 2);
  context.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<HoverState>(null);

  const points = useMemo(
    () => PARK_GLOBE_POINTS.filter((park) => park.region === region),
    [region],
  );

  const overlays = useMemo(
    () => getUSGlobeOverlays(REGION_TO_SCENE_KEY[region]),
    [region],
  );

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

    const markerPositions = new Float32Array(pointPositions.length * 3);
    pointPositions.forEach((position, index) => {
      markerPositions[index * 3] = position.x;
      markerPositions[index * 3 + 1] = position.y;
      markerPositions[index * 3 + 2] = position.z;
    });

    const markerTexture = createMarkerTexture();
    const markerGeometry = new THREE.BufferGeometry();
    markerGeometry.setAttribute('position', new THREE.BufferAttribute(markerPositions, 3));
    const markers = new THREE.Points(
      markerGeometry,
      new THREE.PointsMaterial({
        map: markerTexture,
        color: 0xffffff,
        transparent: true,
        alphaTest: 0.12,
        depthWrite: false,
        depthTest: false,
        sizeAttenuation: false,
        size: REGION_CAMERA[region].markerSize,
      }),
    );
    markers.renderOrder = 20;
    globeGroup.add(markers);

    const focus = latLngToVector(REGION_CAMERA[region].lat, REGION_CAMERA[region].lng, radius);
    camera.position.copy(focus.clone().multiplyScalar(REGION_CAMERA[region].distance));
    camera.lookAt(0, 0, 0);
    slippyGlobe.updatePov(camera);

    const raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = REGION_CAMERA[region].hoverThreshold;
    const pointer = new THREE.Vector2();

    let activeHoverIndex: number | null = null;
    let animationFrame = 0;
    let renderUntil = 0;
    let disposed = false;

    function getProjectedPosition(index: number) {
      const projected = pointPositions[index].clone().project(camera);

      return {
        x: ((projected.x + 1) / 2) * host.clientWidth,
        y: ((-projected.y + 1) / 2) * host.clientHeight,
      };
    }

    function updateTooltip(index: number | null) {
      activeHoverIndex = index;

      if (index === null) {
        setHovered(null);
        host.style.cursor = 'default';
        return;
      }

      const projected = getProjectedPosition(index);
      setHovered({
        park: points[index],
        ...projected,
      });
      host.style.cursor = 'pointer';
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

    function handlePointerMove(event: PointerEvent) {
      const rect = host.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const intersections = raycaster.intersectObject(markers, false);
      updateTooltip(
        typeof intersections[0]?.index === 'number' ? intersections[0].index : null,
      );
    }

    function handlePointerLeave() {
      updateTooltip(null);
    }

    function handleResize() {
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(host.clientWidth, host.clientHeight);
      slippyGlobe.updatePov(camera);

      if (activeHoverIndex !== null) {
        updateTooltip(activeHoverIndex);
      }

      scheduleRender(800);
    }

    host.addEventListener('pointermove', handlePointerMove);
    host.addEventListener('pointerleave', handlePointerLeave);

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(host);

    scheduleRender(TILE_WARMUP_MS);

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      host.removeEventListener('pointermove', handlePointerMove);
      host.removeEventListener('pointerleave', handlePointerLeave);
      host.style.cursor = 'default';

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

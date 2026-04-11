'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
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

const REGION_TO_SCENE_KEY: Record<ParkMapRegion, 'mainland' | 'alaska' | 'hawaii' | 'pacific' | 'caribbean'> = {
  mainland: 'mainland',
  alaska: 'alaska',
  hawaii: 'hawaii',
  pacific: 'pacific',
  caribbean: 'caribbean',
};

const REGION_CAMERA: Record<
  ParkMapRegion,
  { lat: number; lng: number; distance: number; markerScale: number }
> = {
  mainland: { lat: 38, lng: -98, distance: 2.15, markerScale: 0.04 },
  alaska: { lat: 63.5, lng: -151, distance: 1.95, markerScale: 0.052 },
  hawaii: { lat: 20.6, lng: -156.2, distance: 1.68, markerScale: 0.062 },
  pacific: { lat: -14.3, lng: -170.7, distance: 1.56, markerScale: 0.062 },
  caribbean: { lat: 18.25, lng: -64.85, distance: 1.52, markerScale: 0.062 },
};

function latLngToVector(lat: number, lng: number, radius = 1) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function createGlobeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext('2d');

  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  const ocean = context.createLinearGradient(0, 0, 0, canvas.height);
  ocean.addColorStop(0, '#17324f');
  ocean.addColorStop(0.5, '#0e2236');
  ocean.addColorStop(1, '#081827');
  context.fillStyle = ocean;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = 'rgba(255,255,255,0.06)';
  for (let i = 0; i < 8; i += 1) {
    context.beginPath();
    context.ellipse(
      canvas.width * (0.12 + i * 0.11),
      canvas.height * (0.18 + (i % 3) * 0.19),
      120 + i * 18,
      34 + (i % 2) * 18,
      i * 0.15,
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  const landGradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  landGradient.addColorStop(0, '#7c6844');
  landGradient.addColorStop(0.35, '#5d6e3d');
  landGradient.addColorStop(0.7, '#405434');
  landGradient.addColorStop(1, '#2f4132');

  const drawLand = (x: number, y: number, rx: number, ry: number, rotation = 0) => {
    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    context.beginPath();
    context.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  };

  context.fillStyle = landGradient;
  drawLand(canvas.width * 0.19, canvas.height * 0.37, 245, 168, -0.16);
  drawLand(canvas.width * 0.29, canvas.height * 0.63, 190, 224, 0.18);
  drawLand(canvas.width * 0.48, canvas.height * 0.31, 140, 252, 0.03);
  drawLand(canvas.width * 0.71, canvas.height * 0.32, 272, 165, -0.04);
  drawLand(canvas.width * 0.77, canvas.height * 0.58, 186, 235, 0.12);

  context.strokeStyle = 'rgba(255,255,255,0.08)';
  context.lineWidth = 2;
  for (let i = 0; i <= 12; i += 1) {
    const y = (canvas.height / 12) * i;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createMarkerTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 72;
  canvas.height = 96;
  const context = canvas.getContext('2d');

  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  context.fillStyle = '#cf6225';
  context.beginPath();
  context.moveTo(36, 90);
  context.lineTo(23, 63);
  context.arc(36, 40, 24, Math.PI * 0.86, Math.PI * 0.14, true);
  context.closePath();
  context.fill();

  const gradient = context.createRadialGradient(28, 28, 4, 34, 34, 28);
  gradient.addColorStop(0, '#f9e39c');
  gradient.addColorStop(0.68, '#dba43f');
  gradient.addColorStop(1, '#b86424');
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(36, 34, 22, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = 'rgba(255,255,255,0.95)';
  context.beginPath();
  context.arc(36, 34, 9, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = 'rgba(255,255,255,0.95)';
  context.lineWidth = 3;
  context.beginPath();
  context.arc(36, 34, 22, 0, Math.PI * 2);
  context.stroke();

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
      opacity: 0.75,
    });
    const line = new THREE.LineLoop(geometry, material);
    group.add(line);
  });

  return group;
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

    const radius = 1;
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.18);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xd5e8ff, 1.1);
    keyLight.position.set(-2.4, 1.8, 2.7);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x6e9ed6, 0.48);
    fillLight.position.set(2.8, -0.8, 1.5);
    scene.add(fillLight);

    const texture = createGlobeTexture();
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 96, 96),
      new THREE.MeshPhongMaterial({
        map: texture,
        shininess: 8,
        emissive: new THREE.Color('#102137'),
        emissiveIntensity: 0.16,
      }),
    );
    globeGroup.add(globe);

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
      globeGroup.add(polygonToShape(polygon, radius, '#d7e7f7', 0.012));
    });

    [...overlays.borderPaths, ...overlays.outlinePaths].forEach((path) => {
      const positions = path.coords.map((coord) =>
        latLngToVector(coord.lat, coord.lng, radius + (path.kind === 'outline' ? 0.014 : 0.012)),
      );
      const geometry = new THREE.BufferGeometry().setFromPoints(positions);
      const material = new THREE.LineBasicMaterial({
        color: path.kind === 'outline' ? '#f4f8ff' : '#d4e4f6',
        transparent: true,
        opacity: path.kind === 'outline' ? 0.96 : 0.62,
      });
      const line = new THREE.Line(geometry, material);
      globeGroup.add(line);
    });

    const markerTexture = createMarkerTexture();
    const markerScale = REGION_CAMERA[region].markerScale;
    const markers = points.map((park) => {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: markerTexture,
          transparent: true,
          depthTest: false,
        }),
      );
      const position = latLngToVector(park.lat, park.lng, radius + 0.05);
      sprite.position.copy(position);
      sprite.scale.set(markerScale, markerScale * 1.28, 1);
      sprite.userData.park = park;
      globeGroup.add(sprite);
      return sprite;
    });

    const focus = latLngToVector(REGION_CAMERA[region].lat, REGION_CAMERA[region].lng, 1);
    camera.position.copy(focus.clone().multiplyScalar(REGION_CAMERA[region].distance));
    camera.lookAt(0, 0, 0);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    function render() {
      renderer.render(scene, camera);
    }

    function updateTooltip(sprite: THREE.Sprite | null) {
      if (!sprite) {
        setHovered(null);
        host.style.cursor = 'default';
        return;
      }

      const park = sprite.userData.park as ParkPoint;
      const projected = sprite.position.clone().project(camera);
      setHovered({
        park,
        x: ((projected.x + 1) / 2) * host.clientWidth,
        y: ((-projected.y + 1) / 2) * host.clientHeight,
      });
      host.style.cursor = 'pointer';
    }

    function handlePointerMove(event: PointerEvent) {
      const rect = host.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const intersections = raycaster.intersectObjects(markers);
      updateTooltip((intersections[0]?.object as THREE.Sprite | undefined) ?? null);
    }

    function handlePointerLeave() {
      updateTooltip(null);
    }

    function handleResize() {
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
      render();
    }

    host.addEventListener('pointermove', handlePointerMove);
    host.addEventListener('pointerleave', handlePointerLeave);

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(host);

    render();

    return () => {
      resizeObserver.disconnect();
      host.removeEventListener('pointermove', handlePointerMove);
      host.removeEventListener('pointerleave', handlePointerLeave);
      host.style.cursor = 'default';
      texture.dispose();
      markerTexture.dispose();
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

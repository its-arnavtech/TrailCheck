'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { PARK_MAP_PARKS, type ParkMapRegion } from '@/lib/park-map-data';

type ParkPoint = (typeof PARK_MAP_PARKS)[number];

type HoverState = {
  park: ParkPoint;
  x: number;
  y: number;
} | null;

const REGION_IMAGES: Record<ParkMapRegion, string> = {
  mainland: '/Map_of_US.jpg',
  alaska: '/Map_of_Alaska.jpg',
  hawaii: '/Map_of_Hawaii.jpg',
  pacific: '/Map_of_Samoa.png',
  caribbean: '/Map_of_Virgin_islands.jpg',
};

const REGION_ROTATION: Record<ParkMapRegion, { x: number; y: number }> = {
  mainland: { x: -0.18, y: -0.05 },
  alaska: { x: -0.22, y: -0.08 },
  hawaii: { x: -0.2, y: -0.06 },
  pacific: { x: -0.18, y: -0.05 },
  caribbean: { x: -0.18, y: -0.04 },
};

const REGION_CAMERA_Z: Record<ParkMapRegion, number> = {
  mainland: 2.28,
  alaska: 2.3,
  hawaii: 2.05,
  pacific: 2.1,
  caribbean: 2.14,
};

function createPinTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 72;
  canvas.height = 96;
  const context = canvas.getContext('2d');

  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = '#cf6225';
  context.beginPath();
  context.moveTo(36, 90);
  context.lineTo(23, 63);
  context.arc(36, 40, 24, Math.PI * 0.86, Math.PI * 0.14, true);
  context.closePath();
  context.fill();

  const gradient = context.createRadialGradient(28, 28, 4, 34, 34, 28);
  gradient.addColorStop(0, '#f8e7ad');
  gradient.addColorStop(0.66, '#d7a33d');
  gradient.addColorStop(1, '#b86a25');
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(36, 34, 22, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = 'rgba(255,255,255,0.94)';
  context.beginPath();
  context.arc(36, 34, 9, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = 'rgba(255,255,255,0.92)';
  context.lineWidth = 3;
  context.beginPath();
  context.arc(36, 34, 22, 0, Math.PI * 2);
  context.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default function ThreeMapPanel({
  label,
  region,
  className,
}: {
  label: string;
  region: ParkMapRegion;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<HoverState>(null);

  const parks = useMemo(
    () => PARK_MAP_PARKS.filter((park) => park.region === region),
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
      34,
      host.clientWidth / host.clientHeight,
      0.1,
      100,
    );
    camera.position.set(0, 0.08, REGION_CAMERA_Z[region]);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const root = new THREE.Group();
    root.rotation.x = REGION_ROTATION[region].x;
    root.rotation.y = REGION_ROTATION[region].y;
    scene.add(root);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.35);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xdbeeff, 1.15);
    keyLight.position.set(-2.5, 2.4, 2.8);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x6aa6ff, 0.45);
    rimLight.position.set(2.6, -1.2, 1.6);
    scene.add(rimLight);

    const textureLoader = new THREE.TextureLoader();
    const mapTexture = textureLoader.load(REGION_IMAGES[region], render);
    mapTexture.colorSpace = THREE.SRGBColorSpace;

    const panelWidth = 2.32;
    const panelHeight = 1.54;
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(panelWidth, panelHeight, 1, 1),
      new THREE.MeshStandardMaterial({
        map: mapTexture,
        roughness: 0.96,
        metalness: 0.02,
      }),
    );
    root.add(plane);

    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(panelWidth * 1.02, panelHeight * 1.04),
      new THREE.MeshBasicMaterial({
        color: 0x040b15,
        transparent: true,
        opacity: 0.18,
      }),
    );
    shadowPlane.position.set(0, -0.02, -0.03);
    root.add(shadowPlane);

    const markerTexture = createPinTexture();
    const sprites: THREE.Sprite[] = parks.map((park) => {
      const material = new THREE.SpriteMaterial({
        map: markerTexture,
        transparent: true,
        depthTest: false,
      });
      const sprite = new THREE.Sprite(material);
      const x = (park.x / 100 - 0.5) * panelWidth;
      const y = (0.5 - park.y / 100) * panelHeight;
      sprite.position.set(x, y, 0.03);
      sprite.scale.set(region === 'mainland' ? 0.072 : 0.11, region === 'mainland' ? 0.096 : 0.145, 1);
      sprite.userData.park = park;
      root.add(sprite);
      return sprite;
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    function updateTooltip(sprite: THREE.Sprite | null) {
      if (!sprite) {
        setHovered(null);
        host.style.cursor = 'default';
        return;
      }

      const park = sprite.userData.park as ParkPoint;
      const projected = sprite.position.clone().project(camera);
      const x = ((projected.x + 1) / 2) * host.clientWidth;
      const y = ((-projected.y + 1) / 2) * host.clientHeight;

      setHovered({ park, x, y });
      host.style.cursor = 'pointer';
    }

    function handlePointerMove(event: PointerEvent) {
      const rect = host.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const intersections = raycaster.intersectObjects(sprites);
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

      setHovered((current) => {
        if (!current) {
          return current;
        }

        const sprite = sprites.find((candidate) => candidate.userData.park.slug === current.park.slug);

        if (!sprite) {
          return null;
        }

        const projected = sprite.position.clone().project(camera);
        return {
          park: current.park,
          x: ((projected.x + 1) / 2) * host.clientWidth,
          y: ((-projected.y + 1) / 2) * host.clientHeight,
        };
      });
    }

    function render() {
      renderer.render(scene, camera);
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
      markerTexture.dispose();
      mapTexture.dispose();
      sprites.forEach((sprite) => {
        const material = sprite.material as THREE.SpriteMaterial;
        material.dispose();
      });
      (plane.material as THREE.MeshStandardMaterial).dispose();
      plane.geometry.dispose();
      (shadowPlane.material as THREE.MeshBasicMaterial).dispose();
      shadowPlane.geometry.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, [parks, region]);

  return (
    <article
      className={`group relative overflow-hidden rounded-[1.7rem] border border-white/12 bg-[linear-gradient(180deg,rgba(6,14,23,0.94),rgba(10,20,32,0.9))] shadow-[0_32px_90px_rgba(2,8,18,0.4)] ${className ?? ''}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(122,166,203,0.16),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_28%,rgba(3,10,18,0.12)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-3 sm:px-5">
        <span className="rounded-full border border-white/14 bg-black/18 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/74 backdrop-blur-md sm:text-[11px]">
          {label}
        </span>
      </div>

      <div ref={containerRef} className="absolute inset-0" />

      {hovered ? (
        <div
          ref={tooltipRef}
          className="pointer-events-none absolute z-30 w-max max-w-[15rem] -translate-x-1/2 -translate-y-[calc(100%+0.9rem)] rounded-2xl border border-white/14 bg-[rgba(8,14,22,0.92)] px-3 py-2 text-center shadow-[0_18px_48px_rgba(0,0,0,0.38)] backdrop-blur-md"
          style={{ left: hovered.x, top: hovered.y }}
        >
          <div className="text-xs font-semibold text-white sm:text-sm">{hovered.park.name}</div>
          <div className="mt-0.5 text-[11px] text-white/66 sm:text-xs">{hovered.park.state}</div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,8,15,0.08),transparent_32%,transparent_70%,rgba(2,8,15,0.24))]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(2,8,14,0.3))]" />
    </article>
  );
}

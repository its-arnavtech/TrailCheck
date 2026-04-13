export type MapSceneKey = 'mainland' | 'alaska' | 'hawaii' | 'pacific' | 'caribbean';

export type MapCameraPreset = {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  maxBounds: [[number, number], [number, number]];
};

export const TERRAIN_EXAGGERATION = 1.22;

export const INITIAL_CAMERA_OFFSET = {
  zoomDelta: -0.28,
  pitch: 28,
};

export const SCENE_TRANSITION_MS = 2200;

export const CAMERA_PRESETS: Record<MapSceneKey, MapCameraPreset> = {
  mainland: {
    center: [-98.6, 38.35],
    zoom: 2.92,
    pitch: 46,
    bearing: 5,
    maxBounds: [
      [-128.8, 22.2],
      [-65.0, 52.8],
    ],
  },
  alaska: {
    center: [-151.5, 63.8],
    zoom: 2.55,
    pitch: 44,
    bearing: 18,
    maxBounds: [
      [-179.8, 50.4],
      [-129.2, 72.8],
    ],
  },
  hawaii: {
    center: [-156.3, 20.45],
    zoom: 5.55,
    pitch: 50,
    bearing: -26,
    maxBounds: [
      [-161.8, 18.0],
      [-153.0, 23.2],
    ],
  },
  pacific: {
    center: [-170.7, -14.28],
    zoom: 8.45,
    pitch: 52,
    bearing: 10,
    maxBounds: [
      [-171.95, -14.7],
      [-168.95, -13.8],
    ],
  },
  caribbean: {
    center: [-64.85, 18.34],
    zoom: 8.35,
    pitch: 52,
    bearing: -18,
    maxBounds: [
      [-65.45, 17.9],
      [-64.3, 18.65],
    ],
  },
};

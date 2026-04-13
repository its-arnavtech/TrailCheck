import maplibregl, { type Map } from 'maplibre-gl';
import {
  CAMERA_PRESETS,
  INITIAL_CAMERA_OFFSET,
  SCENE_TRANSITION_MS,
  TERRAIN_EXAGGERATION,
  type MapSceneKey,
} from './mapConfig';
import { addUSGeoJsonLayers } from './USGeoJsonLayers';
import { MAP_SOURCES } from './mapSources';

function createSceneStyle(): maplibregl.StyleSpecification {
  return {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      imagery: MAP_SOURCES.imagery,
      terrain: MAP_SOURCES.terrain,
    },
    layers: [
      {
        id: 'scene-background',
        type: 'background',
        paint: {
          'background-color': '#06111d',
        },
      },
      {
        id: 'imagery',
        type: 'raster',
        source: 'imagery',
        minzoom: 0,
        maxzoom: 22,
        paint: {
          'raster-opacity': 1,
          'raster-saturation': -0.06,
          'raster-contrast': 0.22,
          'raster-brightness-min': 0.02,
          'raster-brightness-max': 0.96,
        },
      },
      {
        id: 'terrain-relief',
        type: 'hillshade',
        source: 'terrain',
        paint: {
          'hillshade-exaggeration': 0.34,
          'hillshade-shadow-color': '#040b16',
          'hillshade-highlight-color': '#f7fbff',
          'hillshade-accent-color': '#7aa1c7',
        },
      },
    ],
  };
}

function applyAtmosphere(map: Map) {
  const fogCapableMap = map as Map & {
    setFog?: (fog: {
      range: [number, number];
      color: string;
      'high-color': string;
      'space-color': string;
      'horizon-blend': number;
      'star-intensity': number;
    }) => void;
  };

  fogCapableMap.setFog?.({
    range: [0.45, 8],
    color: '#b9d7ef',
    'high-color': '#020814',
    'space-color': '#020814',
    'horizon-blend': 0.11,
    'star-intensity': 0,
  });
}

export function createUSMapScene(container: HTMLDivElement, sceneKey: MapSceneKey) {
  const preset = CAMERA_PRESETS[sceneKey];
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const map = new maplibregl.Map({
    container,
    style: createSceneStyle(),
    attributionControl: false,
    interactive: false,
    center: preset.center,
    zoom: preset.zoom + INITIAL_CAMERA_OFFSET.zoomDelta,
    pitch: INITIAL_CAMERA_OFFSET.pitch,
    bearing: preset.bearing,
    maxBounds: preset.maxBounds,
    renderWorldCopies: false,
  });

  map.once('load', () => {
    map.setTerrain({ source: 'terrain', exaggeration: TERRAIN_EXAGGERATION });
    applyAtmosphere(map);
    addUSGeoJsonLayers(map, sceneKey);

    if (reduceMotion) {
      map.jumpTo({
        center: preset.center,
        zoom: preset.zoom,
        pitch: preset.pitch,
        bearing: preset.bearing,
      });
      return;
    }

    map.easeTo({
      center: preset.center,
      zoom: preset.zoom,
      pitch: preset.pitch,
      bearing: preset.bearing,
      duration: SCENE_TRANSITION_MS,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });
  });

  return map;
}

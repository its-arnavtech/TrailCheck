import type {
  FillLayerSpecification,
  GeoJSONSourceSpecification,
  LineLayerSpecification,
  Map,
} from 'maplibre-gl';
import type { MapSceneKey } from './mapConfig';
import { getUSBoundaryData } from './usBoundariesData';

function getLayerIds(sceneKey: MapSceneKey) {
  return {
    polygonSource: `${sceneKey}-state-polygons`,
    borderSource: `${sceneKey}-state-borders`,
    outlineSource: `${sceneKey}-national-outline`,
    polygonLayer: `${sceneKey}-state-polygons-fill`,
    borderLayer: `${sceneKey}-state-borders-line`,
    outlineGlowLayer: `${sceneKey}-national-outline-glow`,
    outlineLayer: `${sceneKey}-national-outline-line`,
  };
}

export function addUSGeoJsonLayers(map: Map, sceneKey: MapSceneKey) {
  const ids = getLayerIds(sceneKey);
  const boundaryData = getUSBoundaryData(sceneKey);

  if (!map.getSource(ids.polygonSource)) {
    const polygonSource: GeoJSONSourceSpecification = {
      type: 'geojson',
      data: boundaryData.polygons,
      promoteId: 'code',
    };
    map.addSource(ids.polygonSource, polygonSource);
  }

  if (!map.getSource(ids.borderSource)) {
    map.addSource(ids.borderSource, {
      type: 'geojson',
      data: boundaryData.borders,
    });
  }

  if (!map.getSource(ids.outlineSource)) {
    map.addSource(ids.outlineSource, {
      type: 'geojson',
      data: boundaryData.outline,
    });
  }

  const polygonLayer: FillLayerSpecification = {
    id: ids.polygonLayer,
    type: 'fill',
    source: ids.polygonSource,
    paint: {
      'fill-color': '#f3f8ff',
      'fill-opacity': 0.01,
    },
  };

  const borderLayer: LineLayerSpecification = {
    id: ids.borderLayer,
    type: 'line',
    source: ids.borderSource,
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': 'rgba(224, 238, 255, 0.7)',
      'line-opacity': 0.72,
      'line-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        2,
        0.55,
        4,
        0.9,
        8,
        1.4,
      ],
    },
  };

  const outlineGlowLayer: LineLayerSpecification = {
    id: ids.outlineGlowLayer,
    type: 'line',
    source: ids.outlineSource,
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': 'rgba(4, 11, 21, 0.72)',
      'line-opacity': 0.8,
      'line-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        2,
        1.5,
        4,
        2.6,
        8,
        3.8,
      ],
      'line-blur': 0.35,
    },
  };

  const outlineLayer: LineLayerSpecification = {
    id: ids.outlineLayer,
    type: 'line',
    source: ids.outlineSource,
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': 'rgba(247, 251, 255, 0.92)',
      'line-opacity': 0.96,
      'line-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        2,
        0.9,
        4,
        1.35,
        8,
        2.15,
      ],
    },
  };

  if (!map.getLayer(ids.polygonLayer)) {
    map.addLayer(polygonLayer);
  }

  if (!map.getLayer(ids.borderLayer)) {
    map.addLayer(borderLayer);
  }

  if (!map.getLayer(ids.outlineGlowLayer)) {
    map.addLayer(outlineGlowLayer);
  }

  if (!map.getLayer(ids.outlineLayer)) {
    map.addLayer(outlineLayer);
  }
}

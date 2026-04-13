import type { Feature, MultiLineString, Position } from 'geojson';
import type { MapSceneKey } from './mapConfig';
import { getUSBoundaryData } from './usBoundariesData';

export type GlobePath = {
  kind: 'border' | 'outline';
  coords: Array<{ lat: number; lng: number }>;
};

function positionsToLatLng(positions: Position[]) {
  return positions.map(([lng, lat]) => ({ lat, lng }));
}

function multiLineStringToPaths(
  feature: Feature<MultiLineString>,
  kind: GlobePath['kind'],
): GlobePath[] {
  return feature.geometry.coordinates.map((line) => ({
    kind,
    coords: positionsToLatLng(line),
  }));
}

export function getUSGlobeOverlays(sceneKey: MapSceneKey) {
  const boundaryData = getUSBoundaryData(sceneKey);

  return {
    polygons: boundaryData.polygons.features,
    borderPaths: multiLineStringToPaths(boundaryData.borders, 'border'),
    outlinePaths: multiLineStringToPaths(boundaryData.outline, 'outline'),
  };
}

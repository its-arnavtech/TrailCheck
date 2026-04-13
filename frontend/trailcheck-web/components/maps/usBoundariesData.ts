import type { Feature, FeatureCollection, GeoJsonProperties, MultiLineString, MultiPolygon, Polygon } from 'geojson';
import { feature, mesh } from 'topojson-client';
import statesTopology from 'us-atlas/states-10m.json';
import type { MapSceneKey } from './mapConfig';

type BoundaryBundle = {
  polygons: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>;
  outline: Feature<MultiLineString, GeoJsonProperties>;
  borders: Feature<MultiLineString, GeoJsonProperties>;
};

type TopologyGeometry = {
  id: string;
  properties?: {
    name?: string;
  };
};

type StatesTopology = {
  objects: {
    states: {
      type: 'GeometryCollection';
      geometries: TopologyGeometry[];
    };
  };
};

const SCENE_CODES: Record<MapSceneKey, string[]> = {
  mainland: [
    '01',
    '04',
    '05',
    '08',
    '09',
    '10',
    '11',
    '12',
    '13',
    '16',
    '17',
    '18',
    '19',
    '20',
    '21',
    '22',
    '23',
    '24',
    '25',
    '26',
    '27',
    '28',
    '29',
    '30',
    '31',
    '32',
    '33',
    '34',
    '35',
    '36',
    '37',
    '38',
    '39',
    '40',
    '41',
    '42',
    '44',
    '45',
    '46',
    '47',
    '48',
    '49',
    '50',
    '51',
    '53',
    '54',
    '55',
    '56',
  ],
  alaska: ['02'],
  hawaii: ['15'],
  pacific: ['60'],
  caribbean: ['78'],
};

const topology = statesTopology as StatesTopology;

function buildSceneBoundaries(sceneKey: MapSceneKey): BoundaryBundle {
  const includedCodes = new Set(SCENE_CODES[sceneKey]);
  const geometries = topology.objects.states.geometries.filter((geometry) => includedCodes.has(geometry.id));
  const geometryCollection = {
    type: 'GeometryCollection' as const,
    geometries,
  };

  const polygons = feature(topology as never, geometryCollection as never) as unknown as FeatureCollection<
    Polygon | MultiPolygon,
    GeoJsonProperties
  >;

  const normalizedPolygons: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties> = {
    type: 'FeatureCollection',
    features: polygons.features.map((stateFeature) => ({
      ...stateFeature,
      id: String(stateFeature.id ?? stateFeature.properties?.code ?? ''),
      properties: {
        ...stateFeature.properties,
        code: String(stateFeature.id ?? stateFeature.properties?.code ?? ''),
        name: String(stateFeature.properties?.name ?? ''),
      },
    })),
  };

  const outline = {
    type: 'Feature' as const,
    properties: { scene: sceneKey, boundaryRole: 'outline' },
    geometry: mesh(topology as never, geometryCollection as never, (a, b) => a === b) as MultiLineString,
  };

  const borders = {
    type: 'Feature' as const,
    properties: { scene: sceneKey, boundaryRole: 'borders' },
    geometry: mesh(topology as never, geometryCollection as never, (a, b) => a !== b) as MultiLineString,
  };

  return {
    polygons: normalizedPolygons,
    outline,
    borders,
  };
}

const BOUNDARY_DATA: Record<MapSceneKey, BoundaryBundle> = {
  mainland: buildSceneBoundaries('mainland'),
  alaska: buildSceneBoundaries('alaska'),
  hawaii: buildSceneBoundaries('hawaii'),
  pacific: buildSceneBoundaries('pacific'),
  caribbean: buildSceneBoundaries('caribbean'),
};

export function getUSBoundaryData(sceneKey: MapSceneKey) {
  return BOUNDARY_DATA[sceneKey];
}

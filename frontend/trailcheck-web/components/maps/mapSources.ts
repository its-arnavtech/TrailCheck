export const MAP_SOURCES = {
  imagery: {
    type: 'raster' as const,
    tiles: [
      'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}',
    ],
    tileSize: 256,
    minzoom: 0,
    maxzoom: 16,
    attribution: 'Imagery (c) USGS The National Map',
  },
  terrain: {
    type: 'raster-dem' as const,
    tiles: ['https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png'],
    tileSize: 256,
    maxzoom: 15,
    encoding: 'terrarium' as const,
    attribution: 'Elevation tiles (c) AWS Terrain Tiles',
  },
};

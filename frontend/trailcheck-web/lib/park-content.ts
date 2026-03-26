export type ParkVisual = {
  imageUrl: string;
  imageAlt: string;
  eyebrow: string;
  tagline: string;
};

export const PARK_VISUALS: Record<string, ParkVisual> = {
  yosemite: {
    imageUrl:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Tunnel%20View,%20Yosemite%20Valley,%20Yosemite%20NP%20-%20Diliff.jpg',
    imageAlt: 'Tunnel View looking into Yosemite Valley in Yosemite National Park.',
    eyebrow: 'Granite icons',
    tagline: 'Waterfalls, domes, and long alpine trail days.',
  },
  zion: {
    imageUrl:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Zion%20Canyon,%20Zion%20National%20Park,%20Utah%20(1025259753).jpg',
    imageAlt: 'Red canyon walls rising above Zion Canyon in Zion National Park.',
    eyebrow: 'Canyon walls',
    tagline: 'Sheer sandstone, river walks, and dramatic elevation.',
  },
  yellowstone: {
    imageUrl:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Landscape%20of%20Yellowstone.jpg',
    imageAlt: 'A broad Yellowstone landscape with forest and geothermal terrain.',
    eyebrow: 'Geothermal country',
    tagline: 'Basins, overlooks, and big open wilderness.',
  },
  'grand-canyon': {
    imageUrl:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Grand%20Canyon%20-%20from%20south%20rim.jpg',
    imageAlt: 'Grand Canyon viewed from the South Rim.',
    eyebrow: 'Layered vistas',
    tagline: 'Rim walks, steep descents, and unforgettable views.',
  },
  acadia: {
    imageUrl:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Acadia%20National%20Park.jpg',
    imageAlt: 'Rocky Acadia shoreline and coastal landscape.',
    eyebrow: 'Coastal granite',
    tagline: 'Ocean edge hikes with cliffs, peaks, and sunrise light.',
  },
  'big-bend': {
    imageUrl:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Big%20Bend%20National%20Park%2002.jpg',
    imageAlt: 'Desert mountains and wide open landscape in Big Bend National Park.',
    eyebrow: 'Desert vastness',
    tagline: 'Remote ridgelines, canyons, and big sky terrain.',
  },
};

export function getParkVisual(slug: string): ParkVisual {
  return (
    PARK_VISUALS[slug] ?? {
      imageUrl:
        'https://commons.wikimedia.org/wiki/Special:FilePath/Landscape%20of%20Yellowstone.jpg',
      imageAlt: 'Scenic national park landscape.',
      eyebrow: 'National park',
      tagline: 'Browse trails and current conditions.',
    }
  );
}

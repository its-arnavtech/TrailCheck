import { cache } from 'react';

export type ParkVisual = {
  imageUrl: string;
  imageAlt: string;
  eyebrow: string;
  tagline: string;
};

type ParkCopy = {
  eyebrow: string;
  tagline: string;
};

const DEFAULT_VISUAL_IMAGE =
  'https://commons.wikimedia.org/wiki/Special:FilePath/Landscape%20of%20Yellowstone.jpg';

const PARK_COPY: Record<string, ParkCopy> = {
  acadia: {
    eyebrow: 'Coastal granite',
    tagline: 'Ocean edge hikes with cliffs, peaks, and sunrise light.',
  },
  'big-bend': {
    eyebrow: 'Desert vastness',
    tagline: 'Remote ridgelines, canyons, and big sky terrain.',
  },
  'grand-canyon': {
    eyebrow: 'Layered vistas',
    tagline: 'Rim walks, steep descents, and unforgettable views.',
  },
  'hot-springs': {
    eyebrow: 'Historic springs',
    tagline: 'Wooded hills, bathhouse history, and short scenic walks.',
  },
  yosemite: {
    eyebrow: 'Granite icons',
    tagline: 'Waterfalls, domes, and long alpine trail days.',
  },
  yellowstone: {
    eyebrow: 'Geothermal country',
    tagline: 'Basins, overlooks, and big open wilderness.',
  },
  zion: {
    eyebrow: 'Canyon walls',
    tagline: 'Sheer sandstone, river walks, and dramatic elevation.',
  },
};

const STATIC_VISUALS: Record<string, Pick<ParkVisual, 'imageUrl' | 'imageAlt'>> = {
  yosemite: {
    imageUrl:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Tunnel%20View,%20Yosemite%20Valley,%20Yosemite%20NP%20-%20Diliff.jpg',
    imageAlt: 'Tunnel View looking into Yosemite Valley in Yosemite National Park.',
  },
  zion: {
    imageUrl:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Zion%20Canyon,%20Zion%20National%20Park,%20Utah%20(1025259753).jpg',
    imageAlt: 'Red canyon walls rising above Zion Canyon in Zion National Park.',
  },
  yellowstone: {
    imageUrl:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Landscape%20of%20Yellowstone.jpg',
    imageAlt: 'A broad Yellowstone landscape with forest and geothermal terrain.',
  },
  'grand-canyon': {
    imageUrl:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Grand%20Canyon%20-%20from%20south%20rim.jpg',
    imageAlt: 'Grand Canyon viewed from the South Rim.',
  },
  acadia: {
    imageUrl:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Acadia%20National%20Park.jpg',
    imageAlt: 'Rocky Acadia shoreline and coastal landscape.',
  },
  'big-bend': {
    imageUrl:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Big%20Bend%20National%20Park%2002.jpg',
    imageAlt: 'Desert mountains and wide open landscape in Big Bend National Park.',
  },
};

const LANDING_TILE_IMAGES: Record<string, string> = {
  acadia: '/Park_images/Acadia.jpg',
  'american-samoa': '/Park_images/American_Samoa.jpg',
  arches: '/Park_images/Arches.jpg',
  badlands: '/Park_images/Badlands.jpg',
  'big-bend': '/Park_images/Big_bend.jpg',
  biscayne: '/Park_images/Biscayne.jpg',
  'black-canyon-of-the-gunnison': '/Park_images/Black_canyon_of_gunnison.jpg',
  'bryce-canyon': '/Park_images/bryce_canyon.jpg',
  canyonlands: '/Park_images/Canyonlands.jpg',
  'capitol-reef': '/Park_images/capitol_reef.jpg',
  'carlsbad-caverns': '/Park_images/carlsbad.jpg',
  'channel-islands': '/Park_images/channel_islands.jpg',
  congaree: '/Park_images/congaree.jpg',
  'crater-lake': '/Park_images/crater_lake.jpg',
  'cuyahoga-valley': '/Park_images/cuyahoga.jpg',
  'death-valley': '/Park_images/death_valley.jpg',
  denali: '/Park_images/denali.jpg',
  'dry-tortugas': '/Park_images/dry_tortugas.jpg',
  everglades: '/Park_images/everglades.jpg',
  'gates-of-the-arctic': '/Park_images/gates_of_the_arctic.jpg',
  'gateway-arch': '/Park_images/gateway_arch.jpg',
  glacier: '/Park_images/glacier.jpg',
  'glacier-bay': '/Park_images/glacier_bay.jpg',
  'grand-canyon': '/Park_images/grand_canyon.jpg',
  'grand-teton': '/Park_images/grand_teton.jpg',
  'great-basin': '/Park_images/great_basin.jpg',
  'great-sand-dunes': '/Park_images/great_sand_dunes.jpg',
  'great-smoky-mountains': '/Park_images/great_smoky_mountains.jpg',
  'guadalupe-mountains': '/Park_images/guadalupe.jpg',
  haleakala: '/Park_images/haleakala.jpg',
  'hawaii-volcanoes': '/Park_images/hawaii_volcanoes.jpg',
  'hot-springs': '/Park_images/hot_springs.jpg',
  'indiana-dunes': '/Park_images/indiana_dunes.jpg',
  'isle-royale': '/Park_images/isle_royale.jpg',
  'joshua-tree': '/Park_images/joshua_tree.jpg',
  katmai: '/Park_images/katmai.jpg',
  'kenai-fjords': '/Park_images/kenai_fjords.jpg',
  'kings-canyon': '/Park_images/kings_canyon.jpg',
  'kobuk-valley': '/Park_images/kobuk_valley.jpg',
  'lake-clark': '/Park_images/lake_clark.jpg',
  'lassen-volcanic': '/Park_images/lassen.jpg',
  'mammoth-cave': '/Park_images/mammoth_cave.jpg',
  'mesa-verde': '/Park_images/mesa_verde.jpg',
  'mount-rainier': '/Park_images/mount_rainier.jpg',
  'new-river-gorge': '/Park_images/new_river_gorge.jpg',
  'north-cascades': '/Park_images/north_cascades.jpg',
  olympic: '/Park_images/olympic.jpg',
  'petrified-forest': '/Park_images/petrified_forest.jpg',
  pinnacles: '/Park_images/pinnacles.jpg',
  redwood: '/Park_images/redwood.jpg',
  'rocky-mountain': '/Park_images/rocky_mountain.jpg',
  saguaro: '/Park_images/saguaro.jpg',
  sequoia: '/Park_images/sequoia.jpg',
  shenandoah: '/Park_images/shennandoah.jpg',
  'theodore-roosevelt': '/Park_images/theodore_roosevelt.jpg',
  'virgin-islands': '/Park_images/virgin_islands.jpg',
  voyageurs: '/Park_images/voyageurs.jpg',
  'white-sands': '/Park_images/white_sands.jpg',
  'wind-cave': '/Park_images/wind_cave.jpg',
  'wrangell-st-elias': '/Park_images/wrangell.jpg',
  yellowstone: '/Park_images/yellowstone.jpg',
  yosemite: '/Park_images/Yosemite.jpg',
  zion: '/Park_images/zion.jpg',
};

function getVisualKey(slug: string) {
  return slug;
}

function toWikipediaTitle(slug: string, parkName: string) {
  const specialTitles: Record<string, string> = {
    'american-samoa': 'National_Park_of_American_Samoa',
    'hot-springs': 'Hot_Springs_National_Park',
    'virgin-islands': 'Virgin_Islands_National_Park',
  };

  return specialTitles[slug] ?? `${parkName.replaceAll('.', '')}_National_Park`.replaceAll(' ', '_');
}

function getFallbackVisual(slug: string, parkName: string): ParkVisual {
  const visualKey = getVisualKey(slug);
  const copy = PARK_COPY[visualKey] ?? {
    eyebrow: 'National park',
    tagline: 'Browse trails and current conditions.',
  };
  const staticVisual = STATIC_VISUALS[visualKey];

  return {
    imageUrl: staticVisual?.imageUrl ?? DEFAULT_VISUAL_IMAGE,
    imageAlt: staticVisual?.imageAlt ?? `${parkName} National Park landscape.`,
    eyebrow: copy.eyebrow,
    tagline: copy.tagline,
  };
}

const fetchWikipediaThumbnail = cache(async (slug: string, parkName: string) => {
  const title = toWikipediaTitle(slug, parkName);
  const response = await fetch(`https://en.wikipedia.org/w/rest.php/v1/page/${title}`, {
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    thumbnail?: { url?: string };
    title?: string;
  };

  if (!data.thumbnail?.url) {
    return null;
  }

  return {
    imageUrl: data.thumbnail.url,
    imageAlt: `${data.title ?? parkName} landscape.`,
  };
});

export async function getParkVisual(slug: string, parkName: string): Promise<ParkVisual> {
  const fallback = getFallbackVisual(slug, parkName);

  try {
    const wikipediaImage = await fetchWikipediaThumbnail(slug, parkName);
    if (!wikipediaImage) {
      return fallback;
    }

    return {
      ...fallback,
      imageUrl: wikipediaImage.imageUrl,
      imageAlt: wikipediaImage.imageAlt,
    };
  } catch {
    return fallback;
  }
}

export async function getParkVisualMap(
  parks: Array<{ slug: string; name: string }>,
): Promise<Record<string, ParkVisual>> {
  const visuals = parks.map((park) => {
    const fallback = getFallbackVisual(park.slug, park.name);
    const localTileImage = LANDING_TILE_IMAGES[park.slug];

    return [
      park.slug,
      localTileImage
        ? {
            ...fallback,
            imageUrl: localTileImage,
            imageAlt: `${park.name} National Park landscape.`,
          }
        : fallback,
    ] as const;
  });

  return Object.fromEntries(visuals);
}

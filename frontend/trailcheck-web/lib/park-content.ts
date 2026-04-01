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

function getVisualKey(slug: string) {
  if (slug.startsWith('yellowstone-')) {
    return 'yellowstone';
  }

  return slug;
}

function toWikipediaTitle(slug: string, parkName: string) {
  const specialTitles: Record<string, string> = {
    'american-samoa': 'National_Park_of_American_Samoa',
    'hot-springs': 'Hot_Springs_National_Park',
    'virgin-islands': 'Virgin_Islands_National_Park',
  };

  if (slug.startsWith('yellowstone-')) {
    return 'Yellowstone_National_Park';
  }

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
  const visuals = await Promise.all(
    parks.map(async (park) => [park.slug, await getParkVisual(park.slug, park.name)] as const),
  );

  return Object.fromEntries(visuals);
}

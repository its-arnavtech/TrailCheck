import photoCredits from "./park-photo-credits.json";
export type ParkVisual = {
  imageUrl: string;
  imageAlt: string;
  eyebrow: string;
  tagline: string;
  credit?: string;
  sourceUrl?: string;
};
type ParkCopy = { eyebrow: string; tagline: string };

const PARK_COPY: Record<string, ParkCopy> = {
  acadia: {
    eyebrow: "Coastal granite",
    tagline: "Ocean edge hikes with cliffs, peaks, and sunrise light.",
  },
  "big-bend": {
    eyebrow: "Desert vastness",
    tagline: "Remote ridgelines, canyons, and big sky terrain.",
  },
  "grand-canyon": {
    eyebrow: "Layered vistas",
    tagline: "Rim walks, steep descents, and unforgettable views.",
  },
  "hot-springs": {
    eyebrow: "Historic springs",
    tagline: "Wooded hills, bathhouse history, and short scenic walks.",
  },
  yosemite: {
    eyebrow: "Granite icons",
    tagline: "Waterfalls, domes, and long alpine trail days.",
  },
  yellowstone: {
    eyebrow: "Geothermal country",
    tagline: "Basins, overlooks, and big open wilderness.",
  },
  zion: {
    eyebrow: "Canyon walls",
    tagline: "Sheer sandstone, river walks, and dramatic elevation.",
  },
};

const LANDING_TILE_IMAGES: Record<string, string> = {
  acadia: "/Park_images/Acadia.jpg",
  "american-samoa": "/Park_images/American_Samoa.jpg",
  arches: "/Park_images/Arches.jpg",
  badlands: "/Park_images/Badlands.jpg",
  "big-bend": "/Park_images/Big_bend.jpg",
  biscayne: "/Park_images/Biscayne.jpg",
  "black-canyon-of-the-gunnison": "/Park_images/Black_canyon_of_gunnison.jpg",
  "bryce-canyon": "/Park_images/bryce_canyon.jpg",
  canyonlands: "/Park_images/Canyonlands.jpg",
  "capitol-reef": "/Park_images/capitol_reef.jpg",
  "carlsbad-caverns": "/Park_images/carlsbad.jpg",
  "channel-islands": "/Park_images/channel_islands.jpg",
  congaree: "/Park_images/congaree.jpg",
  "crater-lake": "/Park_images/crater_lake.jpg",
  "cuyahoga-valley": "/Park_images/cuyahoga.jpg",
  "death-valley": "/Park_images/death_valley.jpg",
  denali: "/Park_images/denali.jpg",
  "dry-tortugas": "/Park_images/dry_tortugas.jpg",
  everglades: "/Park_images/everglades.jpg",
  "gates-of-the-arctic": "/Park_images/gates_of_the_arctic.jpg",
  "gateway-arch": "/Park_images/gateway_arch.jpg",
  glacier: "/Park_images/glacier.jpg",
  "glacier-bay": "/Park_images/glacier_bay.jpg",
  "grand-canyon": "/Park_images/grand_canyon.jpg",
  "grand-teton": "/Park_images/grand_teton.jpg",
  "great-basin": "/Park_images/great_basin.jpg",
  "great-sand-dunes": "/Park_images/great_sand_dunes.jpg",
  "great-smoky-mountains": "/Park_images/great_smoky_mountains.jpg",
  "guadalupe-mountains": "/Park_images/guadalupe.jpg",
  haleakala: "/Park_images/haleakala.jpg",
  "hawaii-volcanoes": "/Park_images/hawaii_volcanoes.jpg",
  "hot-springs": "/Park_images/hot_springs.jpg",
  "indiana-dunes": "/Park_images/indiana_dunes.jpg",
  "isle-royale": "/Park_images/isle_royale.jpg",
  "joshua-tree": "/Park_images/joshua_tree.jpg",
  katmai: "/Park_images/katmai.jpg",
  "kenai-fjords": "/Park_images/kenai_fjords.jpg",
  "kings-canyon": "/Park_images/kings_canyon.jpg",
  "kobuk-valley": "/Park_images/kobuk_valley.jpg",
  "lake-clark": "/Park_images/lake_clark.jpg",
  "lassen-volcanic": "/Park_images/lassen.jpg",
  "mammoth-cave": "/Park_images/mammoth_cave.jpg",
  "mesa-verde": "/Park_images/mesa_verde.jpg",
  "mount-rainier": "/Park_images/mount_rainier.jpg",
  "new-river-gorge": "/Park_images/new_river_gorge.jpg",
  "north-cascades": "/Park_images/north_cascades.jpg",
  olympic: "/Park_images/olympic.jpg",
  "petrified-forest": "/Park_images/petrified_forest.jpg",
  pinnacles: "/Park_images/pinnacles.jpg",
  redwood: "/Park_images/redwood.jpg",
  "rocky-mountain": "/Park_images/rocky_mountain.jpg",
  saguaro: "/Park_images/saguaro.jpg",
  sequoia: "/Park_images/sequoia.jpg",
  shenandoah: "/Park_images/shennandoah.jpg",
  "theodore-roosevelt": "/Park_images/theodore_roosevelt.jpg",
  "virgin-islands": "/Park_images/virgin_islands.jpg",
  voyageurs: "/Park_images/voyageurs.jpg",
  "white-sands": "/Park_images/white_sands.jpg",
  "wind-cave": "/Park_images/wind_cave.jpg",
  "wrangell-st-elias": "/Park_images/wrangell.jpg",
  yellowstone: "/Park_images/yellowstone.jpg",
  yosemite: "/Park_images/Yosemite.jpg",
  zion: "/Park_images/zion.jpg",
};

export async function getParkVisual(
  slug: string,
  parkName: string,
): Promise<ParkVisual> {
  const photo = (
    photoCredits as Record<
      string,
      { imageUrl: string; imageAlt: string; credit: string; pageUrl: string }
    >
  )[slug];
  const imageUrl = photo?.imageUrl ?? LANDING_TILE_IMAGES[slug];
  const copy = PARK_COPY[slug] ?? {
    eyebrow: "National park",
    tagline: "A new perspective. A little more outside.",
  };
  return {
    ...copy,
    imageUrl: imageUrl ?? "/images/yosemite-inspired-hero.webp",
    imageAlt:
      photo?.imageAlt ??
      (imageUrl
        ? parkName + " National Park landscape."
        : "Yosemite-inspired scenic illustration; a photograph of this park is unavailable."),
    credit: photo?.credit,
    sourceUrl: photo?.pageUrl,
  };
}

export async function getParkVisualMap(
  parks: Array<{ slug: string; name: string }>,
): Promise<Record<string, ParkVisual>> {
  return Object.fromEntries(
    await Promise.all(
      parks.map(
        async (park) =>
          [park.slug, await getParkVisual(park.slug, park.name)] as const,
      ),
    ),
  );
}

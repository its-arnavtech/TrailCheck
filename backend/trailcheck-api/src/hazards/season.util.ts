import type { Hemisphere } from '../parks/park-registry';
import type { Season } from './hazard.types';

type SeasonalBoundary = {
  month: number;
  day: number;
  season: Season;
};

const NORTHERN_BOUNDARIES: SeasonalBoundary[] = [
  { month: 3, day: 20, season: 'spring' },
  { month: 6, day: 21, season: 'summer' },
  { month: 9, day: 22, season: 'fall' },
  { month: 12, day: 21, season: 'winter' },
];

const SOUTHERN_SEASON_LOOKUP: Record<Season, Season> = {
  winter: 'summer',
  spring: 'fall',
  summer: 'winter',
  fall: 'spring',
};

export function resolveSeason(date = new Date(), hemisphere: Hemisphere = 'north'): Season {
  const utcMonth = date.getUTCMonth() + 1;
  const utcDay = date.getUTCDate();

  let season: Season = 'winter';

  for (const boundary of NORTHERN_BOUNDARIES) {
    if (
      utcMonth > boundary.month ||
      (utcMonth === boundary.month && utcDay >= boundary.day)
    ) {
      season = boundary.season;
    }
  }

  return hemisphere === 'south' ? SOUTHERN_SEASON_LOOKUP[season] : season;
}

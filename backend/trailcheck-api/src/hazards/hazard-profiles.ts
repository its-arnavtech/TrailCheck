import {
  type HazardPriority,
  type HazardRuleSetting,
  type HazardProfileId,
  type SeasonalHazardProfile,
} from './hazard.types';

function rule(priority: HazardPriority, weight?: number, note?: string): HazardRuleSetting {
  const defaultWeight: Record<HazardPriority, number> = {
    ignore: 0,
    low: 0.7,
    medium: 1,
    high: 1.2,
    critical: 1.45,
  };

  return {
    priority,
    weight: weight ?? defaultWeight[priority],
    note,
  };
}

export const HAZARD_PROFILES: Record<HazardProfileId, SeasonalHazardProfile> = {
  desert: {
    id: 'desert',
    label: 'Desert',
    description: 'Hot, dry parks where exposure, dehydration, wind, and fire matter most.',
    seasons: {
      winter: {
        COLD: rule('low'),
        HIGH_WIND: rule('medium'),
        FLOODING: rule('low'),
        SNOW_ICE: rule('ignore'),
      },
      spring: {
        HEAT: rule('medium'),
        HIGH_WIND: rule('high'),
        FLOODING: rule('medium'),
        ROCKFALL: rule('medium'),
        LIGHTNING: rule('low'),
      },
      summer: {
        HEAT: rule('critical'),
        DEHYDRATION: rule('critical'),
        WILDFIRE: rule('high'),
        HIGH_WIND: rule('medium'),
        LIGHTNING: rule('medium'),
        SNOW_ICE: rule('ignore'),
      },
      fall: {
        HEAT: rule('medium'),
        DEHYDRATION: rule('medium'),
        HIGH_WIND: rule('high'),
        ROCKFALL: rule('medium'),
        COLD: rule('low'),
      },
    },
  },
  canyon_exposure: {
    id: 'canyon_exposure',
    label: 'Canyon / High Exposure',
    description:
      'Cliff, slickrock, and slot-canyon terrain with flash flood, fall, and exposure sensitivity.',
    seasons: {
      winter: {
        HIGH_WIND: rule('medium'),
        ROCKFALL: rule('medium'),
        COLD: rule('low'),
        SNOW_ICE: rule('low'),
      },
      spring: {
        FLOODING: rule('high'),
        ROCKFALL: rule('high'),
        HIGH_WIND: rule('medium'),
        LIGHTNING: rule('low'),
      },
      summer: {
        HEAT: rule('high'),
        DEHYDRATION: rule('high'),
        FLOODING: rule('high'),
        ROCKFALL: rule('high'),
        LIGHTNING: rule('medium'),
        SNOW_ICE: rule('ignore'),
      },
      fall: {
        HIGH_WIND: rule('medium'),
        ROCKFALL: rule('medium'),
        SLIPPERY_TRAILS: rule('low'),
        COLD: rule('low'),
      },
    },
  },
  alpine: {
    id: 'alpine',
    label: 'Alpine / Mountain',
    description: 'High-elevation parks where snowpack, ice, wind, and shoulder-season access drive risk.',
    seasons: {
      winter: {
        SNOW_ICE: rule('critical'),
        COLD: rule('high'),
        HIGH_WIND: rule('medium'),
        TRAIL_CLOSURE: rule('high'),
        HEAT: rule('ignore'),
      },
      spring: {
        SNOW_ICE: rule('high'),
        FLOODING: rule('medium'),
        MUD: rule('medium'),
        ROCKFALL: rule('medium'),
        FREEZE_THAW: rule('high'),
      },
      summer: {
        LIGHTNING: rule('medium'),
        HIGH_WIND: rule('medium'),
        WILDFIRE: rule('medium'),
        ROCKFALL: rule('medium'),
        HEAT: rule('low'),
      },
      fall: {
        SNOW_ICE: rule('high'),
        FREEZE_THAW: rule('high'),
        HIGH_WIND: rule('medium'),
        SLIPPERY_TRAILS: rule('medium'),
        COLD: rule('medium'),
      },
    },
  },
  temperate_forest: {
    id: 'temperate_forest',
    label: 'Temperate Forest',
    description: 'Forested parks with rain, runoff, mud, leaf cover, and wind-driven tree hazards.',
    seasons: {
      winter: {
        SNOW_ICE: rule('medium'),
        COLD: rule('low'),
        HIGH_WIND: rule('medium'),
        FLOODING: rule('low'),
      },
      spring: {
        FLOODING: rule('high'),
        MUD: rule('high'),
        HIGH_WIND: rule('medium'),
        LIGHTNING: rule('low'),
        SLIPPERY_TRAILS: rule('medium'),
      },
      summer: {
        LIGHTNING: rule('medium'),
        HEAT: rule('low'),
        HIGH_WIND: rule('low'),
        FLOODING: rule('low'),
      },
      fall: {
        SLIPPERY_TRAILS: rule('high'),
        HIGH_WIND: rule('medium'),
        FREEZE_THAW: rule('medium'),
        COLD: rule('low'),
      },
    },
  },
  coastal: {
    id: 'coastal',
    label: 'Coastal / Island',
    description: 'Coastal and island parks where marine weather, surf, wind, and storm access matter.',
    seasons: {
      winter: {
        COASTAL_HAZARD: rule('high'),
        HIGH_WIND: rule('high'),
        FLOODING: rule('medium'),
      },
      spring: {
        COASTAL_HAZARD: rule('medium'),
        FLOODING: rule('medium'),
        MUD: rule('low'),
        HIGH_WIND: rule('medium'),
      },
      summer: {
        COASTAL_HAZARD: rule('medium'),
        LIGHTNING: rule('medium'),
        HEAT: rule('low'),
        HIGH_WIND: rule('low'),
      },
      fall: {
        COASTAL_HAZARD: rule('high'),
        HIGH_WIND: rule('high'),
        FLOODING: rule('medium'),
        SLIPPERY_TRAILS: rule('low'),
      },
    },
  },
  subarctic: {
    id: 'subarctic',
    label: 'Subarctic',
    description: 'Far-north parks where cold exposure, snow, wind, remote access, and shoulder thaw dominate.',
    seasons: {
      winter: {
        SNOW_ICE: rule('critical'),
        COLD: rule('critical'),
        TRAIL_CLOSURE: rule('high'),
        HIGH_WIND: rule('medium'),
      },
      spring: {
        SNOW_ICE: rule('high'),
        FREEZE_THAW: rule('high'),
        FLOODING: rule('medium'),
        MUD: rule('medium'),
      },
      summer: {
        FLOODING: rule('medium'),
        HIGH_WIND: rule('medium'),
        WILDFIRE: rule('low'),
        TRAIL_CLOSURE: rule('medium'),
      },
      fall: {
        COLD: rule('high'),
        SNOW_ICE: rule('high'),
        FREEZE_THAW: rule('high'),
        HIGH_WIND: rule('medium'),
      },
    },
  },
  swamp_wetland: {
    id: 'swamp_wetland',
    label: 'Swamp / Wetland',
    description: 'Low-lying wet parks where flooding, storms, lightning, and standing water drive access risk.',
    seasons: {
      winter: {
        FLOODING: rule('medium'),
        HIGH_WIND: rule('low'),
        COASTAL_HAZARD: rule('low'),
      },
      spring: {
        FLOODING: rule('high'),
        MUD: rule('high'),
        LIGHTNING: rule('medium'),
      },
      summer: {
        HEAT: rule('high'),
        DEHYDRATION: rule('medium'),
        LIGHTNING: rule('high'),
        FLOODING: rule('medium'),
      },
      fall: {
        FLOODING: rule('medium'),
        HIGH_WIND: rule('medium'),
        SLIPPERY_TRAILS: rule('low'),
      },
    },
  },
};

export { rule as createHazardRule };

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Literal

Season = Literal["winter", "spring", "summer", "fall"]
HazardProfile = Literal[
    "desert",
    "alpine",
    "temperate_forest",
    "coastal",
    "subarctic",
    "swamp_wetland",
    "canyon_exposure",
]
Hemisphere = Literal["north", "south"]


@dataclass(frozen=True)
class ParkRuntimeMetadata:
    slug: str
    park_code: str
    hazard_profile: HazardProfile
    hemisphere: Hemisphere


PARK_CODES: dict[str, str] = {
    "acadia": "acad",
    "arches": "arch",
    "badlands": "badl",
    "big-bend": "bibe",
    "biscayne": "bisc",
    "black-canyon-of-the-gunnison": "blca",
    "bryce-canyon": "brca",
    "canyonlands": "cany",
    "capitol-reef": "care",
    "carlsbad-caverns": "cave",
    "channel-islands": "chis",
    "congaree": "cong",
    "crater-lake": "crla",
    "cuyahoga-valley": "cuva",
    "death-valley": "deva",
    "denali": "dena",
    "dry-tortugas": "drto",
    "everglades": "ever",
    "gates-of-the-arctic": "gaar",
    "gateway-arch": "jeff",
    "glacier": "glac",
    "glacier-bay": "glba",
    "grand-canyon": "grca",
    "grand-teton": "grte",
    "great-basin": "grba",
    "great-sand-dunes": "grsa",
    "great-smoky-mountains": "grsm",
    "guadalupe-mountains": "gumo",
    "haleakala": "hale",
    "hawaii-volcanoes": "havo",
    "hot-springs": "hosp",
    "indiana-dunes": "indu",
    "isle-royale": "isro",
    "joshua-tree": "jotr",
    "katmai": "katm",
    "kenai-fjords": "kefj",
    "kings-canyon": "kica",
    "kobuk-valley": "kova",
    "lake-clark": "lacl",
    "lassen-volcanic": "lavo",
    "mammoth-cave": "maca",
    "mesa-verde": "meve",
    "mount-rainier": "mora",
    "american-samoa": "npsa",
    "new-river-gorge": "neri",
    "north-cascades": "noca",
    "olympic": "olym",
    "petrified-forest": "pefo",
    "pinnacles": "pinn",
    "redwood": "redw",
    "rocky-mountain": "romo",
    "saguaro": "sagu",
    "sequoia": "seki",
    "shenandoah": "shen",
    "theodore-roosevelt": "thro",
    "virgin-islands": "viis",
    "voyageurs": "voya",
    "white-sands": "whsa",
    "wind-cave": "wica",
    "wrangell-st-elias": "wrst",
    "yellowstone": "yell",
    "yosemite": "yose",
    "zion": "zion",
}

PROFILE_GROUPS: dict[HazardProfile, list[str]] = {
    "desert": [
        "big-bend",
        "carlsbad-caverns",
        "death-valley",
        "great-basin",
        "guadalupe-mountains",
        "joshua-tree",
        "petrified-forest",
        "saguaro",
        "white-sands",
    ],
    "canyon_exposure": [
        "arches",
        "badlands",
        "black-canyon-of-the-gunnison",
        "bryce-canyon",
        "canyonlands",
        "capitol-reef",
        "grand-canyon",
        "mesa-verde",
        "pinnacles",
        "theodore-roosevelt",
        "zion",
    ],
    "alpine": [
        "crater-lake",
        "glacier",
        "grand-teton",
        "great-sand-dunes",
        "kings-canyon",
        "lassen-volcanic",
        "mount-rainier",
        "north-cascades",
        "rocky-mountain",
        "sequoia",
        "wind-cave",
        "yellowstone",
        "yosemite",
    ],
    "temperate_forest": [
        "cuyahoga-valley",
        "gateway-arch",
        "great-smoky-mountains",
        "hot-springs",
        "mammoth-cave",
        "new-river-gorge",
        "shenandoah",
    ],
    "coastal": [
        "acadia",
        "channel-islands",
        "haleakala",
        "hawaii-volcanoes",
        "indiana-dunes",
        "olympic",
        "redwood",
        "virgin-islands",
        "american-samoa",
    ],
    "subarctic": [
        "denali",
        "gates-of-the-arctic",
        "glacier-bay",
        "isle-royale",
        "katmai",
        "kenai-fjords",
        "kobuk-valley",
        "lake-clark",
        "voyageurs",
        "wrangell-st-elias",
    ],
    "swamp_wetland": ["biscayne", "congaree", "dry-tortugas", "everglades"],
}

SOUTHERN_HEMISPHERE_PARKS = {"american-samoa"}


def _build_profile_map() -> dict[str, HazardProfile]:
    profile_map: dict[str, HazardProfile] = {}
    for profile, slugs in PROFILE_GROUPS.items():
        for slug in slugs:
            profile_map[slug] = profile
    return profile_map


PARK_PROFILE_MAP = _build_profile_map()

PARKS_BY_SLUG: dict[str, ParkRuntimeMetadata] = {
    slug: ParkRuntimeMetadata(
        slug=slug,
        park_code=park_code,
        hazard_profile=PARK_PROFILE_MAP[slug],
        hemisphere="south" if slug in SOUTHERN_HEMISPHERE_PARKS else "north",
    )
    for slug, park_code in PARK_CODES.items()
}

PARKS_BY_CODE = {metadata.park_code: metadata for metadata in PARKS_BY_SLUG.values()}


def parse_observed_date(value: str | int | date | datetime) -> date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, int):
        return datetime.strptime(str(value), "%Y%m%d").date()
    text = str(value).strip()
    if text.isdigit() and len(text) == 8:
        return datetime.strptime(text, "%Y%m%d").date()
    return datetime.fromisoformat(text).date()


def resolve_season(observed_date: date, hemisphere: Hemisphere = "north") -> Season:
    month = observed_date.month

    if hemisphere == "north":
        if month in (12, 1, 2):
            return "winter"
        if month in (3, 4, 5):
            return "spring"
        if month in (6, 7, 8):
            return "summer"
        return "fall"

    if month in (12, 1, 2):
        return "summer"
    if month in (3, 4, 5):
        return "fall"
    if month in (6, 7, 8):
        return "winter"
    return "spring"


def get_park_metadata(park_slug: str | None = None, park_code: str | None = None) -> ParkRuntimeMetadata | None:
    normalized_slug = (park_slug or "").strip().lower()
    normalized_code = (park_code or "").strip().lower()

    if normalized_slug and normalized_slug in PARKS_BY_SLUG:
        return PARKS_BY_SLUG[normalized_slug]
    if normalized_code and normalized_code in PARKS_BY_CODE:
        return PARKS_BY_CODE[normalized_code]
    return None

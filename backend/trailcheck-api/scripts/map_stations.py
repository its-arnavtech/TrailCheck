import math
from pathlib import Path

import pandas as pd

DATA_DIR = Path("data")
STATIONS_FILE = DATA_DIR / "raw" / "weather" / "ghcnd-stations.txt"
PARKS_FILE = DATA_DIR / "processed" / "parks" / "parks.csv"
OUTPUT_FILE = DATA_DIR / "processed" / "parks" / "park_station_map.csv"

DEFAULT_PARKS = [
    {"name": "Yosemite", "slug": "yosemite", "lat": 37.8651, "lon": -119.5383},
    {"name": "Zion", "slug": "zion", "lat": 37.2982, "lon": -113.0263},
    {"name": "Yellowstone", "slug": "yellowstone", "lat": 44.4280, "lon": -110.5885},
    {"name": "Grand Canyon", "slug": "grand-canyon", "lat": 36.1069, "lon": -112.1129},
    {"name": "Acadia", "slug": "acadia", "lat": 44.3386, "lon": -68.2733},
    {"name": "Big Bend", "slug": "big-bend", "lat": 29.1275, "lon": -103.2425},
]


def haversine(lat1, lon1, lat2, lon2):
    radius_km = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return 2 * radius_km * math.asin(math.sqrt(a))


def ensure_parks_file():
    PARKS_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not PARKS_FILE.exists():
        pd.DataFrame(DEFAULT_PARKS).to_csv(PARKS_FILE, index=False)


def load_stations():
    stations = []
    with STATIONS_FILE.open("r", encoding="utf-8") as f:
        for line in f:
            station_id = line[0:11].strip()
            lat = float(line[12:20])
            lon = float(line[21:30])
            stations.append({"station": station_id, "lat": lat, "lon": lon})

    return pd.DataFrame(stations)


def main():
    ensure_parks_file()
    parks = pd.read_csv(PARKS_FILE)
    stations = load_stations()
    results = []

    for _, park in parks.iterrows():
        best_station = None
        best_dist = float("inf")

        for _, station in stations.iterrows():
            dist = haversine(park["lat"], park["lon"], station["lat"], station["lon"])
            if dist < best_dist:
                best_dist = dist
                best_station = station["station"]

        results.append(
            {
                "park": park["name"],
                "slug": park["slug"],
                "station": best_station,
                "distance_km": round(best_dist, 2),
            }
        )

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(results).to_csv(OUTPUT_FILE, index=False)
    print("Park to station mapping complete")


if __name__ == "__main__":
    main()

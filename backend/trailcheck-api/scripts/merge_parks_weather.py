from pathlib import Path

import pandas as pd

YEAR = "2024"
MAPPING_FILE = Path("data") / "processed" / "parks" / "park_station_map.csv"
WEATHER_FILE = Path("data") / "processed" / "weather" / f"{YEAR}_clean.csv"
OUTPUT_FILE = Path("data") / "processed" / "parks" / f"park_weather_{YEAR}.csv"


def main():
    mapping = pd.read_csv(MAPPING_FILE)
    weather = pd.read_csv(WEATHER_FILE)
    df = mapping.merge(weather, on="station", how="inner")
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT_FILE, index=False)
    print("Park-level weather created")


if __name__ == "__main__":
    main()

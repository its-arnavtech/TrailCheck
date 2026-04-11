from pathlib import Path

import pandas as pd

YEAR = "2024"
INPUT_FILE = Path("data") / "processed" / "parks" / f"park_weather_{YEAR}.csv"
OUTPUT_FILE = Path("data") / "processed" / "parks" / f"park_weather_hazards_{YEAR}.csv"


def derive_hazards(row):
    hazards = []

    if row["PRCP"] > 30:
        hazards.append("FLOOD_RISK")
    elif row["PRCP"] > 10:
        hazards.append("MUDDY")

    if row["SNOW"] > 5:
        hazards.append("SNOW")

    if row["TMAX"] > 35:
        hazards.append("HEAT")

    return hazards


def main():
    df = pd.read_csv(INPUT_FILE)
    df["hazards"] = df.apply(derive_hazards, axis=1)
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT_FILE, index=False)
    print("Hazards generated")


if __name__ == "__main__":
    main()

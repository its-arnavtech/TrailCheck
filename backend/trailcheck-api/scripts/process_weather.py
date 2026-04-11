from pathlib import Path

import pandas as pd

YEAR = "2024"
INPUT_FILE = Path("data") / "raw" / "weather" / f"{YEAR}.csv.gz"
OUTPUT_FILE = Path("data") / "processed" / "weather" / f"{YEAR}_clean.csv"
CHUNK_SIZE = 1_000_000
WANTED = {"TMAX", "TMIN", "PRCP", "SNOW"}


def main():
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    chunks = []

    for chunk in pd.read_csv(
        INPUT_FILE,
        names=["station", "date", "element", "value", "mflag", "qflag", "sflag", "obstime"],
        chunksize=CHUNK_SIZE,
        compression="gzip",
    ):
        filtered = chunk[chunk["element"].isin(WANTED)]
        pivot = filtered.pivot_table(
            index=["station", "date"],
            columns="element",
            values="value",
            aggfunc="first",
        ).reset_index()
        chunks.append(pivot)

    df = pd.concat(chunks, ignore_index=True).fillna(0)
    df["TMAX"] = df["TMAX"] / 10
    df["TMIN"] = df["TMIN"] / 10
    df["PRCP"] = df["PRCP"] / 10
    df["SNOW"] = df["SNOW"] / 10
    df.to_csv(OUTPUT_FILE, index=False)

    print("Weather processed")


if __name__ == "__main__":
    main()

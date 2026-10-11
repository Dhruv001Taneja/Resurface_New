from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
INPUT_CSV = ROOT / "data" / "raw" / "screenshots.csv"
OUTPUT_CSV = ROOT / "data" / "processed" / "screenshots_clean.csv"
LABELS = {"credentials", "banking", "cards", "identity", "personal", "general"}

def main():
    if not INPUT_CSV.exists():
        raise FileNotFoundError(f"Dataset not found: {INPUT_CSV}")
    df = pd.read_csv(INPUT_CSV)
    if not {"text", "label"}.issubset(df.columns):
        raise ValueError("CSV must contain columns named 'text' and 'label'.")
    df = df[["text", "label"]].copy()
    df["text"] = df["text"].fillna("").astype(str).str.strip()
    df["label"] = df["label"].fillna("").astype(str).str.strip().str.lower()
    df = df[(df["text"] != "") & (df["label"] != "")]
    unknown = sorted(set(df["label"]) - LABELS)
    if unknown:
        raise ValueError(f"Unknown labels: {unknown}. Allowed: {sorted(LABELS)}")
    df["normalized_text"] = df["text"].str.lower().str.replace(r"\s+", " ", regex=True)
    before = len(df)
    df = df.drop_duplicates(subset=["normalized_text", "label"]).drop(columns=["normalized_text"])
    print(f"Rows before cleaning: {before}; after cleaning: {len(df)}")
    counts = df["label"].value_counts()
    print("\nExamples per class:\n", counts.to_string())
    missing = sorted(LABELS - set(df["label"]))
    if missing:
        raise ValueError(f"Dataset is missing these classes: {missing}")
    if counts.min() < 2:
        raise ValueError("Each class needs at least 2 examples for a stratified split.")
    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT_CSV, index=False)
    print(f"Prepared dataset saved to: {OUTPUT_CSV}")

if __name__ == "__main__":
    main()

from pathlib import Path
import argparse
import joblib

ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "models" / "resurface_text_classifier.joblib"

def main():
    parser = argparse.ArgumentParser(description="Classify OCR text with ReSurface Model B.")
    parser.add_argument("text", help="OCR text extracted from a screenshot")
    args = parser.parse_args()
    if not MODEL_PATH.exists():
        raise FileNotFoundError("Trained model not found. Run `python src/train.py` first.")
    bundle = joblib.load(MODEL_PATH)
    model = bundle["pipeline"]
    print("Predicted category:", model.predict([args.text])[0])
    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba([args.text])[0]
        classes = model.named_steps["classifier"].classes_
        for name, score in sorted(zip(classes, probabilities), key=lambda x: x[1], reverse=True):
            print(f"  {name}: {score:.3f} (model score, not a guarantee)")
if __name__ == "__main__":
    main()

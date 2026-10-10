from pathlib import Path
import json
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline, FeatureUnion
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "processed" / "screenshots_clean.csv"
MODEL_DIR = ROOT / "models"
MODEL_PATH = MODEL_DIR / "resurface_text_classifier.joblib"
METRICS_PATH = MODEL_DIR / "evaluation_metrics.json"

def main():
    if not DATA_PATH.exists():
        raise FileNotFoundError("Run `python src/prepare_dataset.py` first.")
    df = pd.read_csv(DATA_PATH)
    X, y = df["text"].astype(str), df["label"].astype(str)
    counts = y.value_counts()
    if len(counts) < 2 or counts.min() < 2:
        raise ValueError("Need at least 2 examples in every class.")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )
    features = FeatureUnion([
        ("word_tfidf", TfidfVectorizer(
            lowercase=True, strip_accents="unicode", ngram_range=(1, 2),
            min_df=1, sublinear_tf=True, max_features=50000
        )),
        ("char_tfidf", TfidfVectorizer(
            analyzer="char_wb", lowercase=True, ngram_range=(3, 5),
            min_df=1, sublinear_tf=True, max_features=50000
        ))
    ])
    model = Pipeline([
        ("features", features),
        ("classifier", LogisticRegression(
            max_iter=2000, class_weight="balanced", random_state=42
        ))
    ])
    model.fit(X_train, y_train)
    predictions = model.predict(X_test)
    labels = sorted(y.unique())
    report_text = classification_report(y_test, predictions, labels=labels, zero_division=0)
    report = classification_report(
        y_test, predictions, labels=labels, output_dict=True, zero_division=0
    )
    cm = confusion_matrix(y_test, predictions, labels=labels)
    accuracy = accuracy_score(y_test, predictions)
    print(f"Train rows: {len(X_train)}; test rows: {len(X_test)}")
    print(f"\nAccuracy: {accuracy:.3f}\n")
    print(report_text)
    print("Label order for confusion matrix:", labels)
    print(cm)
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump({
        "pipeline": model, "labels": labels,
        "model_type": "Word + character TF-IDF + Logistic Regression",
        "training_rows": int(len(X_train)), "test_rows": int(len(X_test))
    }, MODEL_PATH)
    METRICS_PATH.write_text(json.dumps({
        "accuracy": float(accuracy), "labels": labels,
        "classification_report": report, "confusion_matrix": cm.tolist(),
        "random_state": 42, "test_size": 0.25
    }, indent=2))
    print(f"\nModel saved to: {MODEL_PATH}")
    print(f"Metrics saved to: {METRICS_PATH}")
    print("Demo dataset metrics are not evidence of real-world performance.")

if __name__ == "__main__":
    main()

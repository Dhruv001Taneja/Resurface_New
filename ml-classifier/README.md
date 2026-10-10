# ReSurface Model B: OCR-text classifier

This starter project trains a text classifier using word + character TF-IDF and Logistic Regression.

## Limitations
- The included CSV has synthetic demo examples only; it is too small to establish real-world accuracy.
- This model classifies OCR text, not image pixels. OCR failures can hide sensitive content.
- It is a single-label classifier: it predicts one category per screenshot.
- Never use its prediction as the only security control for Vault routing.
- Never commit real credentials or identity details.

## Setup (run from this folder)
```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
python src/prepare_dataset.py
python src/train.py
python src/predict.py "Enter username and password to sign in"
```

## Dataset format
`data/raw/screenshots.csv` columns: `text,label`. Labels: `credentials`, `banking`, `cards`, `identity`, `personal`, `general`.

Replace/expand synthetic rows with permitted, labeled examples. Aim initially for 100-300 varied examples per class if feasible. For serious evaluation, split by source/user/session before fitting so near-duplicate screenshots do not leak across train/test.

## Model
The pipeline combines word TF-IDF, character n-gram TF-IDF, and Logistic Regression with balanced class weights. It saves the model with joblib and reports accuracy, precision, recall, F1, and confusion matrix.

## Security
Treat `predict_proba` values as model scores, not guaranteed calibrated probabilities. Pay particular attention to false negatives for sensitive classes. Keep backend authorization checks and conservative security rules.

from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS


BASE_DIR = Path(__file__).resolve().parent

app = Flask(__name__)
CORS(app)


def _load_optional(path: Path) -> Any:
    if path.exists():
        return joblib.load(path)
    return None


MODEL = _load_optional(BASE_DIR / "model.joblib")
SCALER = _load_optional(BASE_DIR / "scaler.joblib")
MODEL_COLUMNS = _load_optional(BASE_DIR / "columns.joblib")


@app.get("/api/health")
def health() -> Any:
    return jsonify(
        {
            "ok": True,
            "model_loaded": MODEL is not None,
            "scaler_loaded": SCALER is not None,
            "columns_loaded": MODEL_COLUMNS is not None,
        }
    )


@app.post("/api/predict-csv")
def predict_csv() -> Any:
    if MODEL is None:
        return jsonify({"error": "Model not found. Expected Python/model.joblib"}), 500

    file = request.files.get("file")
    if file is None:
        return jsonify({"error": "Missing CSV file in form-data key 'file'"}), 400

    label_col = request.form.get("labelCol", "Class")
    amount_col = request.form.get("amountCol", "Amount")
    time_col = request.form.get("timeCol", "Time")

    try:
        df = pd.read_csv(file.stream)
    except Exception as exc:
        return jsonify({"error": f"Failed to read CSV: {exc}"}), 400

    if df.empty:
        return jsonify({"error": "CSV file is empty"}), 400

    features = df.copy()
    if label_col in features.columns:
        features = features.drop(columns=[label_col])

    if SCALER is not None and time_col in features.columns and amount_col in features.columns:
        try:
            scaled = SCALER.transform(features[[time_col, amount_col]].to_numpy())
            features[[time_col, amount_col]] = scaled
        except Exception:
            # Keep API resilient when scaler shape differs from input.
            pass

    if MODEL_COLUMNS is not None:
        for col in MODEL_COLUMNS:
            if col not in features.columns:
                features[col] = 0.0
        features = features[list(MODEL_COLUMNS)]

    try:
        predictions = MODEL.predict(features)
    except Exception as exc:
        return jsonify({"error": f"Prediction failed: {exc}"}), 500

    result_df = df.copy()
    result_df["Prediction"] = predictions

    fraud_count = int((result_df["Prediction"] == 1).sum())
    non_fraud_count = int((result_df["Prediction"] == 0).sum())

    preview_records = result_df.head(5).fillna("").to_dict(orient="records")

    return jsonify(
        {
            "rows": int(len(result_df)),
            "fraud_count": fraud_count,
            "non_fraud_count": non_fraud_count,
            "fraud_rate": float(fraud_count / len(result_df)),
            "preview": preview_records,
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)

import streamlit as st
import pandas as pd
import joblib

# Load model and scaler
model = joblib.load("model.joblib")
scaler = joblib.load("scaler.joblib")

st.title("Credit Card Fraud Detection")
uploaded_file = st.file_uploader("Upload your CSV file for prediction", type=["csv"])

if uploaded_file is not None:
    data = pd.read_csv(uploaded_file)

    # Check for required columns
    if "Time" not in data.columns or "Amount" not in data.columns:
        st.error("CSV must include 'Time' and 'Amount' columns.")
    else:
        try:
            # Scale both columns using scaler
            data[["Time", "Amount"]] = scaler.transform(data[["Time", "Amount"]].to_numpy())
        except ValueError:
            try:
                data["Time"] = scaler.transform(data[["Time"]].to_numpy()).ravel()
                data["Amount"] = scaler.transform(data[["Amount"]].to_numpy()).ravel()
            except Exception as e:
                st.error(f"Scaler error: {e}")
                st.stop()

        # Remove 'Class' column before prediction
        if "Class" in data.columns:
            data = data.drop("Class", axis=1)

        try:
            prediction = model.predict(data)
        except Exception as e:
            st.error(f"Model prediction error: {e}")
            st.stop()

        # Add predictions to DataFrame
        data["Prediction"] = prediction

        # Count fraud and non-fraud
        fraud_count = (data["Prediction"] == 1).sum()
        non_fraud_count = (data["Prediction"] == 0).sum()

        # Show counts
        st.write("### Prediction Summary")
        st.write(f"✅ Non-Fraud Transactions: **{non_fraud_count}**")
        st.write(f"🚨 Fraudulent Transactions: **{fraud_count}**")

        # Show prediction table
        st.write("### Prediction Table")
        st.dataframe(data)

        # Allow download
        csv = data.to_csv(index=False).encode('utf-8')
        st.download_button("Download Results", csv, "predictions.csv", "text/csv")

import streamlit as st
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

# Setup
st.set_page_config(page_title="💳 Credit Card Fraud Dashboard", layout="wide")
st.title("💳 Credit Card Fraud Detection Dashboard")
st.markdown("Upload a **CSV file** and explore fraud patterns using interactive charts.")

# File upload
uploaded_file = st.file_uploader("📁 Upload your credit card dataset (.csv)", type=["csv"])

if uploaded_file:
    df = pd.read_csv(uploaded_file)
    st.success("✅ File uploaded successfully!")

    # Column fallback defaults
    default_class = "Class" if "Class" in df.columns else df.columns[-1]
    default_amount = "Amount" if "Amount" in df.columns else df.columns[0]
    default_time = "Time" if "Time" in df.columns else df.columns[1]

    # Sidebar: column settings
    with st.sidebar:
        st.header("⚙️ Column Settings")
        label_col = st.selectbox("🎯 Fraud Label Column", df.columns, index=df.columns.get_loc(default_class))
        amount_col = st.selectbox("💰 Amount Column", df.columns, index=df.columns.get_loc(default_amount))
        time_col = st.selectbox("⏱️ Time Column", df.columns, index=df.columns.get_loc(default_time))
        st.markdown("---")
        st.markdown("✅ Select correct columns before viewing visualizations.")

    # Dataset overview
    st.markdown("### 📊 Dataset Overview")
    col1, col2, col3 = st.columns(3)
    col1.metric("🔢 Rows", df.shape[0])
    col2.metric("📈 Columns", df.shape[1])
    col3.metric("❗ Missing Values", df.isnull().sum().sum())

    with st.expander("🔍 Preview Dataset (Top 5 Rows)"):
        st.dataframe(df.head(), use_container_width=True)

    st.divider()

    # Column mapping
    st.markdown("### 🧭 Column Mapping")
    st.markdown(f"""
    - 🕓 **Time**: `{time_col}`  
    - 💵 **Amount**: `{amount_col}`  
    - 🚨 **Fraud Label**: `{label_col}`
    """)

    st.divider()

    # 🎯 Fraud Distribution
    st.subheader("🎯 Fraud vs Non-Fraud")
    fig1, ax1 = plt.subplots()
    sns.countplot(x=label_col, data=df, palette="Set2", ax=ax1)
    ax1.set_title("Fraud Class Distribution")
    ax1.set_xlabel("Class")
    ax1.set_ylabel("Count")
    st.pyplot(fig1)

    # 💰 Amount Distribution
    st.subheader("💰 Transaction Amount Distribution")
    fig2, ax2 = plt.subplots()
    sns.histplot(df[amount_col], bins=50, kde=True, color="skyblue", ax=ax2)
    ax2.set_title("Amount Histogram")
    st.pyplot(fig2)

    # ⏱️ Time Distribution
    st.subheader("⏱️ Transaction Time Distribution")
    fig3, ax3 = plt.subplots()
    sns.histplot(df[time_col], bins=50, kde=True, color="orange", ax=ax3)
    ax3.set_title("Time Histogram")
    st.pyplot(fig3)

    # 🔥 Correlation Heatmap
    st.subheader("🔥 Correlation Heatmap")
    fig4, ax4 = plt.subplots(figsize=(10, 8))
    corr = df.corr(numeric_only=True)
    sns.heatmap(corr, cmap="coolwarm", annot=False, linewidths=0.5, ax=ax4)
    ax4.set_title("Feature Correlation Matrix")
    st.pyplot(fig4)

    # 📦 Boxplot: Amount by Class
    st.subheader("📦 Amount by Fraud Class")
    fig5, ax5 = plt.subplots()
    sns.boxplot(x=df[label_col], y=df[amount_col], palette="pastel", ax=ax5)
    ax5.set_title("Amount Distribution by Class")
    if set(df[label_col].unique()) == {0, 1}:
        ax5.set_xticklabels(['Not Fraud', 'Fraud'])
    st.pyplot(fig5)

else:
    st.info("👈 Upload your CSV file from the sidebar to begin visualizing fraud patterns.")

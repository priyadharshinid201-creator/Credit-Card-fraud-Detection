import React from "react";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-gray-50 min-h-screen">

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Credit Card Fraud Detection System
        </h1>

        <p className="text-gray-600 text-lg mb-8">
          Upload your transaction dataset, run backend ML prediction,
          and visualize fraud insights instantly.
        </p>

        <button
          onClick={() => navigate("/dashboard")}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg shadow hover:bg-blue-700 transition"
        >
          Go to Find Fraud 
        </button>
      </div>

      {/* System Workflow */}
      <div className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-12">
          How The System Works
        </h2>

        <div className="grid md:grid-cols-4 gap-8 text-center">

          <div className="bg-white p-6 rounded-xl shadow border">
            <h3 className="font-semibold text-blue-600 mb-2">
              1. Upload Dataset
            </h3>
            <p className="text-gray-600 text-sm">
              Upload credit card transaction CSV file.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow border">
            <h3 className="font-semibold text-blue-600 mb-2">
              2. Backend Prediction
            </h3>
            <p className="text-gray-600 text-sm">
              ML model analyzes transactions and detects fraud.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow border">
            <h3 className="font-semibold text-blue-600 mb-2">
              3. Dataset Overview
            </h3>
            <p className="text-gray-600 text-sm">
              View rows, columns and missing value summary.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow border">
            <h3 className="font-semibold text-blue-600 mb-2">
              4. Visual Insights
            </h3>
            <p className="text-gray-600 text-sm">
              Explore transaction patterns using interactive charts.
            </p>
          </div>

        </div>
      </div>

      {/* Feature Highlights */}
      <div className="bg-white border-t py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-10">
            Key Features
          </h2>

          <div className="grid md:grid-cols-3 gap-8">

            <div className="p-6 border rounded-xl shadow-sm">
              <h3 className="font-semibold text-blue-600 mb-2">
                Real-Time Fraud Detection
              </h3>
              <p className="text-gray-600 text-sm">
                Instantly identify suspicious transactions using ML algorithms.
              </p>
            </div>

            <div className="p-6 border rounded-xl shadow-sm">
              <h3 className="font-semibold text-blue-600 mb-2">
                Smart Data Preview
              </h3>
              <p className="text-gray-600 text-sm">
                Fast UI preview of uploaded dataset before prediction.
              </p>
            </div>

            <div className="p-6 border rounded-xl shadow-sm">
              <h3 className="font-semibold text-blue-600 mb-2">
                Interactive Charts
              </h3>
              <p className="text-gray-600 text-sm">
                Customize X and Y columns to analyze fraud trends.
              </p>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
};

export default HomePage;
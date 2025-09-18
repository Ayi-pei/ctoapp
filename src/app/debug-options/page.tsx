"use client";

import { useState } from "react";
import axios from "axios";

export default function DebugOptionsPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testRequest = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      console.log(
        "Making request to:",
        `/api/alpha-vantage?function=HISTORICAL_OPTIONS&symbol=IBM&date=${today}`
      );

      const response = await axios.get(
        `/api/alpha-vantage?function=HISTORICAL_OPTIONS&symbol=IBM&date=${today}`,
        {
          validateStatus: function (status) {
            // Allow any status code for debugging
            return true;
          },
        }
      );

      console.log("Response status:", response.status);
      console.log("Response data:", response.data);

      setResult({
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers,
      });
    } catch (error: any) {
      console.error("Request failed:", error);
      setResult({
        error: error.message,
        code: error.code,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">期权API调试</h1>
      <button
        onClick={testRequest}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        {loading ? "测试中..." : "测试API请求"}
      </button>

      {result && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">结果:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

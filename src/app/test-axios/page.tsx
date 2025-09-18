"use client";

import { useState } from "react";
import axios from "axios";

export default function TestAxiosPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAxios = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const response = await axios.get(
        `/api/alpha-vantage?function=HISTORICAL_OPTIONS&symbol=IBM&date=${today}`
      );
      setResult({
        status: "success",
        data: response.data,
        statusText: response.statusText,
        statusCode: response.status,
      });
    } catch (error: any) {
      setResult({
        status: "error",
        message: error.message,
        response: error.response
          ? {
              status: error.response.status,
              statusText: error.response.statusText,
              data: error.response.data,
            }
          : null,
        request: error.request ? "Request made but no response" : null,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Axios错误处理测试</h1>
      <button
        onClick={testAxios}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        {loading ? "测试中..." : "测试Axios请求"}
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

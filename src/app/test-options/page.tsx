"use client";

import { useState, useEffect } from "react";
import axios from "axios";

export default function TestOptionsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const today = new Date().toISOString().split("T")[0];
        const response = await axios.get(
          `/api/alpha-vantage?function=HISTORICAL_OPTIONS&symbol=IBM&date=${today}`
        );
        setData(response.data);
        setStatusCode(response.status);
      } catch (e: any) {
        console.error("Error:", e);
        if (e.response) {
          setStatusCode(e.response.status);
          if (e.response.status === 429) {
            setError(
              "API请求频率超限: " + (e.response.data?.error || "请稍后再试")
            );
          } else {
            setError("API错误: " + (e.response.data?.error || "未知错误"));
          }
        } else {
          setError("网络错误: " + (e.message || "请检查网络连接"));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">期权数据测试</h1>
      {loading && <p>加载中...</p>}
      {statusCode && <p>状态码: {statusCode}</p>}
      {error && <p className="text-red-500">错误: {error}</p>}
      {data && (
        <div>
          <h2 className="text-xl font-semibold mb-2">响应数据:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

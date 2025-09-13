"use client";

import { useSimpleAuth } from "@/context/simple-custom-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DebugPage() {
  const { isAuthenticated, isLoading, isAdmin, user } = useSimpleAuth();
  const router = useRouter();
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingTime, setLoadingTime] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
    console.log(`调试: ${message}`);
  };

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setLoadingTime(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkApi = async () => {
      try {
        addLog("正在检查 API...");
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        const data = await response.json();
        addLog(`API 响应: status=${response.status}`);
        setApiStatus({ status: response.status, data });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        addLog(`API 错误: ${errorMsg}`);
        setError(errorMsg);
      }
    };
    checkApi();
  }, []);

  useEffect(() => {
    addLog(
      `认证状态变化: isLoading=${isLoading}, isAuthenticated=${isAuthenticated}, isAdmin=${isAdmin}`
    );
  }, [isLoading, isAuthenticated, isAdmin, user]);

  return (
    <div className="p-5 font-mono">
      <h1>认证调试页面</h1>

      <h2>React Context 状态：</h2>
      <ul>
        <li>isLoading: {String(isLoading)}</li>
        <li>isAuthenticated: {String(isAuthenticated)}</li>
        <li>isAdmin: {String(isAdmin)}</li>
        <li>user: {user ? JSON.stringify(user, null, 2) : "null"}</li>
        <li>加载时间: {loadingTime}ms</li>
      </ul>

      <h2>API 检查：</h2>
      {error && <p className="text-red-500">API Error: {error}</p>}
      {apiStatus && (
        <div>
          <p>Status: {apiStatus.status}</p>
          <pre>{JSON.stringify(apiStatus.data, null, 2)}</pre>
        </div>
      )}

      <h2>实时日志：</h2>
      <div className="bg-gray-100 p-2 rounded max-h-40 overflow-y-auto">
        {logs.map((log, index) => (
          <div key={index} className="text-sm font-mono">
            {log}
          </div>
        ))}
      </div>

      <h2>操作：</h2>
      <div className="space-y-2">
        <button
          onClick={() => router.push("/login")}
          className="mr-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          前往登录页
        </button>
        <button
          onClick={() => router.push("/admin")}
          className="mr-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          前往管理员页
        </button>
        <button
          onClick={() => router.push("/")}
          className="mr-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          前往首页
        </button>
        <button
          onClick={() => window.location.reload()}
          className="mr-2 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          刷新页面
        </button>
        <button
          onClick={() => setLogs([])}
          className="mr-2 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          清除日志
        </button>
      </div>
    </div>
  );
}

"use client";

import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// Disable SSR for this page to avoid context issues
export const dynamic = "force-dynamic";

const AppleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-apple"
  >
    <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" />
    <path d="M10 2c1 .5 2 2 2 5" />
  </svg>
);

const AndroidIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-smartphone"
  >
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
    <path d="M12 18h.01" />
  </svg>
);

export default function DownloadPage() {
  const { toast } = useToast();

  const handleDownloadClick = (os: string) => {
    toast({
      title: "即将推出",
      description: `我们的 ${os} 应用正在开发中，敬请期待！`,
    });
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <h1 className="text-2xl font-bold">下载中心</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="flex flex-col items-center justify-center p-8 text-center">
            <AppleIcon />
            <CardTitle className="mt-4 mb-2 text-2xl">iOS App</CardTitle>
            <CardContent className="p-0">
              <p className="text-muted-foreground mb-6">在 App Store 上获取</p>
              <Button onClick={() => handleDownloadClick("iOS")}>
                立即下载
              </Button>
            </CardContent>
          </Card>
          <Card className="flex flex-col items-center justify-center p-8 text-center">
            <AndroidIcon />
            <CardTitle className="mt-4 mb-2 text-2xl">Android App</CardTitle>
            <CardContent className="p-0">
              <p className="text-muted-foreground mb-6">获取 .apk 文件</p>
              <Button onClick={() => handleDownloadClick("Android")}>
                立即下载
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>如何安装</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground text-sm">
            <div>
              <h4 className="font-semibold text-foreground mb-1">iOS 用户:</h4>
              <p>
                1. 点击 &quot;立即下载&quot; 按钮，您将被引导至 Apple App
                Store。
              </p>
              <p>2. 点击 &quot;获取&quot; 按钮进行安装。</p>
              <p>3. 使用您的 Face ID, Touch ID, 或 Apple ID 密码确认安装。</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                Android 用户:
              </h4>
              <p>1. 点击 &quot;立即下载&quot; 按钮，.apk 文件将开始下载。</p>
              <p>2. 下载完成后，打开您的文件管理器找到该文件。</p>
              <p>
                3.
                点击文件进行安装。您可能需要授权您的浏览器或文件管理器“安装未知来源的应用”。
              </p>
              <p>4. 按照屏幕上的指示完成安装。</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

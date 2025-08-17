
import { CandlestickChart } from "lucide-react";

type AuthLayoutProps = {
    children: React.ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
             <div className="flex items-center gap-3 mb-8">
                <CandlestickChart className="h-10 w-10 text-primary" />
                <h1 className="text-4xl font-bold text-foreground">TradeFlow</h1>
            </div>
            {children}
        </div>
    );
}

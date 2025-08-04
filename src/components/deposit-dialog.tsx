
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy } from "lucide-react";

type DepositDialogProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
};

export function DepositDialog({ isOpen, onOpenChange }: DepositDialogProps) {
    const { toast } = useToast();
    const walletAddress = "TAsimulatedAddressForU12345XYZ";

    const handleCopy = () => {
        navigator.clipboard.writeText(walletAddress);
        toast({
            title: "已复制",
            description: "钱包地址已复制到剪贴板。",
        });
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>充币</AlertDialogTitle>
                    <AlertDialogDescription>
                       这是一个模拟的充币地址。请不要向此地址发送任何真实资金。
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="my-4 p-4 bg-muted rounded-md text-center break-all">
                    <p className="font-mono text-sm">{walletAddress}</p>
                </div>
                 <div className="flex justify-center">
                    <Button onClick={handleCopy} variant="outline">
                        <Copy className="mr-2 h-4 w-4" />
                        复制地址
                    </Button>
                </div>
                <AlertDialogFooter>
                    <AlertDialogAction asChild>
                       <Button onClick={() => onOpenChange(false)}>关闭</Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

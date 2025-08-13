
"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { ChevronLeft, PlusCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";


export type WithdrawalAddress = {
    id: string;
    name: string;
    address: string;
    network: string;
    user_id: string;
};


export default function PaymentPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const [addresses, setAddresses] = useState<WithdrawalAddress[]>([]);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [newAddress, setNewAddress] = useState("");


    useEffect(() => {
        const fetchAddresses = async () => {
            if (user) {
                try {
                    const { data, error } = await supabase
                        .from('withdrawal_addresses')
                        .select('*')
                        .eq('user_id', user.id);
                    if (error) throw error;
                    setAddresses(data || []);
                } catch (error) {
                    console.error("Failed to load addresses from Supabase", error);
                    toast({ variant: "destructive", title: "错误", description: "加载提现地址失败。" });
                }
            }
        };
        fetchAddresses();
    }, [user, toast]);

    const handleAddAddress = async () => {
        if (!newName.trim() || !newAddress.trim() || !user) {
            toast({ variant: "destructive", title: "错误", description: "名称和地址不能为空" });
            return;
        }

        try {
            const { data, error } = await supabase
                .from('withdrawal_addresses')
                .insert({
                    name: newName,
                    address: newAddress,
                    network: "USDT-TRC20",
                    user_id: user.id
                })
                .select()
                .single();

            if (error) throw error;
            
            setAddresses(prev => [...prev, data]);
            toast({ title: "成功", description: "新的提现地址已添加。" });
            setIsAddDialogOpen(false);
            setNewName("");
            setNewAddress("");

        } catch(error) {
             toast({ variant: "destructive", title: "错误", description: "添加地址失败。" });
        }
    };

    const handleDeleteAddress = async (addressId: string) => {
        try {
            const { error } = await supabase
                .from('withdrawal_addresses')
                .delete()
                .eq('id', addressId);
            
            if (error) throw error;

            setAddresses(prev => prev.filter(addr => addr.id !== addressId));
            toast({ title: "成功", description: "提现地址已删除。" });

        } catch (error) {
             toast({ variant: "destructive", title: "错误", description: "删除地址失败。" });
        }
    };

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <h1 className="text-2xl font-bold">支付方式</h1>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>提现地址管理</CardTitle>
                            <CardDescription>添加或删除您的USDT-TRC20提现地址。</CardDescription>
                        </div>
                        <Button onClick={() => setIsAddDialogOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            添加新地址
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {addresses.length > 0 ? (
                            addresses.map(addr => (
                                <div key={addr.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                                    <div>
                                        <p className="font-semibold">{addr.name} <span className="text-xs text-muted-foreground ml-2">{addr.network}</span></p>
                                        <p className="text-sm text-muted-foreground break-all">{addr.address}</p>
                                    </div>
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>确认删除?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    此操作无法撤销。这将永久删除您的 <span className="font-bold">{addr.name}</span> 地址。
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>取消</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteAddress(addr.id)}>确认删除</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 text-muted-foreground">
                                <p>您还没有添加任何提现地址。</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Add Address Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>添加新提现地址</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                名称
                            </Label>
                            <Input
                                id="name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="col-span-3"
                                placeholder="例如：我的钱包1"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="address" className="text-right">
                                地址
                            </Label>
                            <Input
                                id="address"
                                value={newAddress}
                                onChange={(e) => setNewAddress(e.target.value)}
                                className="col-span-3"
                                placeholder="请输入USDT-TRC20地址"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">取消</Button>
                        </DialogClose>
                        <Button type="button" onClick={handleAddAddress}>保存</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </DashboardLayout>
    );
}

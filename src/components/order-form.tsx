"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const formSchema = z.object({
  price: z.coerce.number().positive("Price must be positive"),
  amount: z.coerce.number().positive("Amount must be positive"),
});

export function OrderForm() {
  const [total, setTotal] = useState(0);
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      price: undefined,
      amount: undefined,
    },
  });

  const handleValueChange = () => {
    const price = form.getValues("price");
    const amount = form.getValues("amount");
    if (price > 0 && amount > 0) {
      setTotal(price * amount);
    } else {
      setTotal(0);
    }
  };
  
  const onSubmit = (values: z.infer<typeof formSchema>, orderType: 'Buy' | 'Sell') => {
    toast({
      title: "Order Submitted!",
      description: `${orderType} order for ${values.amount} at $${values.price} placed successfully.`,
    });
    form.reset();
    setTotal(0);
  };

  const renderFormContent = (orderType: 'Buy' | 'Sell') => (
    <Form {...form}>
      <form
        onChange={handleValueChange}
        onSubmit={form.handleSubmit((data) => onSubmit(data, orderType))}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price (USDT)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="text-sm text-muted-foreground">
          Total: <span className="font-medium text-foreground">{total.toFixed(4)} USDT</span>
        </div>
        <Button
          type="submit"
          className={`w-full ${orderType === 'Buy' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
        >
          {orderType}
        </Button>
      </form>
    </Form>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Place Order</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="buy" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy">Buy</TabsTrigger>
            <TabsTrigger value="sell">Sell</TabsTrigger>
          </TabsList>
          <TabsContent value="buy">
            {renderFormContent('Buy')}
          </TabsContent>
          <TabsContent value="sell">
            {renderFormContent('Sell')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

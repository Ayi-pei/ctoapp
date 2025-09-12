"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { supabase, isSupabaseEnabled } from "@/lib/supabaseClient";
import { useAuthenticatedSupabase } from "@/context/enhanced-supabase-context";

// Corrected Type Definitions
export type InvestmentTier = {
  hours: number;
  rate: number; // Hourly rate
};

export type InvestmentProduct = {
  id: string;
  name: string;
  price: number;
  dailyRate?: number;
  period?: number;
  maxPurchase: number;
  imgSrc: string;
  category: "staking" | "finance";
  productType?: "daily" | "hourly";
  activeStartTime?: string;
  activeEndTime?: string;
  hourlyTiers?: InvestmentTier[]; // CORRECTED TYPE: No longer a string
  stakingAsset?: string;
  stakingAmount?: number;
};

// Raw product data for seeding, with hourlyTiers as an array
const defaultInvestmentProducts: Omit<InvestmentProduct, "id">[] = [
  {
    name: "富投宝",
    price: 1,
    maxPurchase: 999,
    imgSrc: "/images/futoubao.png",
    category: "finance",
    productType: "hourly",
    activeStartTime: "18:00",
    activeEndTime: "06:00",
    hourlyTiers: [
      // CORRECTED: Now an array of objects
      { hours: 2, rate: 0.015 },
      { hours: 4, rate: 0.02 },
      { hours: 6, rate: 0.025 },
    ],
    dailyRate: undefined,
    period: undefined,
    stakingAsset: undefined,
    stakingAmount: undefined,
  },
  {
    name: "ASIC 矿机",
    price: 98,
    dailyRate: 0.03,
    period: 25,
    maxPurchase: 1,
    imgSrc: "/images/0kio.png",
    category: "staking",
    productType: "daily",
    stakingAsset: "USDT",
    stakingAmount: 50,
    hourlyTiers: undefined,
  },
  {
    name: "阿瓦隆矿机 (Avalon) A13",
    price: 103,
    dailyRate: 0.025,
    period: 30,
    maxPurchase: 1,
    imgSrc: "/images/0kio01.png",
    category: "staking",
    productType: "daily",
    hourlyTiers: undefined,
  },
  {
    name: "MicroBT Whatsminer M60S",
    price: 1,
    dailyRate: 0.8,
    period: 365,
    maxPurchase: 1,
    imgSrc: "/images/0kio02.png",
    category: "staking",
    productType: "daily",
    hourlyTiers: undefined,
  },
  {
    name: "Canaan Avalon A1566",
    price: 288,
    dailyRate: 0.027,
    period: 60,
    maxPurchase: 1,
    imgSrc: "/images/0kio03.png",
    category: "staking",
    productType: "daily",
    hourlyTiers: undefined,
  },
  {
    name: "Bitmain Antminer S21 Pro",
    price: 268,
    dailyRate: 0.019,
    period: 365,
    maxPurchase: 1,
    imgSrc: "/images/0kio04.png",
    category: "staking",
    productType: "daily",
    hourlyTiers: undefined,
  },
];

interface InvestmentSettingsContextType {
  investmentProducts: InvestmentProduct[];
  addProduct: (category: "staking" | "finance") => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  updateProduct: (
    id: string,
    updates: Partial<InvestmentProduct>
  ) => Promise<void>;
}

const InvestmentSettingsContext = createContext<
  InvestmentSettingsContextType | undefined
>(undefined);

// Helper to parse hourlyTiers FROM the database
// Helper function to map database records to UI InvestmentProduct type
const mapDbToProduct = (dbRecord: any, index: number): InvestmentProduct => {
  return {
    id: dbRecord.id || `db_${index}`,
    name: dbRecord.name || "Unknown Product",
    price: 100, // Default price since it's not in the database
    dailyRate: dbRecord.profit_rate || 0.05,
    period: dbRecord.period || 30,
    maxPurchase: 999, // Default max purchase
    imgSrc: "/images/investment-default.png", // Default image
    category: "finance" as const,
    productType: "daily" as const,
    // Map activeStartTime/activeEndTime to default values since they don't exist in DB
    activeStartTime: "00:00",
    activeEndTime: "23:59",
  };
};

const parseProductTiers = (product: any): InvestmentProduct => {
  return {
    ...product,
    hourlyTiers:
      typeof product.hourlyTiers === "string"
        ? JSON.parse(product.hourlyTiers)
        : product.hourlyTiers || undefined,
  };
};

export function InvestmentSettingsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [investmentProducts, setInvestmentProducts] = useState<
    InvestmentProduct[]
  >([]);

  const fetchProducts = useCallback(async () => {
    if (!isSupabaseEnabled) {
      console.warn("Supabase not enabled, using default investment products.");
      const productsWithIds = defaultInvestmentProducts.map(
        (product, index) => ({
          ...product,
          id: `default_${index}`,
        })
      );
      setInvestmentProducts(productsWithIds); // No need to parse defaults, they are already correct
      return;
    }

    try {
      // Only select columns that actually exist in the database
      const { data, error } = await supabase
        .from("investment_products")
        .select(
          "id, name, description, period, profit_rate, is_active, created_at"
        )
        .eq("is_active", true);

      if (error) {
        console.error(
          "Failed to load investment settings from Supabase",
          (error as any)?.message || error
        );
        // Fallback to default products on error
        const productsWithIds = defaultInvestmentProducts.map(
          (product, index) => ({
            ...product,
            id: `fallback_${index}`,
          })
        );
        setInvestmentProducts(productsWithIds);
        return;
      }

      if (!data || data.length === 0) {
        console.log("No products found, using default products...");
        // Use default products since the database table may not have the expected columns
        const productsWithIds = defaultInvestmentProducts.map(
          (product, index) => ({
            ...product,
            id: `default_${index}`,
          })
        );
        setInvestmentProducts(productsWithIds);
      } else {
        // Map database records to frontend format
        const mappedProducts = data.map((record, index) =>
          mapDbToProduct(record, index)
        );
        setInvestmentProducts(mappedProducts);
      }
    } catch (e: any) {
      console.error("Failed to fetch or seed investment products:", e.message);
      // Fallback to local data
      const productsWithIds = defaultInvestmentProducts.map(
        (product, index) => ({
          ...product,
          id: `fallback_${index}`,
        })
      );
      setInvestmentProducts(productsWithIds);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const addProduct = async (category: "staking" | "finance") => {
    if (!isSupabaseEnabled) {
      console.warn("Supabase not enabled, cannot add products.");
      return;
    }

    // Map to database schema - only use columns that exist
    const dbProduct = {
      name: "新产品",
      description: "产品描述",
      period: category === "staking" ? 30 : 7,
      profit_rate: category === "staking" ? 0.05 : 0.08,
      is_active: true,
    };

    const { error } = await supabase
      .from("investment_products")
      .insert(dbProduct);

    if (error) {
      console.error("Error adding product:", JSON.stringify(error, null, 2));
    } else {
      await fetchProducts(); // Refetch all products to get the new one with its ID
    }
  };

  const removeProduct = async (id: string) => {
    if (!isSupabaseEnabled) {
      console.warn("Supabase not enabled, cannot remove products.");
      return;
    }
    const { error } = await supabase
      .from("investment_products")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("Error removing product:", JSON.stringify(error, null, 2));
    } else {
      await fetchProducts(); // Refetch to update the list
    }
  };

  const updateProduct = async (
    id: string,
    updates: Partial<InvestmentProduct>
  ) => {
    if (!isSupabaseEnabled) {
      console.warn("Supabase not enabled, cannot update products.");
      return;
    }

    // Map frontend fields to database columns that exist
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.dailyRate !== undefined)
      dbUpdates.profit_rate = updates.dailyRate;
    if (updates.period !== undefined) dbUpdates.period = updates.period;
    // Note: price, maxPurchase, imgSrc, etc. are not stored in the database

    const { error } = await supabase
      .from("investment_products")
      .update(dbUpdates)
      .eq("id", id);

    if (error) {
      console.error("Error updating product:", JSON.stringify(error, null, 2));
    } else {
      // Optimistic update could be done here, but refetching is simpler
      await fetchProducts();
    }
  };

  return (
    <InvestmentSettingsContext.Provider
      value={{ investmentProducts, addProduct, removeProduct, updateProduct }}
    >
      {children}
    </InvestmentSettingsContext.Provider>
  );
}

export function useInvestmentSettings() {
  const context = useContext(InvestmentSettingsContext);
  if (context === undefined) {
    throw new Error(
      "useInvestmentSettings must be used within an InvestmentSettingsProvider"
    );
  }
  return context;
}

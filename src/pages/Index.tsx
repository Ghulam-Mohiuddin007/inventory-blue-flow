import React, { useState, useRef } from "react";
import { 
  Package, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  TrendingUp, 
  Plus, 
  Download, 
  Upload, 
  RotateCcw, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight, 
  ChevronRight, 
  Receipt, 
  Calendar, 
  ArrowUpRight,
  Sparkles,
  HardDrive,
  Clock,
  CheckCircle2,
  Share2,
  SlidersHorizontal
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddProductDialog } from "@/components/AddProductDialog";
import { AddSaleDialog } from "@/components/AddSaleDialog";
import { InvoiceReceiptDrawer } from "@/components/InvoiceReceiptDrawer";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { deviceStorage, Sale } from "@/services/deviceStorage";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useProducts, 
  useSales, 
  useStockEntries, 
  useKhataCustomers,
  useAddProduct, 
  useAddSale, 
  useAddStockEntry, 
  useUpdateProductQuantity 
} from "@/hooks/useInventoryData";
import { cn } from "@/lib/utils";

export interface LegacyProduct {
  id: string;
  name: string;
  company: string;
  formula: string;
  quantity: number;
  price?: number;
  dateAdded: Date;
}

export interface LegacySale {
  id: string;
  productName: string;
  price: number;
  companyName: string;
  quantity: number;
  customerName?: string;
  phoneNumber?: string;
  date: Date;
}

export interface LegacyStockEntry {
  id: string;
  productName: string;
  company: string;
  formula: string;
  quantityChange: number;
  type: 'new' | 'existing';
  date: Date;
}

const Index = () => {
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddSale, setShowAddSale] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [showReceiptDrawer, setShowReceiptDrawer] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries from In-Device IndexedDB
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: sales = [], isLoading: salesLoading } = useSales();
  const { data: stockEntries = [], isLoading: stockEntriesLoading } = useStockEntries();
  const { data: khataCustomers = [] } = useKhataCustomers();

  // Mutations
  const addProductMutation = useAddProduct();
  const addSaleMutation = useAddSale();
  const addStockEntryMutation = useAddStockEntry();
  const updateProductQuantityMutation = useUpdateProductQuantity();

  const handleAddProduct = (product: Omit<LegacyProduct, 'id' | 'dateAdded'>) => {
    addProductMutation.mutate({
      name: product.name,
      company: product.company,
      formula: product.formula,
      quantity: product.quantity,
      price: product.price || 0
    });
  };

  const handleIncreaseProduct = (productId: string, addQuantity: number, date: Date) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      updateProductQuantityMutation.mutate({ 
        id: productId, 
        quantity: product.quantity + addQuantity 
      });
      
      addStockEntryMutation.mutate({
        product_id: productId,
        product_name: product.name,
        company: product.company || '',
        formula: product.formula || '',
        quantity: addQuantity,
        entry_type: 'existing',
        entry_date: date.toISOString()
      });
    }
  };

  const handleLogStockEntry = (entry: Omit<LegacyStockEntry, 'id'>) => {
    addStockEntryMutation.mutate({
      product_name: entry.productName,
      company: entry.company,
      formula: entry.formula,
      quantity: entry.quantityChange,
      entry_type: entry.type,
      entry_date: entry.date.toISOString()
    });
  };

  const handleAddSale = (saleData: Omit<LegacySale, 'id'> & { date?: Date }) => {
    const product = products.find(p => p.name === saleData.productName);
    const saleDate = saleData.date || new Date();
    
    addSaleMutation.mutate({
      product_id: product?.id,
      product_name: saleData.productName,
      company: saleData.companyName,
      customer_name: saleData.customerName,
      phone_number: saleData.phoneNumber,
      quantity: saleData.quantity,
      price: saleData.price,
      total: saleData.price * saleData.quantity,
      amount_paid: saleData.price * saleData.quantity,
      due_amount: 0,
      payment_method: 'cash',
      payment_status: 'paid',
      sale_date: saleDate.toISOString()
    });
  };

  // Device Backup Export (IndexedDB)
  const handleExportBackup = async () => {
    try {
      const jsonStr = await deviceStorage.exportBackup();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "Backup Exported",
        description: "Full device IndexedDB database saved to JSON file.",
      });
    } catch (err) {
      toast({
        title: "Export Error",
        description: (err as Error).message,
        variant: "destructive"
      });
    }
  };

  // Device Backup Restore (IndexedDB)
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const result = await deviceStorage.importBackup(content);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['sales'] });
        queryClient.invalidateQueries({ queryKey: ['stock_entries'] });
        queryClient.invalidateQueries({ queryKey: ['khata_customers'] });
        toast({
          title: "Restore Successful",
          description: result.message,
        });
      } else {
        toast({
          title: "Restore Failed",
          description: result.message,
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetDemoData = async () => {
    if (confirm("Reset current inventory to sample store data?")) {
      await deviceStorage.resetToSampleData();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['stock_entries'] });
      queryClient.invalidateQueries({ queryKey: ['khata_customers'] });
      toast({
        title: "Demo Data Loaded",
        description: "Sample products and sales restored to device memory.",
      });
    }
  };

  // Metric Computations
  const totalInventoryValue = products.reduce((sum, p) => sum + (p.quantity * (p.price || 0)), 0);
  const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
  const lowStockProducts = products.filter(p => p.quantity < 10);
  const totalKhataDue = khataCustomers.reduce((sum, c) => sum + c.total_due, 0);
  const activeKhataDebtors = khataCustomers.filter(c => c.total_due > 0).length;

  const legacyProducts: LegacyProduct[] = products.map(p => ({
    id: p.id,
    name: p.name,
    company: p.company || '',
    formula: p.formula || '',
    quantity: p.quantity,
    price: p.price,
    dateAdded: new Date(p.created_at)
  }));

  const legacySales: LegacySale[] = sales.map(s => ({
    id: s.id,
    productName: s.product_name,
    companyName: s.company || '',
    customerName: s.customer_name,
    phoneNumber: s.phone_number,
    price: s.price,
    quantity: s.quantity,
    date: new Date(s.sale_date),
  }));

  const handleOpenReceiptModal = (sale: Sale) => {
    setSelectedSaleForReceipt(sale);
    setShowReceiptDrawer(true);
  };

  if (productsLoading || salesLoading || stockEntriesLoading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading local store database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* =========================================================================
          1. CLEAN EXECUTIVE GREETING HEADER
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              IndexedDB Local Engine
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {user?.storeName || "Store Dashboard"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Welcome back, {user?.name || "Store Manager"}. Here is your retail performance summary.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            onClick={() => navigate("/pos")}
            className="bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-semibold text-xs h-10 px-4 shadow-sm gap-1.5 transition-all"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Open POS Terminal</span>
          </Button>
          <Button
            onClick={() => setShowAddProduct(true)}
            variant="outline"
            className="border-slate-300 hover:bg-slate-100 active:scale-[0.98] text-slate-700 font-semibold text-xs h-10 px-3.5 gap-1.5 transition-all"
          >
            <Plus className="h-4 w-4 text-indigo-600" />
            <span>Add Product</span>
          </Button>
        </div>
      </div>

      {/* =========================================================================
          2. STREAMLINED SUMMARY METRIC CARDS (Minimalist Palette, Crisp Hairline Borders)
         ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Total Stock Catalog */}
        <Card className="bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all rounded-xl">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Catalog
            </span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Package className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tracking-tight">
              {products.length} <span className="text-xs font-normal text-slate-400 font-sans">SKUs</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-[11px]">
              {lowStockProducts.length > 0 ? (
                <span className="text-rose-700 font-semibold bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                  {lowStockProducts.length} low stock items
                </span>
              ) : (
                <span className="text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  All stock levels healthy
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Today / Total Sales Revenue */}
        <Card className="bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all rounded-xl">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Recorded Sales
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tracking-tight">
              PKR {totalSales.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              {sales.length} transactions completed
            </p>
          </CardContent>
        </Card>

        {/* Metric 3: Pending Udhaar / Credit Due */}
        <Card className="bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all rounded-xl">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Pending Udhaar (Khata)
            </span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-700">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-rose-600 font-mono tracking-tight">
              PKR {totalKhataDue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <p className="text-[11px] text-rose-700 font-medium mt-1.5">
              {activeKhataDebtors} customer accounts due
            </p>
          </CardContent>
        </Card>

        {/* Metric 4: Stock Valuation */}
        <Card className="bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all rounded-xl">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Stock Asset Value
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
              <BarChart3 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tracking-tight">
              PKR {totalInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Current retail inventory valuation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Warning Alert (if any) */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
            <div>
              <span className="font-bold text-amber-950">
                Low Inventory Notice: {lowStockProducts.length} items below minimum threshold
              </span>
              <p className="text-[11px] text-amber-800 mt-0.5">
                {lowStockProducts.slice(0, 3).map(p => `${p.name} (${p.quantity} units)`).join(", ")}
                {lowStockProducts.length > 3 && ` +${lowStockProducts.length - 3} more`}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => navigate("/inventory")}
            className="bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs h-8 px-3 shrink-0"
          >
            Review Stock
          </Button>
        </div>
      )}

      {/* =========================================================================
          3. TABBED VIEWS TO ELIMINATE CLUTTER & VISUAL OVERLAP
         ========================================================================= */}
      <Tabs defaultValue="operations" className="w-full space-y-4">
        {/* Modern Tab Bar */}
        <div className="flex items-center justify-between border-b border-slate-200">
          <TabsList className="bg-transparent p-0 gap-4 h-auto">
            <TabsTrigger 
              value="operations" 
              className="data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-1 py-2.5 text-xs font-semibold text-slate-500 transition-all"
            >
              Overview & Launchpad
            </TabsTrigger>
            <TabsTrigger 
              value="sales" 
              className="data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-1 py-2.5 text-xs font-semibold text-slate-500 transition-all flex items-center gap-1.5"
            >
              <span>Recent Sales</span>
              {sales.length > 0 && (
                <span className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {sales.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="inventory" 
              className="data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-1 py-2.5 text-xs font-semibold text-slate-500 transition-all flex items-center gap-1.5"
            >
              <span>Stock Snapshot</span>
              {products.length > 0 && (
                <span className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {products.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="tools" 
              className="data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-1 py-2.5 text-xs font-semibold text-slate-500 transition-all"
            >
              Backup & Database Tools
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: OPERATIONS & LAUNCHPAD */}
        <TabsContent value="operations" className="space-y-4 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quick POS Launch Card */}
            <div 
              onClick={() => navigate("/pos")}
              className="cursor-pointer group p-5 rounded-xl border border-indigo-100 bg-white hover:border-indigo-300 hover:shadow-md transition-all flex items-center justify-between"
            >
              <div className="space-y-1 pr-3">
                <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider">Point of Sale</span>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Open Retail POS Terminal
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2">
                  Fast checkout grid, barcode/name search, cash or credit split payments, and instant thermal receipt printing.
                </p>
                <div className="pt-2 flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                  <span>Launch Checkout</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <ShoppingCart className="h-6 w-6" />
              </div>
            </div>

            {/* Quick Customer Khata Card */}
            <div 
              onClick={() => navigate("/khata")}
              className="cursor-pointer group p-5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all flex items-center justify-between"
            >
              <div className="space-y-1 pr-3">
                <span className="text-[10px] uppercase font-bold text-rose-700 tracking-wider">Credit Ledger</span>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
                  Manage Customer Khata
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2">
                  Track cumulative customer credit balances, view monthly aging summaries, log settlements, and send WhatsApp reminders.
                </p>
                <div className="pt-2 flex items-center gap-1 text-xs font-semibold text-rose-600 group-hover:translate-x-0.5 transition-transform">
                  <span>View Khata Accounts</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:bg-rose-600 group-hover:text-white transition-all">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: RECENT SALES LOG */}
        <TabsContent value="sales" className="space-y-4 pt-1">
          <Card className="bg-white border border-slate-200/90 shadow-xs rounded-xl overflow-hidden">
            <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between border-b border-slate-100">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Latest Sales Transactions</CardTitle>
                <CardDescription className="text-xs">Click any transaction to view or print thermal receipt</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/sales-history")}
                className="text-xs text-indigo-600 font-semibold gap-1"
              >
                Full Sales History <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {sales.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No sales recorded yet. Start by completing a sale in the POS terminal.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] border-b border-slate-100">
                      <tr>
                        <th className="p-3 pl-4">Invoice #</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Items / Product</th>
                        <th className="p-3">Method</th>
                        <th className="p-3 text-right">Amount</th>
                        <th className="p-3 text-right pr-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {sales.slice(0, 6).map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 pl-4 font-mono font-bold text-slate-900">{s.invoice_number}</td>
                          <td className="p-3 font-medium text-slate-800">{s.customer_name || 'Walk-in'}</td>
                          <td className="p-3 text-slate-600 max-w-[200px] truncate">{s.product_name}</td>
                          <td className="p-3">
                            <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-100 font-semibold">
                              {s.payment_method}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            PKR {s.total.toFixed(2)}
                          </td>
                          <td className="p-3 text-right pr-4">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenReceiptModal(s)}
                              className="h-7 px-2 text-xs text-indigo-600 hover:bg-indigo-50 gap-1"
                            >
                              <Receipt className="h-3.5 w-3.5" />
                              Receipt
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: STOCK CATALOG SNAPSHOT */}
        <TabsContent value="inventory" className="space-y-4 pt-1">
          <Card className="bg-white border border-slate-200/90 shadow-xs rounded-xl overflow-hidden">
            <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between border-b border-slate-100">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Inventory Catalog Snapshot</CardTitle>
                <CardDescription className="text-xs">Quick review of products and quantities in device memory</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/inventory")}
                className="text-xs text-indigo-600 font-semibold gap-1"
              >
                Manage Inventory <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {products.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No products in inventory.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] border-b border-slate-100">
                      <tr>
                        <th className="p-3 pl-4">Product Name</th>
                        <th className="p-3">Manufacturer</th>
                        <th className="p-3 text-right">In Stock</th>
                        <th className="p-3 text-right">Unit Price</th>
                        <th className="p-3 text-right pr-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {products.slice(0, 6).map((p) => {
                        const isLow = p.quantity < 10;
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 pl-4 font-semibold text-slate-900">{p.name}</td>
                            <td className="p-3 text-slate-500">{p.company || '-'}</td>
                            <td className="p-3 text-right font-mono font-bold text-slate-900">{p.quantity}</td>
                            <td className="p-3 text-right font-mono">PKR {p.price?.toFixed(2)}</td>
                            <td className="p-3 text-right pr-4">
                              <Badge 
                                variant={isLow ? "destructive" : "secondary"} 
                                className="text-[10px] font-medium"
                              >
                                {isLow ? 'Low Stock' : 'In Stock'}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: DATABASE TOOLS & BACKUP */}
        <TabsContent value="tools" className="space-y-4 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Export Backup Card */}
            <Card className="bg-white border border-slate-200/90 shadow-xs rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                  <Download className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Export JSON Backup</h4>
                  <p className="text-[11px] text-slate-500">Download entire IndexedDB store</p>
                </div>
              </div>
              <p className="text-xs text-slate-600">
                Saves all products, sales records, customer Khata ledgers, and transactions to a portable JSON backup file.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportBackup}
                className="w-full text-xs font-semibold h-9 gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Export Backup File
              </Button>
            </Card>

            {/* Restore Backup Card */}
            <Card className="bg-white border border-slate-200/90 shadow-xs rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                  <Upload className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Restore Backup</h4>
                  <p className="text-[11px] text-slate-500">Restore from local JSON file</p>
                </div>
              </div>
              <p className="text-xs text-slate-600">
                Upload a previously exported backup file to restore complete inventory and ledger data to this device.
              </p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImportFile} 
                accept=".json" 
                className="hidden" 
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-xs font-semibold h-9 gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                Select Backup File
              </Button>
            </Card>

            {/* Reset Sample Demo Data Card */}
            <Card className="bg-white border border-slate-200/90 shadow-xs rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
                  <RotateCcw className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Reload Sample Store Data</h4>
                  <p className="text-[11px] text-slate-500">Reset to pharmacy demo items</p>
                </div>
              </div>
              <p className="text-xs text-slate-600">
                Resets the local database to standard medical sample products and simulated sales for testing.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleResetDemoData}
                className="w-full text-xs font-semibold h-9 gap-1.5 text-amber-800 border-amber-300 hover:bg-amber-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Sample Data
              </Button>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Product & Sale Creation Dialogs */}
      <AddProductDialog 
        open={showAddProduct}
        onOpenChange={setShowAddProduct}
        onAddProduct={handleAddProduct}
        existingProducts={legacyProducts}
        onIncreaseProduct={handleIncreaseProduct}
        onLogStockEntry={handleLogStockEntry}
      />
      
      <AddSaleDialog 
        open={showAddSale}
        onOpenChange={setShowAddSale}
        onAddSale={handleAddSale}
        products={legacyProducts}
      />

      {/* Invoice & Receipt Preview Drawer */}
      <InvoiceReceiptDrawer
        open={showReceiptDrawer}
        onOpenChange={setShowReceiptDrawer}
        sale={selectedSaleForReceipt}
      />
    </div>
  );
};

export default Index;
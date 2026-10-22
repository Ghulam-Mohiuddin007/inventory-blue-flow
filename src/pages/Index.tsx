import { useState, useRef } from "react";
import { 
  Plus, 
  Package, 
  TrendingUp, 
  ClipboardList, 
  BarChart3, 
  History, 
  Download, 
  Upload, 
  RotateCcw, 
  HardDrive, 
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  ShoppingCart,
  Users,
  ArrowUpRight,
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddProductDialog } from "@/components/AddProductDialog";
import { AddSaleDialog } from "@/components/AddSaleDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { deviceStorage } from "@/services/deviceStorage";
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries from Device Storage
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

  const totalInventoryValue = products.reduce((sum, p) => sum + (p.quantity * p.price), 0);
  const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
  const lowStockProducts = products.filter(p => p.quantity < 10);
  const totalKhataDue = khataCustomers.reduce((sum, c) => sum + c.total_due, 0);
  
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

  if (productsLoading || salesLoading || stockEntriesLoading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="text-center space-y-2">
          <Package className="h-8 w-8 text-indigo-600 mx-auto animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading local device engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SaaS Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 shadow-md border border-slate-800">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Device Storage Engine Active
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Welcome back, {user?.name || user?.email || "Manager"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Track stock levels, record sales with POS terminal, and manage customer credit (Khata) completely offline.
            </p>
          </div>

          {/* Quick Actions & Backup in Banner */}
          <div className="flex items-center gap-2 flex-wrap">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportFile} 
              accept=".json" 
              className="hidden" 
            />
            <button 
              onClick={handleExportBackup} 
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 px-3 py-1.5 rounded-xl transition text-xs font-medium"
              title="Download JSON backup"
            >
              <Download className="h-3.5 w-3.5" /> Backup
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 px-3 py-1.5 rounded-xl transition text-xs font-medium"
              title="Upload JSON backup"
            >
              <Upload className="h-3.5 w-3.5" /> Restore
            </button>
            <button 
              onClick={handleResetDemoData} 
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 px-3 py-1.5 rounded-xl transition text-xs font-medium"
              title="Reload sample medical inventory"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Demo Data
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Metric Cards (High Density SaaS Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Total Products */}
        <Card className="shadow-xs border-slate-200 bg-white hover:border-slate-300 transition-all">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Catalog
            </CardTitle>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Package className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">
              {products.length} <span className="text-xs font-normal text-slate-400 font-sans">items</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px]">
              {lowStockProducts.length > 0 ? (
                <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded">
                  {lowStockProducts.length} low stock
                </span>
              ) : (
                <span className="text-emerald-600 font-medium">All stocks optimal</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Total Sales */}
        <Card className="shadow-xs border-slate-200 bg-white hover:border-slate-300 transition-all">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Revenue
            </CardTitle>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">
              PKR {totalSales.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{sales.length} orders recorded</p>
          </CardContent>
        </Card>

        {/* Metric 3: Inventory Value */}
        <Card className="shadow-xs border-slate-200 bg-white hover:border-slate-300 transition-all">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Stock Asset Value
            </CardTitle>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <BarChart3 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">
              PKR {totalInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Current shelf worth</p>
          </CardContent>
        </Card>

        {/* Metric 4: Customer Khata Dues */}
        <Card className="shadow-xs border-slate-200 bg-white hover:border-slate-300 transition-all">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Customer Khata Due
            </CardTitle>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-rose-600 font-mono">
              PKR {totalKhataDue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <p className="text-[11px] text-rose-600/80 font-medium mt-1">Pending receivables (Udhar)</p>
          </CardContent>
        </Card>
      </div>

      {/* Dedicated POS & Khata Quick Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Launch POS Terminal */}
        <div 
          onClick={() => navigate("/pos")}
          className="cursor-pointer group p-5 rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-900 text-white shadow-md hover:shadow-xl transition-all relative overflow-hidden flex items-center justify-between"
        >
          <div className="space-y-1.5 z-10">
            <Badge className="bg-indigo-500/30 text-indigo-200 border-indigo-400/40 text-[10px] font-mono">
              Fast Shopkeeper Checkout
            </Badge>
            <h3 className="text-lg font-bold">Open POS Terminal</h3>
            <p className="text-xs text-indigo-200 max-w-sm">
              Scan or click products, adjust quantities, process cash/credit, and print instant receipts.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-xs font-semibold text-white group-hover:translate-x-1 transition-transform">
              <span>Start Selling</span>
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="p-4 bg-white/10 rounded-2xl text-white group-hover:scale-110 transition-transform shrink-0 ml-3">
            <ShoppingCart className="h-8 w-8" />
          </div>
        </div>

        {/* Launch Customer Khata */}
        <div 
          onClick={() => navigate("/khata")}
          className="cursor-pointer group p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-md hover:shadow-xl transition-all relative overflow-hidden flex items-center justify-between"
        >
          <div className="space-y-1.5 z-10">
            <Badge className="bg-rose-500/30 text-rose-200 border-rose-400/40 text-[10px] font-mono">
              Credit / Udhar Ledger
            </Badge>
            <h3 className="text-lg font-bold">Customer Khata Ledger</h3>
            <p className="text-xs text-slate-300 max-w-sm">
              Keep track of customers who take items on credit, log payments, and send WhatsApp statements.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-xs font-semibold text-white group-hover:translate-x-1 transition-transform">
              <span>Manage Khata</span>
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="p-4 bg-white/10 rounded-2xl text-white group-hover:scale-110 transition-transform shrink-0 ml-3">
            <Users className="h-8 w-8" />
          </div>
        </div>
      </div>

      {/* Reorder Alerts Banner (Low Stock Alert) */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-amber-950">
                Low Stock Alert: {lowStockProducts.length} Items Need Reordering
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                {lowStockProducts.map(p => `${p.name} (${p.quantity} left)`).slice(0, 3).join(", ")}
                {lowStockProducts.length > 3 && ` +${lowStockProducts.length - 3} more`}
              </p>
            </div>
          </div>

          <Button 
            size="sm" 
            onClick={() => setShowAddProduct(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold h-9 shrink-0"
          >
            Replenish Stock
          </Button>
        </div>
      )}

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Transactions */}
        <Card className="shadow-xs border-slate-200 bg-white">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">Recent Sales Transactions</CardTitle>
              <CardDescription className="text-xs">Logged into device storage</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/sales-history")} 
              className="text-xs text-indigo-600 gap-1 p-0 h-auto font-semibold"
            >
              View All <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {sales.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No transactions recorded yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {sales.slice(0, 4).map((s) => (
                  <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-slate-400 font-bold">{s.invoice_number}</span>
                        <p className="font-semibold text-slate-900 truncate">{s.product_name}</p>
                      </div>
                      <p className="text-slate-500 text-[11px] truncate mt-0.5">
                        {s.customer_name ? `Customer: ${s.customer_name} • ` : ''}
                        Qty: {s.quantity} • Method: {s.payment_method?.toUpperCase() || 'CASH'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-emerald-600 font-mono text-sm">
                        PKR {s.total.toFixed(2)}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(s.sale_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fast Inventory Snapshot */}
        <Card className="shadow-xs border-slate-200 bg-white">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">Inventory Catalog Snapshot</CardTitle>
              <CardDescription className="text-xs">Active products & unit prices</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/inventory")} 
              className="text-xs text-indigo-600 gap-1 p-0 h-auto font-semibold"
            >
              Full Catalog <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {products.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No products found.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {products.slice(0, 4).map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                      <p className="text-slate-400 text-[11px] truncate">{p.company} • {p.formula}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge 
                        variant={p.quantity < 10 ? "destructive" : "secondary"} 
                        className="text-[10px] font-mono font-bold"
                      >
                        {p.quantity} units
                      </Badge>
                      <p className="text-[11px] text-slate-600 mt-0.5 font-mono font-semibold">
                        PKR {p.price?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
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
    </div>
  );
};

export default Index;
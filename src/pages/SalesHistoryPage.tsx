import { useState } from "react";
import { BarChart3, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SalesHistory } from "@/components/SalesHistory";
import { InvoiceReceiptDrawer } from "@/components/InvoiceReceiptDrawer";
import { useNavigate } from "react-router-dom";
import { useSales } from "@/hooks/useInventoryData";
import { Sale } from "@/services/deviceStorage";

const SalesHistoryPage = () => {
  const navigate = useNavigate();
  const { data: sales = [], isLoading } = useSales();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showReceiptDrawer, setShowReceiptDrawer] = useState(false);

  const handleViewReceipt = (sale: Sale) => {
    setSelectedSale(sale);
    setShowReceiptDrawer(true);
  };

  if (isLoading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="text-center space-y-2">
          <BarChart3 className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading sales history from device...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Enterprise Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-emerald-600" />
            Sales Transactions & Invoices
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {sales.length} {sales.length === 1 ? 'Transaction' : 'Transactions'} recorded in device storage
          </p>
        </div>

        <Button 
          onClick={() => navigate("/pos")}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-semibold text-xs sm:text-sm h-10 px-3.5 gap-1.5 shrink-0"
        >
          <ShoppingCart className="h-4 w-4" />
          New Sale (POS)
        </Button>
      </div>

      <Card className="shadow-xs border-slate-200 bg-white">
        <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3 border-b border-slate-100">
          <CardTitle className="text-sm sm:text-base font-bold text-slate-900">Transaction History Log</CardTitle>
          <CardDescription className="text-xs">
            Search invoices, filter by date, download CSV backups, or view full customer receipts
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-4">
          <SalesHistory 
            sales={sales} 
            onViewReceipt={handleViewReceipt} 
          />
        </CardContent>
      </Card>

      {/* Invoice & Receipt Preview Drawer */}
      <InvoiceReceiptDrawer 
        open={showReceiptDrawer}
        onOpenChange={setShowReceiptDrawer}
        sale={selectedSale}
      />
    </div>
  );
};

export default SalesHistoryPage;
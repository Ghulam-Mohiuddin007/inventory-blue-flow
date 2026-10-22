import { History, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StockEntries } from "@/components/StockEntries";
import { useNavigate } from "react-router-dom";
import { useStockEntries } from "@/hooks/useInventoryData";
import { LegacyStockEntry } from "./Index";

const StockEntriesPage = () => {
  const navigate = useNavigate();
  const { data: stockEntries = [], isLoading } = useStockEntries();

  // Convert to legacy format for existing components
  const legacyStockEntries: LegacyStockEntry[] = stockEntries.map(e => ({
    id: e.id,
    productName: e.product_name,
    company: e.company || '',
    formula: e.formula || '',
    quantityChange: e.quantity,
    type: e.entry_type as 'new' | 'existing',
    date: new Date(e.entry_date)
  }));

  if (isLoading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="text-center space-y-2">
          <History className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading stock entries from device...</p>
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
            <History className="h-6 w-6 text-purple-600" />
            Stock Replenishment Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {legacyStockEntries.length} {legacyStockEntries.length === 1 ? 'Entry' : 'Entries'} recorded in device memory
          </p>
        </div>

        <Button 
          onClick={() => navigate("/inventory")}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-semibold text-xs sm:text-sm h-10 px-3.5 gap-1.5 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Manage Stock
        </Button>
      </div>

      <Card className="shadow-xs border-slate-200 bg-white">
        <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3 border-b border-slate-100">
          <CardTitle className="text-sm sm:text-base font-bold text-slate-900">Stock Inward History</CardTitle>
          <CardDescription className="text-xs">
            Audit trail of newly added products and inventory quantity increments
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-4">
          <StockEntries entries={legacyStockEntries} />
        </CardContent>
      </Card>
    </div>
  );
};

export default StockEntriesPage;
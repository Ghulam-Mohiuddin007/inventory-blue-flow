import { useState } from "react";
import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InventoryTable } from "@/components/InventoryTable";
import { AddProductDialog } from "@/components/AddProductDialog";
import { 
  useProducts, 
  useAddProduct, 
  useAddStockEntry, 
  useUpdateProductQuantity 
} from "@/hooks/useInventoryData";
import { LegacyProduct } from "./Index";

const Inventory = () => {
  const [showAddProduct, setShowAddProduct] = useState(false);
  const { data: products = [], isLoading } = useProducts();
  const addProductMutation = useAddProduct();
  const addStockEntryMutation = useAddStockEntry();
  const updateProductQuantityMutation = useUpdateProductQuantity();

  // Convert to legacy format for existing components
  const legacyProducts: LegacyProduct[] = products.map(p => ({
    id: p.id,
    name: p.name,
    company: p.company || '',
    formula: p.formula || '',
    quantity: p.quantity,
    price: p.price,
    dateAdded: new Date(p.created_at)
  }));

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

  const handleLogStockEntry = (entry: {
    productName: string;
    company: string;
    formula: string;
    quantityChange: number;
    type: 'new' | 'existing';
    date: Date;
  }) => {
    addStockEntryMutation.mutate({
      product_name: entry.productName,
      company: entry.company,
      formula: entry.formula,
      quantity: entry.quantityChange,
      entry_type: entry.type,
      entry_date: entry.date.toISOString()
    });
  };

  if (isLoading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="text-center space-y-2">
          <Package className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading inventory from device...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Clean Enterprise Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Package className="h-6 w-6 text-indigo-600" />
            Inventory & Stock Catalog
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {legacyProducts.length} {legacyProducts.length === 1 ? 'Product' : 'Products'} active in device memory
          </p>
        </div>

        <Button 
          onClick={() => setShowAddProduct(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-semibold text-xs sm:text-sm h-10 px-3.5 gap-1.5 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add New Product
        </Button>
      </div>

      <Card className="shadow-xs border-slate-200 bg-white">
        <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3 border-b border-slate-100">
          <CardTitle className="text-sm sm:text-base font-bold text-slate-900">Product List & Stock Levels</CardTitle>
          <CardDescription className="text-xs">
            Search, filter, check stock levels, and delete products stored in this device
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-4">
          <InventoryTable products={legacyProducts} />
        </CardContent>
      </Card>

      <AddProductDialog 
        open={showAddProduct}
        onOpenChange={setShowAddProduct}
        onAddProduct={handleAddProduct}
        existingProducts={legacyProducts}
        onIncreaseProduct={handleIncreaseProduct}
        onLogStockEntry={handleLogStockEntry}
      />
    </div>
  );
};

export default Inventory;
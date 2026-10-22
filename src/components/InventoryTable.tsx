import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertTriangle, Package, CalendarIcon, X, Search, Trash2, LayoutList, LayoutGrid } from "lucide-react";
import { LegacyProduct } from "@/pages/Index";
import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useDeleteProduct } from "@/hooks/useInventoryData";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface InventoryTableProps {
  products: LegacyProduct[];
}

export const InventoryTable = ({ products }: InventoryTableProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'auto' | 'cards' | 'table'>('auto');
  const deleteProduct = useDeleteProduct();

  const handleDeleteProduct = (productId: string) => {
    deleteProduct.mutate(productId);
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) {
      return { label: "Out of Stock", variant: "destructive" as const, icon: AlertTriangle, bgClass: "bg-red-50 text-red-700 border-red-200" };
    } else if (quantity < 10) {
      return { label: "Low Stock", variant: "secondary" as const, icon: AlertTriangle, bgClass: "bg-amber-50 text-amber-700 border-amber-200" };
    } else {
      return { label: "In Stock", variant: "default" as const, icon: Package, bgClass: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.formula.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.company.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = !selectedDate || (() => {
      const productDate = new Date(product.dateAdded);
      const filterDate = new Date(selectedDate);
      return productDate.toDateString() === filterDate.toDateString();
    })();
    
    return matchesSearch && matchesDate;
  });

  const clearDateFilter = () => {
    setSelectedDate(undefined);
  };

  const clearSearchFilter = () => {
    setSearchTerm("");
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <Package className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">No Products Found</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Add your first product to start tracking your inventory in device memory.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by product name, formula, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 text-xs sm:text-sm"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearchFilter}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        
        {/* Date Filter & View Switch */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "flex-1 sm:w-[200px] justify-start text-left font-normal text-xs sm:text-sm h-10",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                <span className="truncate">{selectedDate ? format(selectedDate, "PP") : "Filter date"}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {selectedDate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearDateFilter}
              className="h-10 px-2 text-xs"
              title="Clear date filter"
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          {/* View mode toggle (visible on mobile / desktop) */}
          <div className="hidden sm:flex border rounded-lg p-0.5 bg-slate-50">
            <button
              onClick={() => setViewMode('table')}
              className={cn("p-1.5 rounded text-xs transition", (viewMode === 'table' || viewMode === 'auto') ? "bg-white shadow-xs text-blue-600" : "text-slate-500")}
              title="Table view"
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={cn("p-1.5 rounded text-xs transition", viewMode === 'cards' ? "bg-white shadow-xs text-blue-600" : "text-slate-500")}
              title="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>Showing {filteredProducts.length} of {products.length} products</span>
      </div>

      {/* MOBILE CARD VIEW (Default on phones, or if cards selected) */}
      <div className={cn("space-y-3", viewMode === 'table' ? "hidden" : viewMode === 'cards' ? "block" : "block md:hidden")}>
        {filteredProducts.map((product) => {
          const status = getStockStatus(product.quantity);
          const StatusIcon = status.icon;
          const totalValue = (product.price || 0) * product.quantity;

          return (
            <div 
              key={product.id}
              className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-xs hover:shadow-sm transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-sm text-slate-900 truncate">{product.name}</h4>
                  <p className="text-xs text-slate-500 font-medium">{product.company}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{product.formula}</p>
                </div>
                <Badge variant={status.variant} className="text-[11px] gap-1 shrink-0">
                  <StatusIcon className="h-3 w-3" />
                  {product.quantity} in stock
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                <div>
                  <span className="text-muted-foreground text-[11px]">Price / Unit</span>
                  <p className="font-semibold text-slate-800 font-mono">
                    {product.price ? `PKR ${product.price.toFixed(2)}` : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px]">Total Stock Value</span>
                  <p className="font-semibold text-slate-800 font-mono">
                    {product.price ? `PKR ${totalValue.toFixed(2)}` : '-'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-400">
                <span>Added: {format(new Date(product.dateAdded), "dd MMM yyyy")}</span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 h-7 px-2 text-xs gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Product</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{product.name}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleDeleteProduct(product.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className={cn("rounded-xl border border-slate-200/90 overflow-hidden bg-white shadow-xs", viewMode === 'cards' ? "hidden" : viewMode === 'table' ? "block" : "hidden md:block")}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-semibold text-xs">Product Name</TableHead>
                <TableHead className="font-semibold text-xs">Company</TableHead>
                <TableHead className="font-semibold text-xs">Formula</TableHead>
                <TableHead className="text-right font-semibold text-xs">Quantity</TableHead>
                <TableHead className="text-right font-semibold text-xs">Price/Unit</TableHead>
                <TableHead className="text-right font-semibold text-xs">Total Value</TableHead>
                <TableHead className="font-semibold text-xs">Status</TableHead>
                <TableHead className="text-right font-semibold text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const status = getStockStatus(product.quantity);
                const StatusIcon = status.icon;
                const totalValue = (product.price || 0) * product.quantity;
                
                return (
                  <TableRow key={product.id} className="hover:bg-slate-50/70 transition-colors">
                    <TableCell className="font-medium text-xs sm:text-sm text-slate-900">{product.name}</TableCell>
                    <TableCell className="text-xs text-slate-600">{product.company}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{product.formula}</TableCell>
                    <TableCell className="text-right font-mono text-xs sm:text-sm font-semibold">{product.quantity}</TableCell>
                    <TableCell className="text-right font-mono text-xs sm:text-sm">
                      {product.price ? `PKR ${product.price.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs sm:text-sm text-slate-700">
                      {product.price ? `PKR ${totalValue.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant} className="flex items-center gap-1 w-fit text-[11px]">
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 h-8 w-8"
                            title="Delete product"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Product</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{product.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteProduct(product.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
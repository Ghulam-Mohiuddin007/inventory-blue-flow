import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TrendingUp, AlertTriangle, Check, ChevronsUpDown, User, Phone } from "lucide-react";
import { LegacyProduct, LegacySale } from "@/pages/Index";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AddSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddSale: (sale: Omit<LegacySale, 'id'> & { date?: Date }) => void;
  products: LegacyProduct[];
}

export const AddSaleDialog = ({ open, onOpenChange, onAddSale, products }: AddSaleDialogProps) => {
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saleDate, setSaleDate] = useState<Date>(new Date());
  const [openProductSelect, setOpenProductSelect] = useState(false);

  const selectedProductData = products.find(p => p.id === selectedProduct);
  const totalAmount = quantity && price ? (parseFloat(price) * parseInt(quantity)).toFixed(2) : "0.00";
  const availableStock = selectedProductData?.quantity || 0;
  const requestedQuantity = parseInt(quantity) || 0;
  const insufficientStock = requestedQuantity > availableStock;

  const handleSelectProduct = (productId: string) => {
    setSelectedProduct(productId);
    const prod = products.find(p => p.id === productId);
    if (prod && prod.price) {
      setPrice(prod.price.toString());
    }
    setOpenProductSelect(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct || !quantity || !price) {
      toast({
        title: "Missing Information",
        description: "Please select a product and enter quantity and price.",
        variant: "destructive"
      });
      return;
    }

    if (insufficientStock) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${availableStock} units available for ${selectedProductData?.name}.`,
        variant: "destructive"
      });
      return;
    }

    if (selectedProductData) {
      onAddSale({
        productName: selectedProductData.name,
        price: parseFloat(price),
        companyName: selectedProductData.company,
        quantity: parseInt(quantity),
        customerName: customerName || undefined,
        phoneNumber: phoneNumber || undefined,
        date: saleDate
      });

      setSelectedProduct("");
      setQuantity("1");
      setPrice("");
      setCustomerName("");
      setPhoneNumber("");
      setSaleDate(new Date());
      setOpenProductSelect(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            Record New Sale
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Record customer sale and update device inventory stock automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Customer Info (Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="customer-name" className="text-xs font-medium flex items-center gap-1 text-slate-600">
                <User className="h-3 w-3" /> Customer Name (Optional)
              </Label>
              <Input
                id="customer-name"
                placeholder="e.g. John Doe"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="h-10 text-xs sm:text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone-number" className="text-xs font-medium flex items-center gap-1 text-slate-600">
                <Phone className="h-3 w-3" /> Phone Number (Optional)
              </Label>
              <Input
                id="phone-number"
                type="tel"
                inputMode="tel"
                placeholder="e.g. 0300-1234567"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                className="h-10 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Product Select Combobox */}
          <div className="space-y-1.5">
            <Label htmlFor="product" className="text-xs font-medium text-slate-700">Select Product *</Label>
            <Popover open={openProductSelect} onOpenChange={setOpenProductSelect}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openProductSelect}
                  className="w-full justify-between h-10 text-xs sm:text-sm font-normal text-left"
                >
                  <span className="truncate">
                    {selectedProduct
                      ? products.find((product) => product.id === selectedProduct)?.name
                      : "Choose product from device..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-3rem)] sm:w-[480px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search product name, company, formula..." className="text-xs sm:text-sm" />
                  <CommandList className="max-h-[220px]">
                    <CommandEmpty>No product found on device.</CommandEmpty>
                    <CommandGroup>
                      {products.map((product) => (
                        <CommandItem
                          key={product.id}
                          value={`${product.name} ${product.company} ${product.formula}`}
                          onSelect={() => handleSelectProduct(product.id)}
                          className="text-xs sm:text-sm py-2 cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0",
                              selectedProduct === product.id ? "opacity-100 text-emerald-600" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-slate-900 truncate">{product.name}</span>
                            <span className="text-[11px] text-muted-foreground truncate">
                              {product.company} • Stock: {product.quantity} • PKR {product.price?.toFixed(2)}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {selectedProductData && (
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">Company:</span>
                <span className="font-semibold text-slate-900">{selectedProductData.company}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">Available Stock:</span>
                <span className={`font-semibold ${availableStock < 10 ? 'text-amber-600' : 'text-emerald-700'}`}>
                  {availableStock} units
                </span>
              </div>
            </div>
          )}

          {/* Quantity and Price */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="quantity" className="text-xs font-medium text-slate-700">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                inputMode="numeric"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Qty"
                className="h-10 text-xs sm:text-sm"
                required
              />
              {insufficientStock && quantity && (
                <div className="flex items-center gap-1 text-[11px] text-destructive mt-1 font-medium">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  Only {availableStock} available
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sale-price" className="text-xs font-medium text-slate-700">Price / Unit *</Label>
              <Input
                id="sale-price"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="PKR"
                className="h-10 text-xs sm:text-sm font-mono"
                required
              />
            </div>
          </div>

          {/* Sale Date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Sale Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal text-xs sm:text-sm h-10",
                    !saleDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {saleDate ? format(saleDate, "PPP") : <span>Pick date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={saleDate}
                  onSelect={(date) => setSaleDate(date || new Date())}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Total Preview */}
          {quantity && price && (
            <div className="p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-emerald-900">Total Sale Amount:</span>
                {selectedProductData && (
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Remaining stock: {Math.max(0, availableStock - requestedQuantity)} units
                  </p>
                )}
              </div>
              <span className="text-xl sm:text-2xl font-bold text-emerald-700 font-mono">
                PKR {totalAmount}
              </span>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full h-11 text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
            disabled={insufficientStock || !selectedProduct}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Save Sale to Device
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
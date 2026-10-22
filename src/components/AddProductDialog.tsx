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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Package } from "lucide-react";
import { LegacyProduct } from "@/pages/Index";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddProduct: (product: Omit<LegacyProduct, 'id' | 'dateAdded'>) => void;
  existingProducts: LegacyProduct[];
  onIncreaseProduct: (productId: string, addQuantity: number, date: Date) => void;
  onLogStockEntry: (entry: {
    productName: string;
    company: string;
    formula: string;
    quantityChange: number;
    type: 'new' | 'existing';
    date: Date;
  }) => void;
}

export const AddProductDialog = ({ open, onOpenChange, onAddProduct, existingProducts, onIncreaseProduct, onLogStockEntry }: AddProductDialogProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    formula: "",
    quantity: "",
    price: ""
  });
  const [productDate, setProductDate] = useState<Date>(new Date());
  const [selectedExistingProduct, setSelectedExistingProduct] = useState("");
  const [additionalQuantity, setAdditionalQuantity] = useState("");

  const handleSubmit = (e: React.FormEvent, isNewProduct: boolean) => {
    e.preventDefault();
    
    if (isNewProduct) {
      if (!formData.name || !formData.company || !formData.formula || !formData.quantity) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields.",
          variant: "destructive"
        });
        return;
      }

      onAddProduct({
        name: formData.name,
        company: formData.company,
        formula: formData.formula,
        quantity: parseInt(formData.quantity),
        price: formData.price ? parseFloat(formData.price) : undefined
      });

      onLogStockEntry({
        productName: formData.name,
        company: formData.company,
        formula: formData.formula,
        quantityChange: parseInt(formData.quantity),
        type: 'new',
        date: productDate
      });

      toast({
        title: "Product Added",
        description: `${formData.name} has been added to inventory.`,
      });

      setFormData({ name: "", company: "", formula: "", quantity: "", price: "" });
      setProductDate(new Date());
    } else {
      if (!selectedExistingProduct || !additionalQuantity) {
        toast({
          title: "Missing Information", 
          description: "Please select a product and enter quantity to add.",
          variant: "destructive"
        });
        return;
      }

      const existing = existingProducts.find(p => p.id === selectedExistingProduct);
      if (existing) {
        onIncreaseProduct(selectedExistingProduct, parseInt(additionalQuantity), productDate);

        toast({
          title: "Inventory Updated",
          description: `Added ${additionalQuantity} units to ${existing.name}.`,
        });
      }

      setSelectedExistingProduct("");
      setAdditionalQuantity("");
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Add Product to Inventory
          </DialogTitle>
          <DialogDescription>
            Add a new product or update existing product quantities.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="new" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new">New Product</TabsTrigger>
            <TabsTrigger value="existing">Existing Product</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Product Information</CardTitle>
                <CardDescription>Enter details for the new product</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Product Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter product name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company Name *</Label>
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                        placeholder="Enter company name"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="formula">Product Formula *</Label>
                    <Input
                      id="formula"
                      value={formData.formula}
                      onChange={(e) => setFormData(prev => ({ ...prev, formula: e.target.value }))}
                      placeholder="Enter product formula"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={formData.quantity}
                        onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                        placeholder="Enter quantity"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Price per Unit</Label>
                      <Input
                        id="price"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="Enter price (optional)"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Date Added *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !productDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {productDate ? format(productDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={productDate}
                          onSelect={(date) => setProductDate(date || new Date())}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Button type="submit" className="inventory-button-primary w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Product
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="existing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Update Existing Product</CardTitle>
                <CardDescription>Add quantity to an existing product</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="existing-product">Select Product</Label>
                    <Select value={selectedExistingProduct} onValueChange={setSelectedExistingProduct}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an existing product" />
                      </SelectTrigger>
                      <SelectContent>
                        {existingProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - {product.company} (Current: {product.quantity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="additional-quantity">Additional Quantity</Label>
                    <Input
                      id="additional-quantity"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={additionalQuantity}
                      onChange={(e) => setAdditionalQuantity(e.target.value)}
                      placeholder="Enter quantity to add"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !productDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {productDate ? format(productDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={productDate}
                          onSelect={(date) => setProductDate(date || new Date())}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Button type="submit" className="inventory-button-primary w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Update Product Quantity
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
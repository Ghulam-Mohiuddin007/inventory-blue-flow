import React, { useState } from "react";
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Banknote, 
  Receipt, 
  User, 
  Phone, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw,
  Package,
  Layers,
  ArrowRight,
  Sparkles,
  Calculator,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { useProducts, useAddSale, useKhataCustomers } from "@/hooks/useInventoryData";
import { Sale, SaleItem, generateInvoiceNumber } from "@/services/deviceStorage";
import { InvoiceReceiptDrawer } from "@/components/InvoiceReceiptDrawer";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CartItem extends SaleItem {
  availableStock: number;
}

export const PosTerminal: React.FC = () => {
  const { data: products = [] } = useProducts();
  const { data: khataCustomers = [] } = useKhataCustomers();
  const addSaleMutation = useAddSale();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Checkout Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'card' | 'online'>('cash');
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amountPaidInput, setAmountPaidInput] = useState<string>("");
  const [discountInput, setDiscountInput] = useState<string>("0");

  // Receipt Modal
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [showReceiptDrawer, setShowReceiptDrawer] = useState(false);

  // Categories
  const categories = ["All", ...Array.from(new Set(products.map(p => p.category || "General").filter(Boolean)))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.formula && p.formula.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.company && p.company.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === "All" || (p.category || "General") === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: typeof products[0]) => {
    if (product.quantity <= 0) {
      toast({
        title: "Out of Stock",
        description: `${product.name} is currently out of stock.`,
        variant: "destructive",
      });
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          toast({
            title: "Max Stock Reached",
            description: `Only ${product.quantity} units available in device inventory.`,
            variant: "destructive",
          });
          return prev;
        }
        return prev.map(item => 
          item.product_id === product.id 
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
            : item
        );
      } else {
        return [...prev, {
          product_id: product.id,
          product_name: product.name,
          company: product.company,
          quantity: 1,
          price: product.price,
          total: product.price,
          availableStock: product.quantity,
        }];
      }
    });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product_id === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.availableStock) {
            toast({
              title: "Stock Exceeded",
              description: `Only ${item.availableStock} units available.`,
              variant: "destructive"
            });
            return item;
          }
          return {
            ...item,
            quantity: newQty,
            total: newQty * item.price,
          };
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName("");
    setPhoneNumber("");
    setAmountPaidInput("");
    setDiscountInput("0");
  };

  // Financial Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discount = Math.max(0, parseFloat(discountInput) || 0);
  const grandTotal = Math.max(0, subtotal - discount);

  // Default amount paid calculation
  const parsedAmountPaid = amountPaidInput !== "" ? parseFloat(amountPaidInput) || 0 : (paymentMethod === 'credit' ? 0 : grandTotal);
  const amountPaid = Math.max(0, parsedAmountPaid);
  const dueAmount = Math.max(0, grandTotal - amountPaid);
  const changeToReturn = Math.max(0, amountPaid - grandTotal);
  const paymentStatus = dueAmount === 0 ? 'paid' : (amountPaid > 0 ? 'partial' : 'due');

  const handleOpenCheckoutModal = () => {
    if (cart.length === 0) {
      toast({
        title: "Cart is Empty",
        description: "Add items from product catalog to proceed with checkout.",
        variant: "destructive"
      });
      return;
    }
    // Prefill exact amount paid for cash by default
    if (amountPaidInput === "") {
      setAmountPaidInput(grandTotal.toString());
    }
    setShowCheckoutModal(true);
  };

  const handleSelectExistingCustomer = (custName: string, phone?: string) => {
    setCustomerName(custName);
    if (phone) setPhoneNumber(phone);
  };

  const handleConfirmSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (dueAmount > 0 && !customerName.trim()) {
      toast({
        title: "Customer Name Required",
        description: "Credit / Udhaar sales require a customer name to maintain the Khata ledger.",
        variant: "destructive"
      });
      return;
    }

    const invNum = generateInvoiceNumber();
    const primaryProduct = cart[0];

    const salePayload = {
      invoice_number: invNum,
      product_id: primaryProduct.product_id,
      product_name: cart.length > 1 ? `${primaryProduct.product_name} + ${cart.length - 1} items` : primaryProduct.product_name,
      company: primaryProduct.company,
      customer_name: customerName.trim() || undefined,
      phone_number: phoneNumber.trim() || undefined,
      quantity: cart.reduce((sum, i) => sum + i.quantity, 0),
      price: primaryProduct.price,
      total: grandTotal,
      amount_paid: amountPaid,
      due_amount: dueAmount,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      items: cart.map(i => ({
        product_id: i.product_id,
        product_name: i.product_name,
        company: i.company,
        quantity: i.quantity,
        price: i.price,
        total: i.total,
      })),
      sale_date: new Date().toISOString(),
    };

    addSaleMutation.mutate(salePayload, {
      onSuccess: (savedSale) => {
        setCompletedSale(savedSale as Sale);
        setShowCheckoutModal(false);
        setShowReceiptDrawer(true);
        clearCart();
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-indigo-600" />
            POS Terminal & Checkout
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Rapid in-device point-of-sale terminal with instant thermal receipt & auto-Khata credit routing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-slate-100 text-slate-700 font-mono text-xs py-1">
            {products.length} Products Loaded
          </Badge>
          {cart.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearCart} 
              className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 h-8 gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Reset Cart
            </Button>
          )}
        </div>
      </div>

      {/* Main POS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Product Catalog Grid */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Search & Category Pills */}
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search products by name, formula, or company..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-11 text-xs sm:text-sm bg-slate-50/50"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 text-xs",
                    selectedCategory === cat 
                      ? "bg-slate-900 text-white shadow-xs" 
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map(p => {
              const inCart = cart.find(item => item.product_id === p.id);
              const isOutOfStock = p.quantity <= 0;

              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={isOutOfStock}
                  className={cn(
                    "text-left p-3 rounded-xl border bg-white shadow-xs transition-all relative flex flex-col justify-between group active:scale-[0.98] min-h-[120px]",
                    isOutOfStock 
                      ? "opacity-50 cursor-not-allowed border-slate-200 bg-slate-50" 
                      : inCart 
                        ? "border-indigo-400 ring-2 ring-indigo-500/10 shadow-sm" 
                        : "border-slate-200/90 hover:border-indigo-300 hover:shadow-sm"
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 truncate max-w-[80px]">
                        {p.company || 'Standard'}
                      </span>
                      <Badge 
                        variant={p.quantity < 10 ? "destructive" : "secondary"} 
                        className="text-[9px] px-1 py-0 h-4 font-mono shrink-0"
                      >
                        {p.quantity} left
                      </Badge>
                    </div>
                    <h4 className="font-semibold text-xs sm:text-sm text-slate-900 line-clamp-2 leading-snug">
                      {p.name}
                    </h4>
                    {p.formula && (
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{p.formula}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                    <span className="font-mono font-bold text-xs sm:text-sm text-indigo-700">
                      PKR {p.price.toFixed(2)}
                    </span>
                    {inCart && (
                      <span className="h-5 px-1.5 bg-indigo-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                        {inCart.quantity} in cart
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-medium">No products match your search.</p>
            </div>
          )}
        </div>

        {/* Right POS Cart & Checkout Terminal */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-md p-4 space-y-4 sticky top-20">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Current Order</h3>
                  <p className="text-[11px] text-slate-400">{cart.length} distinct items</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                {cart.reduce((sum, i) => sum + i.quantity, 0)} Units
              </span>
            </div>

            {/* Cart Items List */}
            <div className="max-h-[240px] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
              {cart.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-medium">Cart is empty</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Click products from the catalog to add</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.product_id} className="pt-2 first:pt-0 flex items-center justify-between text-xs gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">{item.product_name}</p>
                      <p className="font-mono text-[11px] text-slate-400">
                        PKR {item.price.toFixed(2)} / unit
                      </p>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1.5 shrink-0 bg-slate-100 p-1 rounded-lg">
                      <button 
                        onClick={() => updateCartQuantity(item.product_id, -1)}
                        className="h-6 w-6 rounded bg-white text-slate-700 shadow-xs flex items-center justify-center hover:bg-slate-50 transition"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="font-mono font-bold text-xs w-5 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateCartQuantity(item.product_id, 1)}
                        className="h-6 w-6 rounded bg-white text-slate-700 shadow-xs flex items-center justify-center hover:bg-slate-50 transition"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="text-right shrink-0 min-w-[65px]">
                      <p className="font-mono font-bold text-slate-900">PKR {item.total.toFixed(2)}</p>
                      <button 
                        onClick={() => removeFromCart(item.product_id)} 
                        className="text-[10px] text-rose-500 hover:underline"
                      >
                        remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Discount Adjustment */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Discount (PKR):</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={discountInput}
                  onChange={e => setDiscountInput(e.target.value)}
                  className="w-20 h-7 text-xs text-right font-mono"
                />
              </div>
            </div>

            {/* Subtotal & Total Bill Amount Preview */}
            <div className="space-y-1 pt-2 border-t border-slate-100 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal ({cart.length} items):</span>
                <span className="font-mono font-medium">PKR {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Total Bill Amount:</span>
                <span className="font-mono text-indigo-700">PKR {grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Open Dedicated Checkout Modal Button */}
            <Button
              type="button"
              onClick={handleOpenCheckoutModal}
              disabled={cart.length === 0 || addSaleMutation.isPending}
              className="w-full h-12 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md gap-2"
            >
              <Calculator className="h-4 w-4" />
              Proceed to Payment & Checkout
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          CHECKOUT & PAYMENT RECORDING MODAL
          Captures Total Bill Amount, Amount Paid, Remaining Balance, and Customer Info.
          Auto-routes to Khata Ledger if Remaining Balance > 0.
         ========================================================================= */}
      <Dialog open={showCheckoutModal} onOpenChange={setShowCheckoutModal}>
        <DialogContent className="sm:max-w-[540px] max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-white text-slate-900">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-indigo-600" />
                Record Sale & Payment
              </DialogTitle>
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 font-mono text-xs">
                {cart.reduce((sum, i) => sum + i.quantity, 0)} Items
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Verify bill payment details. Credit balances automatically sync to Customer Khata.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmSale} className="space-y-4 py-2">
            {/* 1. Total Bill Amount Banner */}
            <div className="p-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-300 uppercase tracking-wider">Total Bill Amount</p>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-white mt-0.5">
                  PKR {grandTotal.toFixed(2)}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400">Subtotal: PKR {subtotal.toFixed(2)}</p>
                {discount > 0 && <p className="text-[10px] text-emerald-400 font-mono font-bold">- PKR {discount.toFixed(2)} discount</p>}
              </div>
            </div>

            {/* 2. Payment Method Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Payment Mode</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('cash');
                    setAmountPaidInput(grandTotal.toString());
                  }}
                  className={cn(
                    "py-2.5 px-3 rounded-xl border text-xs font-medium text-center transition flex flex-col items-center gap-1",
                    paymentMethod === 'cash' 
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold ring-2 ring-emerald-500/10" 
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Banknote className="h-4 w-4" />
                  Cash (Instant)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('card');
                    setAmountPaidInput(grandTotal.toString());
                  }}
                  className={cn(
                    "py-2.5 px-3 rounded-xl border text-xs font-medium text-center transition flex flex-col items-center gap-1",
                    paymentMethod === 'card' 
                      ? "bg-indigo-50 border-indigo-300 text-indigo-800 font-bold ring-2 ring-indigo-500/10" 
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <CreditCard className="h-4 w-4" />
                  Card / Digital
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('credit');
                    setAmountPaidInput("0");
                  }}
                  className={cn(
                    "py-2.5 px-3 rounded-xl border text-xs font-medium text-center transition flex flex-col items-center gap-1",
                    paymentMethod === 'credit' 
                      ? "bg-rose-50 border-rose-300 text-rose-800 font-bold ring-2 ring-rose-500/10" 
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Receipt className="h-4 w-4" />
                  Khata (Credit)
                </button>
              </div>
            </div>

            {/* 3. Amount Paid & Quick Tender Buttons */}
            <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <Label htmlFor="checkout-amount-paid" className="text-xs font-semibold text-slate-700">
                  Amount Received / Paid (PKR) *
                </Label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {amountPaid >= grandTotal ? 'Exact or Overpaid' : 'Partial / Underpaid'}
                </span>
              </div>

              <Input
                id="checkout-amount-paid"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amountPaidInput}
                onChange={e => setAmountPaidInput(e.target.value)}
                placeholder="0.00"
                className="h-11 text-lg font-mono font-bold bg-white text-slate-900 border-slate-300 focus:border-indigo-500"
                required
              />

              {/* Quick Tender Currency Chips */}
              <div className="flex items-center gap-1.5 pt-1 overflow-x-auto text-xs">
                <button
                  type="button"
                  onClick={() => setAmountPaidInput(grandTotal.toString())}
                  className="px-2.5 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-100 font-mono font-medium text-slate-700 text-[11px]"
                >
                  Exact (PKR {grandTotal.toFixed(0)})
                </button>
                <button
                  type="button"
                  onClick={() => setAmountPaidInput((Math.ceil(grandTotal / 100) * 100).toString())}
                  className="px-2.5 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-100 font-mono font-medium text-slate-700 text-[11px]"
                >
                  Round 100
                </button>
                <button
                  type="button"
                  onClick={() => setAmountPaidInput("500")}
                  className="px-2.5 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-100 font-mono font-medium text-slate-700 text-[11px]"
                >
                  PKR 500
                </button>
                <button
                  type="button"
                  onClick={() => setAmountPaidInput("1000")}
                  className="px-2.5 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-100 font-mono font-medium text-slate-700 text-[11px]"
                >
                  PKR 1,000
                </button>
                <button
                  type="button"
                  onClick={() => setAmountPaidInput("5000")}
                  className="px-2.5 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-100 font-mono font-medium text-slate-700 text-[11px]"
                >
                  PKR 5,000
                </button>
              </div>
            </div>

            {/* 4. Real-time Calculation / Remaining Balance / Change */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              {dueAmount > 0 ? (
                <div className="col-span-2 p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-rose-900 font-bold">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                      Remaining Balance (Credit / Udhaar):
                    </span>
                    <span className="font-mono text-base text-rose-700">PKR {dueAmount.toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-rose-800">
                    ℹ️ This balance will automatically be routed and appended to the customer's Khata ledger profile upon confirmation.
                  </p>
                </div>
              ) : (
                <div className="col-span-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Bill Status: Paid in Full
                  </span>
                  {changeToReturn > 0 && (
                    <span className="font-mono font-bold text-emerald-700">
                      Change to Return: PKR {changeToReturn.toFixed(2)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 5. Customer Details (Auto-populate from Khata or New Entry) */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-indigo-600" />
                  Customer Details {dueAmount > 0 && <span className="text-rose-600 font-bold">* (Required for Khata)</span>}
                </Label>
                {khataCustomers.length > 0 && (
                  <span className="text-[11px] text-slate-400">
                    {khataCustomers.length} registered accounts
                  </span>
                )}
              </div>

              {/* Quick Select from existing Khata customers */}
              {khataCustomers.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                  <span className="text-slate-400 text-[10px] shrink-0">Quick Khata:</span>
                  {khataCustomers.slice(0, 4).map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectExistingCustomer(c.name, c.phone)}
                      className={cn(
                        "px-2 py-0.5 rounded-full border text-[11px] font-medium shrink-0 transition",
                        customerName === c.name 
                          ? "bg-indigo-600 text-white border-indigo-600" 
                          : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                      )}
                    >
                      {c.name} {c.total_due > 0 && `(Due: ${c.total_due.toFixed(0)})`}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="checkout-cust-name" className="text-[11px] text-slate-500">Customer Name</Label>
                  <Input
                    id="checkout-cust-name"
                    placeholder={dueAmount > 0 ? "Enter customer name (Mandatory)" : "Walk-in customer"}
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className={cn(
                      "h-9 text-xs mt-0.5",
                      dueAmount > 0 && !customerName.trim() && "border-rose-400 focus:ring-rose-400"
                    )}
                    required={dueAmount > 0}
                  />
                </div>
                <div>
                  <Label htmlFor="checkout-cust-phone" className="text-[11px] text-slate-500">Phone Number (Optional)</Label>
                  <Input
                    id="checkout-cust-phone"
                    placeholder="0300-1234567"
                    type="tel"
                    inputMode="tel"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    className="h-9 text-xs mt-0.5"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <DialogFooter className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCheckoutModal(false)}
                className="h-11 text-xs flex-1"
              >
                Back to Cart
              </Button>
              <Button
                type="submit"
                disabled={addSaleMutation.isPending || (dueAmount > 0 && !customerName.trim())}
                className="h-11 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex-1 shadow-md gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm & Print Thermal Receipt
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Thermal Invoice & Receipt Drawer */}
      <InvoiceReceiptDrawer 
        open={showReceiptDrawer}
        onOpenChange={setShowReceiptDrawer}
        sale={completedSale}
      />
    </div>
  );
};

export default PosTerminal;

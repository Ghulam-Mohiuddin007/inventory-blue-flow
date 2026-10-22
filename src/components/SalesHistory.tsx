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
import { Input } from "@/components/ui/input";
import { 
  CalendarIcon, 
  TrendingUp, 
  Download, 
  X, 
  Search, 
  Phone, 
  User, 
  Clock, 
  LayoutList, 
  LayoutGrid,
  Receipt,
  FileText
} from "lucide-react";
import { Sale } from "@/services/deviceStorage";
import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SalesHistoryProps {
  sales: Sale[];
  onViewReceipt?: (sale: Sale) => void;
}

export const SalesHistory = ({ sales, onViewReceipt }: SalesHistoryProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'auto' | 'cards' | 'table'>('auto');

  const exportToCSV = () => {
    const csvData = sales.map(sale => ({
      'Invoice No': sale.invoice_number,
      'Product Name': sale.product_name,
      'Company': sale.company || '',
      'Customer Name': sale.customer_name || '',
      'Phone Number': sale.phone_number || '',
      'Price (PKR)': sale.price.toFixed(2),
      'Units Sold': sale.quantity,
      'Total (PKR)': sale.total.toFixed(2),
      'Amount Paid': sale.amount_paid.toFixed(2),
      'Due Amount': sale.due_amount.toFixed(2),
      'Method': sale.payment_method.toUpperCase(),
      'Status': sale.payment_status.toUpperCase(),
      'Date': formatDate(new Date(sale.sale_date))
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        headers.map(header => `"${row[header as keyof typeof row]}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sales-history-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = !searchTerm || 
      sale.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.company && sale.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sale.invoice_number && sale.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sale.customer_name && sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sale.phone_number && sale.phone_number.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDate = !selectedDate || (() => {
      const saleDate = new Date(sale.sale_date);
      const filterDate = new Date(selectedDate);
      return saleDate.toDateString() === filterDate.toDateString();
    })();
    
    return matchesSearch && matchesDate;
  });

  const sortedSales = [...filteredSales].sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (sales.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <TrendingUp className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">No Sales Recorded</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Start recording transactions to track sales in your device memory.
        </p>
      </div>
    );
  }

  const totalFilteredSales = filteredSales.reduce((sum, s) => sum + s.total, 0);
  const avgSaleValue = filteredSales.length > 0 ? (totalFilteredSales / filteredSales.length).toFixed(2) : '0.00';

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice #, product, customer name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 text-xs sm:text-sm"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm("")}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        
        {/* Date Filter & Export */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "flex-1 sm:w-[190px] justify-start text-left font-normal text-xs sm:text-sm h-10",
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
              onClick={() => setSelectedDate(undefined)}
              className="h-10 px-2 text-xs"
              title="Clear date filter"
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          <Button
            onClick={exportToCSV}
            variant="outline"
            className="flex items-center gap-1.5 h-10 px-3 text-xs sm:text-sm shrink-0"
            disabled={filteredSales.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            <span>CSV</span>
          </Button>

          {/* View mode toggle */}
          <div className="hidden sm:flex border rounded-lg p-0.5 bg-slate-50">
            <button
              onClick={() => setViewMode('table')}
              className={cn("p-1.5 rounded text-xs transition", (viewMode === 'table' || viewMode === 'auto') ? "bg-white shadow-xs text-indigo-600" : "text-slate-500")}
              title="Table view"
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={cn("p-1.5 rounded text-xs transition", viewMode === 'cards' ? "bg-white shadow-xs text-indigo-600" : "text-slate-500")}
              title="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 sm:p-4 bg-emerald-50/70 border border-emerald-100 rounded-xl">
          <p className="text-[11px] sm:text-xs font-semibold text-emerald-800 uppercase tracking-wider">Total Sales</p>
          <p className="text-base sm:text-xl font-bold text-emerald-700 font-mono mt-0.5">
            PKR {totalFilteredSales.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
        
        <div className="p-3 sm:p-4 bg-blue-50/70 border border-blue-100 rounded-xl">
          <p className="text-[11px] sm:text-xs font-semibold text-blue-800 uppercase tracking-wider">Orders</p>
          <p className="text-base sm:text-xl font-bold text-blue-700 font-mono mt-0.5">{filteredSales.length}</p>
        </div>
        
        <div className="p-3 sm:p-4 bg-purple-50/70 border border-purple-100 rounded-xl">
          <p className="text-[11px] sm:text-xs font-semibold text-purple-800 uppercase tracking-wider">Avg. Ticket</p>
          <p className="text-base sm:text-xl font-bold text-purple-700 font-mono mt-0.5">
            PKR {avgSaleValue}
          </p>
        </div>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className={cn("space-y-3", viewMode === 'table' ? "hidden" : viewMode === 'cards' ? "block" : "block md:hidden")}>
        {sortedSales.map((sale) => {
          return (
            <div 
              key={sale.id}
              className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-xs hover:shadow-sm transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-mono text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                      {sale.invoice_number}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[10px] uppercase font-bold",
                        sale.due_amount > 0 
                          ? "bg-rose-50 text-rose-700 border-rose-200" 
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      )}
                    >
                      {sale.due_amount > 0 ? "Khata Due" : "Paid"}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-sm text-slate-900 truncate">{sale.product_name}</h4>
                  <p className="text-xs text-slate-500 font-medium">{sale.company}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-sm sm:text-base text-emerald-600 font-mono">
                    PKR {sale.total.toFixed(2)}
                  </span>
                  <p className="text-[10px] text-slate-400 capitalize">{sale.payment_method} payment</p>
                </div>
              </div>

              {(sale.customer_name || sale.phone_number) && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {sale.customer_name && (
                    <span className="flex items-center gap-1 font-medium">
                      <User className="h-3 w-3 text-slate-400" />
                      {sale.customer_name}
                    </span>
                  )}
                  {sale.phone_number && (
                    <span className="flex items-center gap-1 font-mono text-slate-500">
                      <Phone className="h-3 w-3 text-slate-400" />
                      {sale.phone_number}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(new Date(sale.sale_date))}
                </span>
                
                {onViewReceipt && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewReceipt(sale)}
                    className="h-7 text-xs px-2 gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  >
                    <Receipt className="h-3 w-3" />
                    Receipt
                  </Button>
                )}
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
                <TableHead className="font-semibold text-xs">Invoice #</TableHead>
                <TableHead className="font-semibold text-xs">Date & Time</TableHead>
                <TableHead className="font-semibold text-xs">Product / Items</TableHead>
                <TableHead className="font-semibold text-xs">Customer</TableHead>
                <TableHead className="text-right font-semibold text-xs">Quantity</TableHead>
                <TableHead className="text-right font-semibold text-xs">Total Amount</TableHead>
                <TableHead className="font-semibold text-xs">Payment</TableHead>
                <TableHead className="text-right font-semibold text-xs">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSales.map((sale) => (
                <TableRow key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                  <TableCell className="font-mono text-xs font-bold text-slate-700">
                    {sale.invoice_number}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">
                    {formatDate(new Date(sale.sale_date))}
                  </TableCell>
                  <TableCell className="font-medium text-xs sm:text-sm text-slate-900">
                    {sale.product_name}
                  </TableCell>
                  <TableCell className="text-xs text-slate-700">
                    {sale.customer_name || <span className="text-slate-400 italic">Walk-in</span>}
                    {sale.phone_number && <p className="text-[10px] font-mono text-slate-400">{sale.phone_number}</p>}
                  </TableCell>   
                  <TableCell className="text-right font-mono text-xs sm:text-sm font-semibold">{sale.quantity}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-emerald-600 text-xs sm:text-sm">
                    PKR {sale.total.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[10px] uppercase font-bold",
                        sale.due_amount > 0 
                          ? "bg-rose-50 text-rose-700 border-rose-200" 
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      )}
                    >
                      {sale.due_amount > 0 ? "Khata Due" : "Paid"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {onViewReceipt && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onViewReceipt(sale)}
                        className="h-8 text-xs px-2 gap-1 text-indigo-600 hover:bg-indigo-50"
                        title="View invoice receipt"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Invoice
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
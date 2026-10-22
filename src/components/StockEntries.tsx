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
import { CalendarIcon, Plus, X, Search, History, Package, Clock, LayoutList, LayoutGrid } from "lucide-react";
import { LegacyStockEntry } from "@/pages/Index";
import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface StockEntriesProps {
  entries: LegacyStockEntry[];
}

export const StockEntries = ({ entries }: StockEntriesProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'auto' | 'cards' | 'table'>('auto');

  // Filter entries by search term and date
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = !searchTerm || 
      entry.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.formula.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = !selectedDate || (() => {
      const entryDate = new Date(entry.date);
      const filterDate = new Date(selectedDate);
      return entryDate.toDateString() === filterDate.toDateString();
    })();
    
    return matchesSearch && matchesDate;
  });

  const sortedEntries = [...filteredEntries].sort((a, b) => b.date.getTime() - a.date.getTime());

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEntryTypeVariant = (type: 'new' | 'existing') => {
    return type === 'new' ? 'default' : 'secondary';
  };

  const getEntryTypeIcon = (type: 'new' | 'existing') => {
    return type === 'new' ? Package : Plus;
  };

  const clearDateFilter = () => {
    setSelectedDate(undefined);
  };

  const clearSearchFilter = () => {
    setSearchTerm("");
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <History className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">No Stock Entries</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Stock entry history will appear here when you add products or replenish stock.
        </p>
      </div>
    );
  }

  const newProductsCount = filteredEntries.filter(e => e.type === 'new').length;
  const updatesCount = filteredEntries.filter(e => e.type === 'existing').length;

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by product name, company, or formula..."
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
        
        {/* Date Filter & View mode */}
        <div className="flex items-center gap-2">
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
              onClick={clearDateFilter}
              className="h-10 px-2 text-xs"
              title="Clear date filter"
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          {/* View toggle */}
          <div className="hidden sm:flex border rounded-lg p-0.5 bg-slate-50">
            <button
              onClick={() => setViewMode('table')}
              className={cn("p-1.5 rounded text-xs transition", (viewMode === 'table' || viewMode === 'auto') ? "bg-white shadow-xs text-purple-600" : "text-slate-500")}
              title="Table view"
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={cn("p-1.5 rounded text-xs transition", viewMode === 'cards' ? "bg-white shadow-xs text-purple-600" : "text-slate-500")}
              title="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 sm:p-4 bg-purple-50/70 border border-purple-100 rounded-xl">
          <p className="text-[11px] sm:text-xs font-medium text-purple-800">Total Entries</p>
          <p className="text-base sm:text-xl font-bold text-purple-700 font-mono mt-0.5">{filteredEntries.length}</p>
        </div>
        
        <div className="p-3 sm:p-4 bg-blue-50/70 border border-blue-100 rounded-xl">
          <p className="text-[11px] sm:text-xs font-medium text-blue-800">New Products</p>
          <p className="text-base sm:text-xl font-bold text-blue-700 font-mono mt-0.5">{newProductsCount}</p>
        </div>
        
        <div className="p-3 sm:p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl">
          <p className="text-[11px] sm:text-xs font-medium text-indigo-800">Stock Updates</p>
          <p className="text-base sm:text-xl font-bold text-indigo-700 font-mono mt-0.5">{updatesCount}</p>
        </div>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className={cn("space-y-3", viewMode === 'table' ? "hidden" : viewMode === 'cards' ? "block" : "block md:hidden")}>
        {sortedEntries.map((entry) => {
          const EntryIcon = getEntryTypeIcon(entry.type);

          return (
            <div 
              key={entry.id}
              className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-xs hover:shadow-sm transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-sm text-slate-900 truncate">{entry.productName}</h4>
                  <p className="text-xs text-slate-500 font-medium">{entry.company}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{entry.formula}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-sm sm:text-base text-purple-700 font-mono">
                    +{entry.quantityChange}
                  </span>
                  <div className="mt-0.5">
                    <Badge variant={getEntryTypeVariant(entry.type)} className="text-[10px] gap-1">
                      <EntryIcon className="h-3 w-3" />
                      {entry.type === 'new' ? 'New' : 'Added'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(entry.date)}
                </span>
                <span className="text-slate-600 font-medium capitalize">
                  {entry.type === 'new' ? 'First stock entry' : 'Stock replenishment'}
                </span>
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
                <TableHead className="font-semibold text-xs">Date & Time</TableHead>
                <TableHead className="font-semibold text-xs">Product Name</TableHead>
                <TableHead className="font-semibold text-xs">Company</TableHead>
                <TableHead className="font-semibold text-xs">Formula</TableHead>
                <TableHead className="text-right font-semibold text-xs">Quantity Added</TableHead>
                <TableHead className="font-semibold text-xs">Entry Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedEntries.map((entry) => {
                const EntryIcon = getEntryTypeIcon(entry.type);
                return (
                  <TableRow key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                    <TableCell className="font-mono text-xs text-slate-500">
                      {formatDate(entry.date)}
                    </TableCell>
                    <TableCell className="font-medium text-xs sm:text-sm text-slate-900">{entry.productName}</TableCell>
                    <TableCell className="text-xs text-slate-600">{entry.company}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{entry.formula}</TableCell>
                    <TableCell className="text-right font-mono text-xs sm:text-sm font-semibold text-purple-700">
                      +{entry.quantityChange}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getEntryTypeVariant(entry.type)} className="flex items-center gap-1 w-fit text-[11px]">
                        <EntryIcon className="h-3 w-3" />
                        {entry.type === 'new' ? 'New Product' : 'Stock Update'}
                      </Badge>
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
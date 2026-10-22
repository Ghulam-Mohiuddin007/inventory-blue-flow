import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  deviceStorage, 
  type Product, 
  type Sale, 
  type StockEntry,
  type KhataCustomer,
  type KhataTransaction
} from '@/services/deviceStorage';

export type { Product, Sale, StockEntry, KhataCustomer, KhataTransaction };

// Products queries and mutations (In-Device IndexedDB)
export const useProducts = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      return await deviceStorage.getProducts();
    },
    enabled: !!user,
  });
};

export const useAddProduct = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
      if (!user) throw new Error('User not authenticated on this device');
      
      const newProduct = await deviceStorage.addProduct({
        ...product,
        user_id: user.id
      });
      return newProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: "Product Saved",
        description: "Product committed to local IndexedDB storage",
      });
    },
    onError: (error: Error) => {
      console.error('Error adding product to device storage:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add product",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateProductQuantity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      return await deviceStorage.updateProductQuantity(id, quantity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update product quantity",
        variant: "destructive",
      });
    },
  });
};

// Sales queries and mutations (In-Device IndexedDB)
export const useSales = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      return await deviceStorage.getSales();
    },
    enabled: !!user,
  });
};

export const useAddSale = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (sale: Omit<Sale, 'id' | 'created_at' | 'user_id'>) => {
      if (!user) throw new Error('User not authenticated on this device');
      
      const newSale = await deviceStorage.addSale({
        ...sale,
        user_id: user.id
      });
      return newSale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['khata_customers'] });
      toast({
        title: "Sale Recorded",
        description: "Sale saved and stock deducted in local IndexedDB",
      });
    },
    onError: (error: Error) => {
      console.error('Error adding sale:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to record sale",
        variant: "destructive",
      });
    },
  });
};

// Stock entries queries and mutations (In-Device IndexedDB)
export const useStockEntries = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['stock_entries'],
    queryFn: async () => {
      return await deviceStorage.getStockEntries();
    },
    enabled: !!user,
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await deviceStorage.deleteProduct(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: "Product Deleted",
        description: "Product removed from local IndexedDB",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
    },
  });
};

export const useAddStockEntry = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (entry: Omit<StockEntry, 'id' | 'created_at' | 'user_id'>) => {
      if (!user) throw new Error('User not authenticated on this device');
      
      const newEntry = await deviceStorage.addStockEntry({
        ...entry,
        user_id: user.id
      });
      return newEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock_entries'] });
      toast({
        title: "Stock Logged",
        description: "Stock entry committed to local IndexedDB",
      });
    },
    onError: (error: Error) => {
      console.error('Error adding stock entry:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to log stock entry",
        variant: "destructive",
      });
    },
  });
};

// Customer Khata queries and mutations
export const useKhataCustomers = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['khata_customers'],
    queryFn: async () => {
      return await deviceStorage.getKhataCustomers();
    },
    enabled: !!user,
  });
};

export const useRecordKhataPayment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ customerId, amount, notes }: { customerId: string; amount: number; notes?: string }) => {
      return await deviceStorage.recordKhataPayment(customerId, amount, notes);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['khata_customers'] });
      toast({
        title: "Payment Received",
        description: `Payment recorded. Remaining balance: PKR ${data.total_due.toFixed(2)}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record Khata payment",
        variant: "destructive",
      });
    },
  });
};
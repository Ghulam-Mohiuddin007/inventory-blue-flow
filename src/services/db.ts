import Dexie, { type Table } from 'dexie';
import { hashPassword } from './crypto';

export type UserRole = 'admin' | 'shopkeeper' | 'staff';

export interface DeviceUserRecord {
  id: string;
  email: string;
  name: string;
  storeName: string;
  role: UserRole;
  phone?: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceSessionRecord {
  token: string;
  userId: string;
  user: {
    id: string;
    email: string;
    name: string;
    storeName: string;
    role: UserRole;
  };
  createdAt: string;
  expiresAt?: string;
}

export interface ProductRecord {
  id: string;
  name: string;
  company?: string;
  formula?: string;
  quantity: number;
  price: number;
  cost_price?: number;
  category?: string;
  barcode?: string;
  min_stock_level?: number;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SaleItemRecord {
  product_id: string;
  product_name: string;
  company?: string;
  quantity: number;
  price: number;
  total: number;
}

export interface SaleRecord {
  id: string;
  invoice_number: string;
  product_id?: string;
  product_name: string;
  company?: string;
  customer_name?: string;
  phone_number?: string;
  quantity: number;
  price: number;
  total: number;
  amount_paid: number;
  due_amount: number;
  payment_method: 'cash' | 'credit' | 'card' | 'online';
  payment_status: 'paid' | 'due' | 'partial';
  items?: SaleItemRecord[];
  user_id?: string;
  sale_date: string;
  created_at: string;
}

export interface StockEntryRecord {
  id: string;
  product_id?: string;
  product_name: string;
  company?: string;
  formula?: string;
  quantity: number;
  entry_type: 'new' | 'existing';
  user_id?: string;
  entry_date: string;
  created_at: string;
  customer_name?: string;
  phone_number?: string;
}

export interface KhataTransactionRecord {
  id: string;
  date: string;
  type: 'credit' | 'payment';
  amount: number;
  description: string;
  invoice_number?: string;
}

export interface KhataCustomerRecord {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  total_due: number;
  total_paid: number;
  last_activity: string;
  created_at: string;
  transactions: KhataTransactionRecord[];
}

export interface SettingRecord {
  key: string;
  value: unknown;
  updatedAt: string;
}

// Clean slate initial state: Zero dummy products, sales, khata, or stock entries
const DEFAULT_PRODUCTS: ProductRecord[] = [];
const DEFAULT_SALES: SaleRecord[] = [];
const DEFAULT_KHATA: KhataCustomerRecord[] = [];
const DEFAULT_STOCK_ENTRIES: StockEntryRecord[] = [];

export class InventoryAppDB extends Dexie {
  users!: Table<DeviceUserRecord, string>;
  sessions!: Table<DeviceSessionRecord, string>;
  products!: Table<ProductRecord, string>;
  sales!: Table<SaleRecord, string>;
  stock_entries!: Table<StockEntryRecord, string>;
  khata_customers!: Table<KhataCustomerRecord, string>;
  settings!: Table<SettingRecord, string>;

  constructor() {
    super('InventoryBlueFlowDB');

    // Define schema and primary keys / indexes
    this.version(1).stores({
      users: 'id, &email, role, storeName, createdAt',
      sessions: 'token, userId, createdAt',
      products: 'id, &name, category, company, barcode, quantity, price, created_at, updated_at',
      sales: 'id, &invoice_number, customer_name, payment_method, payment_status, sale_date, created_at',
      stock_entries: 'id, product_name, entry_type, entry_date, created_at',
      khata_customers: 'id, &name, phone, total_due, last_activity, created_at',
      settings: 'key, updatedAt'
    });
  }

  /**
   * Initializes the IndexedDB instance, seeds default credentials and migrated data
   */
  async initializeDefaults(): Promise<void> {
    try {
      // 1. Initialize Default Users if none exist
      const userCount = await this.users.count();
      if (userCount === 0) {
        // Hash default admin password with Web Crypto PBKDF2
        const adminHashResult = await hashPassword('admin123');
        const adminUser: DeviceUserRecord = {
          id: 'usr_admin_default',
          email: 'admin@inventory.local',
          name: 'Store Owner (Admin)',
          storeName: 'Al-Madina Medicos & Mart',
          role: 'admin',
          phone: '0300-8889900',
          passwordHash: adminHashResult.hash,
          passwordSalt: adminHashResult.salt,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Also create a staff/cashier user with role 'staff'
        const staffHashResult = await hashPassword('staff123');
        const staffUser: DeviceUserRecord = {
          id: 'usr_staff_default',
          email: 'cashier@inventory.local',
          name: 'POS Cashier (Staff)',
          storeName: 'Al-Madina Medicos & Mart',
          role: 'staff',
          phone: '0311-7776655',
          passwordHash: staffHashResult.hash,
          passwordSalt: staffHashResult.salt,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await this.users.bulkAdd([adminUser, staffUser]);
      }

      // 2. Automatically purge any legacy dummy data records
      const DUMMY_PURGED_FLAG = 'inventory_dummy_data_purged_v5';
      if (typeof window !== 'undefined' && !localStorage.getItem(DUMMY_PURGED_FLAG)) {
        await this.transaction('rw', [this.products, this.sales, this.khata_customers, this.stock_entries], async () => {
          const dummyProdIds = ['prod-1', 'prod-2', 'prod-3', 'prod-4', 'prod-5', 'prod-6'];
          await this.products.where('id').anyOf(dummyProdIds).delete();

          const dummySaleIds = ['sale-1', 'sale-2'];
          await this.sales.where('id').anyOf(dummySaleIds).delete();

          const dummyKhataIds = ['kht-1', 'kht-2'];
          await this.khata_customers.where('id').anyOf(dummyKhataIds).delete();

          const dummyStockIds = ['stock-1', 'stock-2'];
          await this.stock_entries.where('id').anyOf(dummyStockIds).delete();
        });

        localStorage.removeItem('inventory_device_products');
        localStorage.removeItem('inventory_device_sales');
        localStorage.removeItem('inventory_device_khata');
        localStorage.removeItem('inventory_device_stock_entries');
        localStorage.setItem(DUMMY_PURGED_FLAG, 'true');
      }
    } catch (err) {
      console.error('Error during IndexedDB initialization:', err);
    }
  }
}

// Singleton database instance
export const db = new InventoryAppDB();

// Automatically trigger initialization when in browser environment
if (typeof window !== 'undefined') {
  db.initializeDefaults().catch(err => {
    console.warn('Could not auto-initialize Dexie IndexedDB:', err);
  });
}

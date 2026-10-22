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

// Sample initial products for offline shopkeeper setup
const DEFAULT_PRODUCTS: ProductRecord[] = [
  {
    id: 'prod-1',
    name: 'Panadol Extra 500mg',
    company: 'GSK Consumer Healthcare',
    formula: 'Paracetamol + Caffeine',
    quantity: 140,
    price: 35.00,
    cost_price: 28.00,
    category: 'Analgesics',
    min_stock_level: 20,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'prod-2',
    name: 'Augmentin 625mg Tab',
    company: 'GlaxoSmithKline',
    formula: 'Amoxicillin + Clavulanic Acid',
    quantity: 45,
    price: 280.00,
    cost_price: 235.00,
    category: 'Antibiotics',
    min_stock_level: 15,
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'prod-3',
    name: 'Brufen 400mg Film-Coated',
    company: 'Abbott Laboratories',
    formula: 'Ibuprofen',
    quantity: 6,
    price: 55.00,
    cost_price: 42.00,
    category: 'NSAID / Pain Relief',
    min_stock_level: 15,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'prod-4',
    name: 'Disprin 300mg Soluble',
    company: 'Reckitt Benckiser',
    formula: 'Acetylsalicylic Acid',
    quantity: 65,
    price: 22.00,
    cost_price: 17.50,
    category: 'Analgesics',
    min_stock_level: 20,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'prod-5',
    name: 'Risek 20mg Capsule',
    company: 'Getz Pharma',
    formula: 'Omeprazole',
    quantity: 5,
    price: 195.00,
    cost_price: 160.00,
    category: 'Gastrointestinal',
    min_stock_level: 10,
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'prod-6',
    name: 'Arinac Forte Tablets',
    company: 'Abbott Laboratories',
    formula: 'Ibuprofen + Pseudoephedrine',
    quantity: 80,
    price: 85.00,
    cost_price: 68.00,
    category: 'Cold & Sinus',
    min_stock_level: 20,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

const DEFAULT_SALES: SaleRecord[] = [
  {
    id: 'sale-1',
    invoice_number: 'INV-1001',
    product_id: 'prod-1',
    product_name: 'Panadol Extra 500mg',
    company: 'GSK Consumer Healthcare',
    customer_name: 'Ahmed Khan',
    phone_number: '0300-1234567',
    quantity: 4,
    price: 35.00,
    total: 140.00,
    amount_paid: 140.00,
    due_amount: 0.00,
    payment_method: 'cash',
    payment_status: 'paid',
    items: [
      {
        product_id: 'prod-1',
        product_name: 'Panadol Extra 500mg',
        company: 'GSK Consumer Healthcare',
        quantity: 4,
        price: 35.00,
        total: 140.00
      }
    ],
    sale_date: new Date(Date.now() - 86400000 * 2).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'sale-2',
    invoice_number: 'INV-1002',
    product_id: 'prod-2',
    product_name: 'Augmentin 625mg Tab',
    company: 'GlaxoSmithKline',
    customer_name: 'Dr. Bilal Siddiqui',
    phone_number: '0321-9876543',
    quantity: 2,
    price: 280.00,
    total: 560.00,
    amount_paid: 200.00,
    due_amount: 360.00,
    payment_method: 'credit',
    payment_status: 'partial',
    items: [
      {
        product_id: 'prod-2',
        product_name: 'Augmentin 625mg Tab',
        company: 'GlaxoSmithKline',
        quantity: 2,
        price: 280.00,
        total: 560.00
      }
    ],
    sale_date: new Date(Date.now() - 86400000 * 1).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  }
];

const DEFAULT_KHATA: KhataCustomerRecord[] = [
  {
    id: 'kht-1',
    name: 'Dr. Bilal Siddiqui',
    phone: '0321-9876543',
    address: 'City Clinic, Suite #4',
    total_due: 360.00,
    total_paid: 200.00,
    last_activity: new Date(Date.now() - 86400000 * 1).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    transactions: [
      {
        id: 'tx-1',
        date: new Date(Date.now() - 86400000 * 1).toISOString(),
        type: 'credit',
        amount: 360.00,
        description: 'Remaining due from Invoice INV-1002 (Augmentin)',
        invoice_number: 'INV-1002',
      }
    ]
  },
  {
    id: 'kht-2',
    name: 'Haji Muhammad Aslam',
    phone: '0345-5551234',
    address: 'Shop 12, Main Bazaar',
    total_due: 1450.00,
    total_paid: 500.00,
    last_activity: new Date(Date.now() - 86400000 * 3).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
    transactions: [
      {
        id: 'tx-2',
        date: new Date(Date.now() - 86400000 * 7).toISOString(),
        type: 'credit',
        amount: 1950.00,
        description: 'Emergency supply order on credit',
        invoice_number: 'INV-0985',
      },
      {
        id: 'tx-3',
        date: new Date(Date.now() - 86400000 * 3).toISOString(),
        type: 'payment',
        amount: 500.00,
        description: 'Partial Cash Payment received',
      }
    ]
  }
];

const DEFAULT_STOCK_ENTRIES: StockEntryRecord[] = [
  {
    id: 'stock-1',
    product_id: 'prod-1',
    product_name: 'Panadol Extra 500mg',
    company: 'GSK Consumer Healthcare',
    formula: 'Paracetamol + Caffeine',
    quantity: 140,
    entry_type: 'new',
    entry_date: new Date(Date.now() - 86400000 * 5).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'stock-2',
    product_id: 'prod-2',
    product_name: 'Augmentin 625mg Tab',
    company: 'GlaxoSmithKline',
    formula: 'Amoxicillin + Clavulanic Acid',
    quantity: 45,
    entry_type: 'new',
    entry_date: new Date(Date.now() - 86400000 * 4).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  }
];

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

      // 2. Check if localStorage has existing items to migrate into IndexedDB
      const prodCount = await this.products.count();
      if (prodCount === 0) {
        let prodsToSeed: ProductRecord[] = DEFAULT_PRODUCTS;
        const legacyProds = localStorage.getItem('inventory_device_products');
        if (legacyProds) {
          try {
            const parsed = JSON.parse(legacyProds);
            if (Array.isArray(parsed) && parsed.length > 0) prodsToSeed = parsed;
          } catch {
            // fallback to default
          }
        }
        await this.products.bulkAdd(prodsToSeed);
      }

      const salesCount = await this.sales.count();
      if (salesCount === 0) {
        let salesToSeed: SaleRecord[] = DEFAULT_SALES;
        const legacySales = localStorage.getItem('inventory_device_sales');
        if (legacySales) {
          try {
            const parsed = JSON.parse(legacySales);
            if (Array.isArray(parsed) && parsed.length > 0) salesToSeed = parsed;
          } catch {
            // fallback to default
          }
        }
        await this.sales.bulkAdd(salesToSeed);
      }

      const khataCount = await this.khata_customers.count();
      if (khataCount === 0) {
        let khataToSeed: KhataCustomerRecord[] = DEFAULT_KHATA;
        const legacyKhata = localStorage.getItem('inventory_device_khata');
        if (legacyKhata) {
          try {
            const parsed = JSON.parse(legacyKhata);
            if (Array.isArray(parsed) && parsed.length > 0) khataToSeed = parsed;
          } catch {
            // fallback to default
          }
        }
        await this.khata_customers.bulkAdd(khataToSeed);
      }

      const stockCount = await this.stock_entries.count();
      if (stockCount === 0) {
        let stockToSeed: StockEntryRecord[] = DEFAULT_STOCK_ENTRIES;
        const legacyStock = localStorage.getItem('inventory_device_stock_entries');
        if (legacyStock) {
          try {
            const parsed = JSON.parse(legacyStock);
            if (Array.isArray(parsed) && parsed.length > 0) stockToSeed = parsed;
          } catch {
            // fallback to default
          }
        }
        await this.stock_entries.bulkAdd(stockToSeed);
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

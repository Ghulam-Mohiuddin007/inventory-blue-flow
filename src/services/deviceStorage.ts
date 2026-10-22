// Device Storage Service - In-Device IndexedDB Storage Engine (via Dexie.js)
// Operates 100% locally on client device with zero cloud databases.
// Passwords hashed using native Web Crypto PBKDF2 with 100,000 iterations and cryptographic salts.

import { 
  db, 
  type DeviceUserRecord, 
  type DeviceSessionRecord, 
  type ProductRecord, 
  type SaleRecord, 
  type SaleItemRecord, 
  type StockEntryRecord, 
  type KhataCustomerRecord, 
  type KhataTransactionRecord,
  type UserRole 
} from './db';
import { hashPassword, verifyPassword } from './crypto';

export type {
  DeviceUserRecord as DeviceUser,
  DeviceSessionRecord as DeviceSession,
  ProductRecord as Product,
  SaleRecord as Sale,
  SaleItemRecord as SaleItem,
  StockEntryRecord as StockEntry,
  KhataCustomerRecord as KhataCustomer,
  KhataTransactionRecord as KhataTransaction,
  UserRole
};

export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export function generateInvoiceNumber(): string {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `INV-${randomSuffix}`;
}

const SESSION_STORAGE_KEY = 'inventory_device_session';

class DeviceStorageEngine {
  private readyPromise: Promise<void> | null = null;

  constructor() {
    this.ensureInitialized();
  }

  public ensureInitialized(): Promise<void> {
    if (!this.readyPromise) {
      this.readyPromise = db.initializeDefaults().catch(err => {
        console.error('Dexie IndexedDB initialization error:', err);
      });
    }
    return this.readyPromise;
  }

  // --- Auth / User Operations (IndexedDB + Web Crypto) ---

  public async getUsers(): Promise<DeviceUserRecord[]> {
    await this.ensureInitialized();
    return db.users.toArray();
  }

  public async registerUser(
    email: string, 
    password: string, 
    name?: string, 
    storeName?: string,
    role: UserRole = 'shopkeeper'
  ): Promise<{ user: DeviceUserRecord | null; error: Error | null }> {
    await this.ensureInitialized();
    const cleanEmail = email.trim().toLowerCase();

    const existing = await db.users.where('email').equalsIgnoreCase(cleanEmail).first();
    if (existing) {
      return { user: null, error: new Error('Account already exists in local device database.') };
    }

    const hashResult = await hashPassword(password);
    const now = new Date().toISOString();

    const newUser: DeviceUserRecord = {
      id: generateId('usr'),
      email: cleanEmail,
      name: name || cleanEmail.split('@')[0],
      storeName: storeName || 'Enterprise Medicos & Mart',
      role,
      passwordHash: hashResult.hash,
      passwordSalt: hashResult.salt,
      createdAt: now,
      updatedAt: now,
    };

    await db.users.add(newUser);
    await this.createSession(newUser);

    return { user: newUser, error: null };
  }

  public async loginUser(email: string, password: string): Promise<{ user: DeviceUserRecord | null; error: Error | null }> {
    await this.ensureInitialized();
    const cleanEmail = email.trim().toLowerCase();

    const user = await db.users.where('email').equalsIgnoreCase(cleanEmail).first();
    if (!user) {
      return { user: null, error: new Error('User not found in device storage.') };
    }

    const isValid = await verifyPassword(password, user.passwordHash, user.passwordSalt);
    if (!isValid) {
      return { user: null, error: new Error('Invalid credentials.') };
    }

    await this.createSession(user);
    return { user, error: null };
  }

  public async createSession(user: DeviceUserRecord): Promise<DeviceSessionRecord> {
    const session: DeviceSessionRecord = {
      token: generateId('sess'),
      userId: user.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        storeName: user.storeName,
        role: user.role,
      },
      createdAt: new Date().toISOString(),
    };

    // Store in IndexedDB
    await db.sessions.put(session);

    // Also cache in localStorage for instant synchronous page hydration
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }

    return session;
  }

  public async getSession(): Promise<DeviceSessionRecord | null> {
    await this.ensureInitialized();
    // Try IndexedDB first
    const lastSession = await db.sessions.toCollection().last();
    if (lastSession) return lastSession;

    // Fallback to cached localStorage
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(SESSION_STORAGE_KEY);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  public getCachedSession(): DeviceSessionRecord | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const cached = localStorage.getItem(SESSION_STORAGE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  public async clearSession(): Promise<void> {
    await db.sessions.clear();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }

  // --- Products Operations (IndexedDB) ---

  public async getProducts(): Promise<ProductRecord[]> {
    await this.ensureInitialized();
    return db.products.reverse().sortBy('created_at');
  }

  public async addProduct(product: Omit<ProductRecord, 'id' | 'created_at' | 'updated_at'>): Promise<ProductRecord> {
    await this.ensureInitialized();
    const now = new Date().toISOString();
    const newProduct: ProductRecord = {
      ...product,
      id: generateId('prod'),
      created_at: now,
      updated_at: now,
    };
    await db.products.add(newProduct);
    return newProduct;
  }

  public async updateProductQuantity(id: string, quantity: number): Promise<ProductRecord> {
    await this.ensureInitialized();
    const product = await db.products.get(id);
    if (!product) {
      throw new Error(`Product ${id} not found in device database.`);
    }

    const updated = {
      ...product,
      quantity: Math.max(0, quantity),
      updated_at: new Date().toISOString(),
    };
    await db.products.put(updated);
    return updated;
  }

  public async deleteProduct(id: string): Promise<void> {
    await this.ensureInitialized();
    await db.products.delete(id);
  }

  // --- Sales Operations (IndexedDB) ---

  public async getSales(): Promise<SaleRecord[]> {
    await this.ensureInitialized();
    return db.sales.reverse().sortBy('created_at');
  }

  public async addSale(saleInput: Omit<SaleRecord, 'id' | 'created_at'> & { invoice_number?: string }): Promise<SaleRecord> {
    await this.ensureInitialized();
    const now = new Date().toISOString();
    const invNum = saleInput.invoice_number || generateInvoiceNumber();

    const newSale: SaleRecord = {
      ...saleInput,
      id: generateId('sale'),
      invoice_number: invNum,
      amount_paid: saleInput.amount_paid !== undefined ? saleInput.amount_paid : saleInput.total,
      due_amount: saleInput.due_amount !== undefined ? saleInput.due_amount : 0,
      payment_method: saleInput.payment_method || 'cash',
      payment_status: saleInput.payment_status || (saleInput.due_amount && saleInput.due_amount > 0 ? (saleInput.amount_paid > 0 ? 'partial' : 'due') : 'paid'),
      created_at: now,
      sale_date: saleInput.sale_date || now,
    };

    // Save in IndexedDB sales table
    await db.sales.add(newSale);

    // Auto decrement stock in IndexedDB
    if (newSale.items && newSale.items.length > 0) {
      for (const item of newSale.items) {
        try {
          const prod = await db.products.get(item.product_id);
          if (prod) {
            await db.products.update(prod.id, {
              quantity: Math.max(0, prod.quantity - item.quantity),
              updated_at: now
            });
          }
        } catch (err) {
          console.warn('Could not auto-decrement stock:', err);
        }
      }
    } else if (newSale.product_id) {
      try {
        const prod = await db.products.get(newSale.product_id);
        if (prod) {
          await db.products.update(prod.id, {
            quantity: Math.max(0, prod.quantity - newSale.quantity),
            updated_at: now
          });
        }
      } catch (err) {
        console.warn('Could not auto-decrement stock:', err);
      }
    }

    // Auto sync to Customer Khata if there is any due amount
    if (newSale.due_amount > 0 && newSale.customer_name) {
      await this.addOrUpdateKhataCredit(
        newSale.customer_name,
        newSale.phone_number,
        newSale.due_amount,
        newSale.invoice_number,
        `Credit sale on invoice ${newSale.invoice_number} (${newSale.product_name})`
      );
    }

    return newSale;
  }

  // --- Customer Khata (Credit Ledger) Operations ---

  public async getKhataCustomers(): Promise<KhataCustomerRecord[]> {
    await this.ensureInitialized();
    return db.khata_customers.reverse().sortBy('last_activity');
  }

  public async addOrUpdateKhataCredit(
    customerName: string, 
    phone: string | undefined, 
    amountDue: number, 
    invoiceNumber: string, 
    description: string
  ): Promise<KhataCustomerRecord> {
    await this.ensureInitialized();
    const cleanName = customerName.trim();
    const now = new Date().toISOString();

    const existing = await db.khata_customers
      .filter(c => c.name.toLowerCase() === cleanName.toLowerCase())
      .first();

    const transaction: KhataTransactionRecord = {
      id: generateId('tx'),
      date: now,
      type: 'credit',
      amount: amountDue,
      description,
      invoice_number: invoiceNumber,
    };

    if (existing) {
      const updatedDue = existing.total_due + amountDue;
      const updatedTx = [transaction, ...(existing.transactions || [])];
      const updatedCustomer: KhataCustomerRecord = {
        ...existing,
        total_due: updatedDue,
        last_activity: now,
        phone: phone || existing.phone,
        transactions: updatedTx,
      };
      await db.khata_customers.put(updatedCustomer);
      return updatedCustomer;
    } else {
      const newCustomer: KhataCustomerRecord = {
        id: generateId('kht'),
        name: cleanName,
        phone: phone || '',
        total_due: amountDue,
        total_paid: 0,
        last_activity: now,
        created_at: now,
        transactions: [transaction]
      };
      await db.khata_customers.add(newCustomer);
      return newCustomer;
    }
  }

  public async recordKhataPayment(customerId: string, amount: number, notes?: string): Promise<KhataCustomerRecord> {
    await this.ensureInitialized();
    const customer = await db.khata_customers.get(customerId);
    if (!customer) throw new Error('Customer not found in device Khata database.');

    const now = new Date().toISOString();
    const updatedDue = Math.max(0, customer.total_due - amount);
    const updatedPaid = customer.total_paid + amount;

    const paymentTx: KhataTransactionRecord = {
      id: generateId('tx'),
      date: now,
      type: 'payment',
      amount,
      description: notes || 'Cash payment received towards balance',
    };

    const updatedCustomer: KhataCustomerRecord = {
      ...customer,
      total_due: updatedDue,
      total_paid: updatedPaid,
      last_activity: now,
      transactions: [paymentTx, ...(customer.transactions || [])],
    };

    await db.khata_customers.put(updatedCustomer);
    return updatedCustomer;
  }

  // --- Stock Entries Operations (IndexedDB) ---

  public async getStockEntries(): Promise<StockEntryRecord[]> {
    await this.ensureInitialized();
    return db.stock_entries.reverse().sortBy('entry_date');
  }

  public async addStockEntry(entry: Omit<StockEntryRecord, 'id' | 'created_at'>): Promise<StockEntryRecord> {
    await this.ensureInitialized();
    const now = new Date().toISOString();
    const newEntry: StockEntryRecord = {
      ...entry,
      id: generateId('stock'),
      created_at: now,
      entry_date: entry.entry_date || now,
    };
    await db.stock_entries.add(newEntry);
    return newEntry;
  }

  /**
   * Atomically executes a multi-item supplier stock-in batch:
   * - Increments stock quantities of matched products.
   * - Creates new product records for uncatalogued items.
   * - Updates cost/retail prices.
   * - Atomically logs batch history into stock_entries table.
   */
  public async batchStockIn(batch: {
    supplierName: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    items: Array<{
      action: 'increment' | 'create' | 'ignore';
      productId?: string;
      productName: string;
      company?: string;
      formula?: string;
      quantity: number;
      purchasePrice: number;
      retailPrice?: number;
    }>;
  }): Promise<{ updatedCount: number; createdCount: number }> {
    await this.ensureInitialized();
    const now = new Date().toISOString();
    const entryDate = batch.invoiceDate || now;
    let updatedCount = 0;
    let createdCount = 0;

    await db.transaction('rw', [db.products, db.stock_entries], async () => {
      for (const item of batch.items) {
        if (item.action === 'ignore' || item.quantity <= 0) continue;

        if (item.action === 'increment' && item.productId) {
          const product = await db.products.get(item.productId);
          if (product) {
            const updatedQty = product.quantity + item.quantity;
            await db.products.update(product.id, {
              quantity: updatedQty,
              cost_price: item.purchasePrice > 0 ? item.purchasePrice : product.cost_price,
              price: item.retailPrice && item.retailPrice > 0 ? item.retailPrice : product.price,
              company: item.company || product.company,
              updated_at: now
            });
            updatedCount++;

            // Log stock history
            await db.stock_entries.add({
              id: generateId('stock'),
              product_id: product.id,
              product_name: product.name,
              company: product.company || batch.supplierName || 'Supplier',
              formula: product.formula || '',
              quantity: item.quantity,
              entry_type: 'existing',
              entry_date: entryDate,
              created_at: now,
              customer_name: batch.supplierName ? `Supplier: ${batch.supplierName}` : undefined,
              phone_number: batch.invoiceNumber ? `Bill #${batch.invoiceNumber}` : undefined
            });
          }
        } else if (item.action === 'create' || (!item.productId && item.action !== 'ignore')) {
          const retailPrice = item.retailPrice && item.retailPrice > 0 
            ? item.retailPrice 
            : Math.round(item.purchasePrice * 1.25);

          const newProduct: ProductRecord = {
            id: generateId('prod'),
            name: item.productName.trim(),
            company: item.company || batch.supplierName || 'General',
            formula: item.formula || '',
            quantity: item.quantity,
            price: retailPrice,
            cost_price: item.purchasePrice,
            created_at: now,
            updated_at: now
          };

          await db.products.add(newProduct);
          createdCount++;

          // Log stock history
          await db.stock_entries.add({
            id: generateId('stock'),
            product_id: newProduct.id,
            product_name: newProduct.name,
            company: newProduct.company,
            formula: newProduct.formula,
            quantity: item.quantity,
            entry_type: 'new',
            entry_date: entryDate,
            created_at: now,
            customer_name: batch.supplierName ? `Supplier: ${batch.supplierName}` : undefined,
            phone_number: batch.invoiceNumber ? `Bill #${batch.invoiceNumber}` : undefined
          });
        }
      }
    });

    return { updatedCount, createdCount };
  }

  // --- Backup & Restore (JSON Export from IndexedDB) ---

  public async exportBackup(): Promise<string> {
    await this.ensureInitialized();
    const [products, sales, khata, stockEntries, users] = await Promise.all([
      db.products.toArray(),
      db.sales.toArray(),
      db.khata_customers.toArray(),
      db.stock_entries.toArray(),
      db.users.toArray()
    ]);

    const backup = {
      version: 3,
      engine: 'dexie_indexeddb',
      exportedAt: new Date().toISOString(),
      products,
      sales,
      khata,
      stockEntries,
      users: users.map(u => ({ 
        id: u.id, 
        email: u.email, 
        name: u.name, 
        storeName: u.storeName, 
        role: u.role, 
        createdAt: u.createdAt 
      })),
    };
    return JSON.stringify(backup, null, 2);
  }

  public async importBackup(jsonString: string): Promise<{ success: boolean; message: string }> {
    await this.ensureInitialized();
    try {
      const data = JSON.parse(jsonString);
      await db.transaction('rw', [db.products, db.sales, db.khata_customers, db.stock_entries], async () => {
        if (Array.isArray(data.products) && data.products.length > 0) {
          await db.products.clear();
          await db.products.bulkAdd(data.products);
        }
        if (Array.isArray(data.sales) && data.sales.length > 0) {
          await db.sales.clear();
          await db.sales.bulkAdd(data.sales);
        }
        if (Array.isArray(data.khata) && data.khata.length > 0) {
          await db.khata_customers.clear();
          await db.khata_customers.bulkAdd(data.khata);
        }
        if (Array.isArray(data.stockEntries) && data.stockEntries.length > 0) {
          await db.stock_entries.clear();
          await db.stock_entries.bulkAdd(data.stockEntries);
        }
      });
      return { success: true, message: 'All data successfully restored into device IndexedDB.' };
    } catch (err) {
      return { success: false, message: (err as Error).message || 'Invalid backup format.' };
    }
  }

  public async clearAllData(): Promise<void> {
    await db.transaction('rw', [db.products, db.sales, db.khata_customers, db.stock_entries], async () => {
      await db.products.clear();
      await db.sales.clear();
      await db.khata_customers.clear();
      await db.stock_entries.clear();
    });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('inventory_device_products');
      localStorage.removeItem('inventory_device_sales');
      localStorage.removeItem('inventory_device_khata');
      localStorage.removeItem('inventory_device_stock_entries');
    }
  }

  public async resetToSampleData(): Promise<void> {
    await this.clearAllData();
  }
}

export const deviceStorage = new DeviceStorageEngine();

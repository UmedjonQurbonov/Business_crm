export interface User {
  id: number;
  username: string;
  role: 'owner' | 'seller';
  unpaid_balance: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  cost_price?: string; // Optional since it is hidden for sellers
  wholesale_price: string;
  stock_quantity: number;
  min_stock_level: number;
}

export interface Client {
  id: number;
  name: string;
  phone: string;
  current_debt: string;
}

export interface TransactionItem {
  id?: number;
  product: number;
  product_name?: string;
  quantity: number;
  fact_price: string;
}

export interface Transaction {
  id: number;
  type: 'retail' | 'wholesale';
  client?: number;
  created_by: number;
  created_at: string;
  total_amount: string;
  owner_profit: string;
  seller_profit: string;
  payment_status: 'cash' | 'debt' | 'partial_debt';
  items: TransactionItem[];
}

export interface Expense {
  id: number;
  amount: string;
  description: string;
  created_at: string;
}

export interface DebtRepayment {
  id: number;
  client: number;
  amount: string;
  created_at: string;
  created_by: number;
}

export interface SalaryPayout {
  id: number;
  seller: number;
  amount: string;
  created_at: string;
  created_by: number;
}

export interface Analytics {
  start_date: string;
  end_date: string;
  wholesale_revenue: string;
  retail_revenue: string;
  debt_returns: string;
  expenses: string;
  net_profit: string;
  total_unpaid_sellers: string;
}

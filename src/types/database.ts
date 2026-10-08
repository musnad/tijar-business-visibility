export type OnboardingStatus = "not_started" | "in_progress" | "completed";

export type Profile = {
  id: string;
  auth_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  preferred_language: string;
  onboarding_status: OnboardingStatus;
  created_at: string;
  updated_at: string;
};

export type BusinessCategory = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

export type Business = {
  id: string;
  owner_id: string;
  business_name: string;
  category_id: string | null;
  subcategory_id: string | null;
  description: string | null;
  location: string | null;
  logo_url: string | null;
  islamic_mode_enabled: boolean;
  verification_status: string;
  created_at?: string;
};

export type BusinessDna = {
  business_id: string;
  business_model: string | null;
  revenue_models: string[];
  customer_types: string[];
  payment_methods: string[];
  customer_credit_enabled: boolean | null;
  supplier_credit_enabled: boolean | null;
  inventory_required: boolean | null;
  has_staff: boolean | null;
  record_keeping_methods: string[];
  discovery_channels: string[];
  goals: string[];
};

export type TransactionType =
  | "sale"
  | "expense"
  | "purchase"
  | "customer_payment"
  | "supplier_payment";

export type Customer = {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  balance_owed: number;
  created_at: string;
  updated_at: string;
};

export type Supplier = {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  balance_owed: number;
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: string;
  business_id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  payment_method: string | null;
  description: string | null;
  customer_id: string | null;
  supplier_id: string | null;
  product_id: string | null;
  quantity: number | null;
  line_cost: number | null;
  line_profit: number | null;
  occurred_at: string;
  created_by: string | null;
  created_at: string;
};

export type ProductKind = "goods" | "service";

export type Product = {
  id: string;
  business_id: string;
  name: string;
  kind: ProductKind;
  unit: string;
  sale_price: number | null;
  cost_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  image_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductSalesStats = {
  productId: string;
  saleCount: number;
  revenue: number;
  profit: number;
};

export type StockMovementReason = "initial" | "purchase" | "sale" | "adjustment" | "return";

export type TransactionListItem = Transaction & {
  customers: { name: string } | null;
  suppliers: { name: string } | null;
  products: { name: string; image_url: string | null } | null;
};

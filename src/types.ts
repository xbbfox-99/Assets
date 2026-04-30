export type AssetCategory = 'saving' | 'term_deposit' | 'liquid' | 'foreign';
export type LiabilityCategory = 'loan' | 'card' | 'investment_payable';
export type InvestmentCategory = 'stock' | 'crypto' | 'fund';

export interface Asset {
  id: string;
  userId: string;
  name: string;
  category: AssetCategory;
  bank: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  updatedAt: any;
  type?: 'asset';
}

export interface Liability {
  id: string;
  userId: string;
  name: string;
  category: LiabilityCategory;
  amount: number;
  dueDate?: string;
  updatedAt: any;
  type?: 'liability';
}

export interface Investment {
  id: string;
  userId: string;
  name: string;
  symbol: string;
  category: InvestmentCategory;
  shares: number;
  avgCost: number;
  marketPrice: number;
  updatedAt: any;
  type?: 'investment';
}

export interface Reminder {
  id: string;
  userId: string;
  name: string;
  day: string;
  note?: string;
}

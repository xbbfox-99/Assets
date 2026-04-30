export interface ProjectItem {
  id: string; // Unique ID for reordering/editing
  name: string;
  category: string;
  bank: string;
  type: 'asset' | 'liability' | 'investment';
  symbol?: string;
  cost?: number; // Historical cost per share
  currency?: 'TWD' | 'USD' | 'JPY' | 'EUR';
}

export const INSTITUTIONS = [
  {
    id: 'inst-post',
    name: '郵局',
    items: [
      { id: 'a1', name: '郵局存款', bank: '郵局', category: 'saving', type: 'asset' },
      { id: 'a2', name: '手上現金', bank: '郵局', category: 'liquid', type: 'asset' },
    ] as ProjectItem[]
  },
  {
    id: 'inst-taishin',
    name: '台新銀行',
    items: [
      { id: 'a3', name: '台新台幣', bank: '台新', category: 'saving', type: 'asset' },
      { id: 'a4', name: '台新外幣', bank: '台新', category: 'saving', type: 'asset' },
      { id: 'i1', name: '台新證卷', bank: '台新', category: 'investment', type: 'asset' },
      { id: 'l1', name: '台新卡費', bank: '台新', category: 'card', type: 'liability' },
    ] as ProjectItem[]
  },
  {
    id: 'inst-cathay',
    name: '國泰世華',
    items: [
      { id: 'a5', name: '國泰台幣', bank: '國泰世華', category: 'saving', type: 'asset' },
      { id: 'a6', name: '國泰外幣', bank: '國泰世華', category: 'saving', type: 'asset' },
      { id: 'l2', name: '國泰卡費', bank: '國泰世華', category: 'card', type: 'liability' },
    ] as ProjectItem[]
  },
  {
    id: 'inst-megabank',
    name: '兆豐銀行',
    items: [
      { id: 'a7', name: '兆豐存款', bank: '兆豐銀行', category: 'saving', type: 'asset' },
      { id: 'l3', name: '兆豐貸款', bank: '兆豐銀行', category: 'loan', type: 'liability' },
    ] as ProjectItem[]
  },
  {
    id: 'inst-sinopac',
    name: '永豐銀行',
    items: [
      { id: 'a8', name: '永豐台幣', bank: '永豐銀行', category: 'saving', type: 'asset' },
      { id: 'l4', name: '永豐卡費', bank: '永豐銀行', category: 'card', type: 'liability' },
    ] as ProjectItem[]
  },
  {
    id: 'inst-invest',
    name: '股票與投資',
    items: [
      { id: 'i2', name: '凱基台灣TOP50', category: 'stock', type: 'investment', symbol: '00551L', bank: '股票與投資' },
      { id: 'i3', name: '中鴻', category: 'stock', type: 'investment', symbol: '2014', bank: '股票與投資' },
      { id: 'i4', name: '台達電', category: 'stock', type: 'investment', symbol: '2308', bank: '股票與投資' },
      { id: 'i5', name: '聯發科', category: 'stock', type: 'investment', symbol: '2454', bank: '股票與投資' },
      { id: 'i6', name: 'GOOGL', category: 'stock', type: 'investment', symbol: 'GOOGL', bank: '股票與投資' },
      { id: 'i7', name: 'BTC', category: 'crypto', type: 'investment', symbol: 'BTC', bank: '股票與投資' },
    ] as ProjectItem[]
  }
];

export const DEFAULT_ASSETS = INSTITUTIONS.flatMap(inst => inst.items.filter(i => i.type === 'asset'));
export const DEFAULT_LIABILITIES = INSTITUTIONS.flatMap(inst => inst.items.filter(i => i.type === 'liability'));
export const DEFAULT_INVESTMENTS = INSTITUTIONS.flatMap(inst => inst.items.filter(i => i.type === 'investment'));

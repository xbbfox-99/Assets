import React from 'react';
import { Asset, Liability, Investment } from '../types';
import { ArrowUpRight, ArrowDownRight, MoreHorizontal } from 'lucide-react';
import { motion } from 'motion/react';

interface EntryListProps {
  title: string;
  items: (Asset | Liability | Investment)[];
  type: 'asset' | 'liability' | 'investment';
  onDelete: (id: string, path: string) => void;
  onEdit: (item: Asset | Liability | Investment) => void;
}

export const EntryList: React.FC<EntryListProps> = ({ title, items, type, onDelete, onEdit }) => {
  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(amt);
  };

  const getPath = () => {
    switch(type) {
      case 'asset': return 'assets';
      case 'liability': return 'liabilities';
      case 'investment': return 'investments';
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-0.5">
        <p className="text-[10px] text-wabi-stone uppercase tracking-[0.2em]">{type}s</p>
        <h2 className="text-2xl font-serif text-wabi-ink">{title}</h2>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-12 h-12 rounded-full border border-dashed border-wabi-accent/30 mx-auto flex items-center justify-center text-wabi-accent/30">
              <MoreHorizontal />
            </div>
            <p className="text-xs text-wabi-stone font-sans">尚無資料，請點擊上方按鈕新增</p>
          </div>
        ) : (
          items.map((item, idx) => {
            const amount = 'amount' in item ? item.amount : (item.marketPrice * item.shares);
            const subtext = 'bank' in item ? item.bank : ('category' in item ? item.category : '');
            
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => onEdit(item)}
                className="bg-wabi-paper p-3 rounded-2xl border border-wabi-accent/5 flex items-center justify-between group cursor-pointer hover:border-wabi-accent/20 transition-all shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${type === 'asset' ? 'bg-green-50 text-green-600' : type === 'liability' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                    {type === 'asset' || type === 'investment' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-wabi-ink">{item.name}</p>
                    <p className="text-[10px] text-wabi-stone uppercase tracking-wider">{subtext}</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className="text-sm font-medium text-wabi-ink tabular-nums">{formatCurrency(amount)}</p>
                  <button 
                    onClick={() => onDelete(item.id, getPath())}
                    className="text-[10px] text-red-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                  >
                    刪除
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

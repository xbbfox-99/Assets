import React, { useState } from 'react';
import { Asset, Liability, Investment } from '../types';
import { Trash2, Calendar, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BatchHistoryListProps {
  title: string;
  items: (Asset | Liability | Investment)[];
  type: 'asset' | 'liability' | 'investment';
  onDeleteBatch: (items: (Asset | Liability | Investment)[]) => void;
  onEditBatch: (items: (Asset | Liability | Investment)[]) => void;
}

export const BatchHistoryList: React.FC<BatchHistoryListProps> = ({ 
  title, 
  items, 
  type, 
  onDeleteBatch,
  onEditBatch
}) => {
  const [confirmingTs, setConfirmingTs] = useState<number | null>(null);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(amt);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown Date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const getExactTimestamp = (timestamp: any) => {
    if (!timestamp) return 0;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.getTime();
  };

  // Group items by exact timestamp
  interface BatchGroup {
    timestamp: any;
    total: number;
    items: (Asset | Liability | Investment)[];
  }

  const groups = items.reduce((acc, item) => {
    const ts = getExactTimestamp(item.updatedAt);
    if (!acc[ts]) {
      acc[ts] = {
        timestamp: item.updatedAt,
        total: 0,
        items: []
      };
    }
    
    let amount = 0;
    const isLiability = item.type === 'liability' || (['loan', 'card', 'investment_payable'].includes((item as any).category));
    
    if ('amount' in item) {
      amount = item.amount * (('exchangeRate' in item ? item.exchangeRate : 1) || 1);
    } else if (('marketPrice' in item || 'price' in item) && 'shares' in item) {
      const price = (item as any).marketPrice || (item as any).price || 0;
      amount = price * item.shares;
    }
    
    if (isLiability) {
      acc[ts].total -= amount;
    } else {
      acc[ts].total += amount;
    }
    acc[ts].items.push(item);
    return acc;
  }, {} as Record<number, BatchGroup>);

  // Convert to array and sort by date descending
  const sortedBatches = (Object.values(groups) as BatchGroup[]).sort((a, b) => {
    const timeA = getExactTimestamp(a.timestamp);
    const timeB = getExactTimestamp(b.timestamp);
    return timeB - timeA;
  });

  return (
    <div className="space-y-6">
      <div className="space-y-0.5">
        <p className="text-[10px] text-wabi-stone uppercase tracking-[0.2em]">{type} History</p>
        <h2 className="text-2xl font-serif text-wabi-ink">{title}</h2>
      </div>

      <div className="space-y-3">
        {sortedBatches.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-12 h-12 rounded-full border border-dashed border-wabi-accent/30 mx-auto flex items-center justify-center text-wabi-accent/30">
              <Calendar size={20} />
            </div>
            <p className="text-xs text-wabi-stone font-sans">尚無歷史紀錄</p>
          </div>
        ) : (
          sortedBatches.map((batch, idx) => {
            const ts = getExactTimestamp(batch.timestamp);
            const isConfirming = confirmingTs === ts;

            return (
              <motion.div
                key={ts}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => onEditBatch(batch.items)}
                className="bg-wabi-paper rounded-2xl border border-wabi-accent/5 flex flex-col group overflow-hidden relative cursor-pointer hover:border-wabi-accent/20 transition-all shadow-sm hover:shadow-md"
              >
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-wabi-bg flex items-center justify-center text-wabi-stone border border-wabi-accent/5">
                      <Calendar size={18} strokeWidth={1.5} />
                    </div>
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-[10px] font-sans text-wabi-stone uppercase tracking-widest leading-none mb-1">記錄日期</p>
                        <p className="text-base font-serif text-wabi-ink">{formatDate(batch.timestamp)}</p>
                      </div>
                      <div className="w-px h-8 bg-wabi-accent/10 mx-1" />
                      <div>
                        <p className="text-[10px] font-sans text-wabi-stone uppercase tracking-widest leading-none mb-1">淨資產</p>
                        <p className={`text-base font-bold tabular-nums ${batch.total >= 0 ? 'text-emerald-700' : 'text-red-500'}`}>
                          {formatCurrency(batch.total)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 relative z-20">
                    <AnimatePresence mode="wait">
                      {isConfirming ? (
                        <motion.div 
                          key="confirm"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="flex items-center gap-2"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteBatch(batch.items);
                              setConfirmingTs(null);
                            }}
                            className="bg-red-500 text-white px-3 py-1.5 rounded-full text-[10px] font-bold shadow-sm hover:bg-red-600 transition-colors whitespace-nowrap"
                          >
                            確定刪除
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmingTs(null);
                            }}
                            className="p-1.5 text-wabi-stone hover:bg-wabi-bg rounded-full"
                          >
                            <X size={16} />
                          </button>
                        </motion.div>
                      ) : (
                        <motion.button 
                          key="trash"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmingTs(ts);
                          }}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                        >
                          <Trash2 size={18} />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

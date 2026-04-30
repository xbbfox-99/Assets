import React, { useState } from 'react';
import { Asset, Liability, Investment, Reminder } from '../types';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Wallet, Clock, Check, Square } from 'lucide-react';

interface DashboardProps {
  assets: Asset[];
  liabilities: Liability[];
  investments: Investment[];
  reminders: Reminder[];
}

export const Dashboard: React.FC<DashboardProps> = ({ assets, liabilities, investments, reminders }) => {
  const [includeCSC, setIncludeCSC] = useState(true);

  // Helper to filter for the latest entries
  const getLatestSnapshot = () => {
    let allItems = [...assets, ...liabilities, ...investments];
    
    // Filter out CSC if toggled off
    if (!includeCSC) {
      allItems = allItems.filter(item => {
        const name = (item.name || '').toLowerCase();
        const bank = (item as any).bank || '';
        return !name.includes('中鋼') && !bank.includes('中鋼');
      });
    }

    if (allItems.length === 0) return { latestAssets: [], latestLiabilities: [], latestInvestments: [], latestDate: null };

    const maxTimestampLookup = allItems.map(item => ({
      ts: item.updatedAt?.toDate ? item.updatedAt.toDate().getTime() : new Date(item.updatedAt).getTime(),
      date: item.updatedAt
    }));
    
    const validTimestamps = maxTimestampLookup.filter(t => !isNaN(t.ts));
    if (validTimestamps.length === 0) return { latestAssets: [], latestLiabilities: [], latestInvestments: [], latestDate: null };
    
    const maxEntry = validTimestamps.reduce((prev, current) => (prev.ts > current.ts) ? prev : current);
    const maxTimestamp = maxEntry.ts;

    // Filter items that belong to this latest snapshot
    const isLatest = (item: any) => {
      const ts = item.updatedAt?.toDate ? item.updatedAt.toDate().getTime() : new Date(item.updatedAt).getTime();
      return ts === maxTimestamp;
    };

    const filteredAssets = assets.filter(isLatest) as Asset[];
    const filteredLiabilities = liabilities.filter(isLatest) as Liability[];
    const filteredInvestments = investments.filter(isLatest) as Investment[];

    const finalAssets = includeCSC ? filteredAssets : filteredAssets.filter(i => !(i.name.includes('中鋼') || i.bank.includes('中鋼')));
    const finalLiabilities = includeCSC ? filteredLiabilities : filteredLiabilities.filter(i => !(i.name.includes('中鋼')));
    const finalInvestments = includeCSC ? filteredInvestments : filteredInvestments.filter(i => !(i.name.includes('中鋼')));

    return {
      latestAssets: finalAssets,
      latestLiabilities: finalLiabilities,
      latestInvestments: finalInvestments,
      latestDate: maxEntry.date
    };
  };

  const { latestAssets, latestLiabilities, latestInvestments, latestDate } = getLatestSnapshot();

  const totalAssets = latestAssets.reduce((sum, item) => sum + (item.amount * (item.exchangeRate || 1)), 0);
  const totalInvestments = latestInvestments.reduce((sum, item) => sum + (item.marketPrice * (item.shares || 1) * ((item as any).exchangeRate || 1)), 0);
  const totalLiabilities = latestLiabilities.reduce((sum, item) => sum + item.amount, 0);
  const netWorth = (totalAssets + totalInvestments) - totalLiabilities;

  // Available Cash: Everything except liabilities and stocks (investments) is considered cash
  const availableCash = totalAssets;

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(amt);
  };

  const investmentRatio = (totalAssets + totalInvestments) > 0 
    ? (totalInvestments / (totalAssets + totalInvestments)) * 100 
    : 0;
  
  const debtRatio = (totalAssets + totalInvestments) > 0 
    ? (totalLiabilities / (totalAssets + totalInvestments)) * 100 
    : 0;

  const cashRatio = (totalAssets + totalInvestments) > 0
    ? (availableCash / (totalAssets + totalInvestments)) * 100
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-wabi-stone uppercase tracking-[0.2em]">Current Balance</p>
            {latestDate && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-wabi-paper rounded-full border border-wabi-accent/5">
                <Clock size={8} className="text-wabi-stone" />
                <span className="text-[8px] font-bold text-wabi-stone uppercase tracking-widest">
                  {(() => {
                    const d = latestDate.toDate ? latestDate.toDate() : new Date(latestDate);
                    return d.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' });
                  })()}
                </span>
              </div>
            )}
          </div>
          <h2 className="text-2xl font-serif text-wabi-ink">財務概覽</h2>
        </div>
        
        <button 
          onClick={() => setIncludeCSC(!includeCSC)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
            includeCSC 
              ? 'bg-wabi-accent/20 border-wabi-accent/40 text-wabi-ink' 
              : 'bg-wabi-paper border-wabi-accent/10 text-wabi-stone'
          }`}
        >
          <span className="text-[10px] font-medium tracking-wider">計入中鋼信託</span>
          {includeCSC ? <Check size={12} strokeWidth={3} /> : <Square size={12} strokeWidth={2} />}
        </button>
      </div>

      {/* Main Net Worth Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-wabi-paper p-5 rounded-3xl border border-wabi-accent/10 shadow-sm space-y-4"
      >
        <div className="flex justify-between items-start">
          <div className="space-y-0.5">
            <p className="text-[10px] text-wabi-stone uppercase tracking-widest">Net Worth / 淨資產</p>
            <p className="text-3xl font-serif text-wabi-ink tabular-nums">{formatCurrency(netWorth)}</p>
          </div>
          <div className="text-right space-y-0.5">
            <p className="text-[9px] text-wabi-stone uppercase tracking-widest">Available Cash / 可用現金</p>
            <p className="text-sm font-medium text-wabi-ink tabular-nums">{formatCurrency(availableCash)}</p>
          </div>
        </div>

        <div className="pt-4 border-t border-wabi-bg flex justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] text-wabi-stone uppercase tracking-widest">
              <TrendingUp size={10} className="text-wabi-up" />
              <span>Assets</span>
            </div>
            <p className="text-sm font-medium text-wabi-ink tabular-nums">{formatCurrency(totalAssets + totalInvestments)}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] text-wabi-stone uppercase tracking-widest">
              <TrendingDown size={10} className="text-wabi-down" />
              <span>Liabilities</span>
            </div>
            <p className="text-sm font-medium text-wabi-ink tabular-nums">{formatCurrency(totalLiabilities)}</p>
          </div>
        </div>
      </motion.div>

      {/* Insights Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-serif text-wabi-ink px-1">財務分析 Insights</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-wabi-paper p-3 rounded-2xl border border-wabi-accent/10 space-y-1.5">
            <p className="text-[8px] text-wabi-stone uppercase tracking-wider">現金比率</p>
            <p className="text-sm font-medium text-wabi-ink">{cashRatio.toFixed(1)}%</p>
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-wabi-up/80" style={{ width: `${Math.min(cashRatio, 100)}%` }} />
            </div>
          </div>
          <div className="bg-wabi-paper p-3 rounded-2xl border border-wabi-accent/10 space-y-1.5">
            <p className="text-[8px] text-wabi-stone uppercase tracking-wider">投資比率</p>
            <p className="text-sm font-medium text-wabi-ink">{investmentRatio.toFixed(1)}%</p>
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-wabi-ink/40" style={{ width: `${Math.min(investmentRatio, 100)}%` }} />
            </div>
          </div>
          <div className="bg-wabi-paper p-3 rounded-2xl border border-wabi-accent/10 space-y-1.5">
            <p className="text-[8px] text-wabi-stone uppercase tracking-wider">負債比率</p>
            <p className="text-sm font-medium text-wabi-ink">{debtRatio.toFixed(1)}%</p>
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-wabi-down/80" style={{ width: `${Math.min(debtRatio, 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Reminders */}
      <div className="space-y-3">
        <div className="flex justify-between items-end px-1">
          <h3 className="text-xs font-serif text-wabi-ink">帳單提醒</h3>
          <span className="text-[9px] text-wabi-stone uppercase tracking-widest">See all</span>
        </div>
        
        <div className="space-y-2">
          {reminders.length === 0 ? (
            <p className="text-xs text-wabi-stone italic px-1 font-sans">暫無待處理帳單</p>
          ) : (
            reminders.slice(0, 3).map(reminder => (
              <div key={reminder.id} className="bg-wabi-paper px-3 py-2 rounded-xl border border-wabi-accent/5 flex items-center justify-between">
                <span className="text-[11px] text-wabi-ink">{reminder.name}</span>
                <span className="text-[9px] text-wabi-stone bg-wabi-bg px-2 py-0.5 rounded-full">{reminder.day}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

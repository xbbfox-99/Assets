import React from 'react';
import { Asset, Liability, Investment, Reminder } from '../types';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Wallet, Clock } from 'lucide-react';

interface DashboardProps {
  assets: Asset[];
  liabilities: Liability[];
  investments: Investment[];
  reminders: Reminder[];
}

export const Dashboard: React.FC<DashboardProps> = ({ assets, liabilities, investments, reminders }) => {
  // Helper to filter for the latest entries
  const getLatestSnapshot = () => {
    const allItems = [...assets, ...liabilities, ...investments];
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

    return {
      latestAssets: assets.filter(isLatest) as Asset[],
      latestLiabilities: liabilities.filter(isLatest) as Liability[],
      latestInvestments: investments.filter(isLatest) as Investment[],
      latestDate: maxEntry.date
    };
  };

  const { latestAssets, latestLiabilities, latestInvestments, latestDate } = getLatestSnapshot();

  const totalAssets = latestAssets.reduce((sum, item) => sum + (item.amount * (item.exchangeRate || 1)), 0);
  const totalInvestments = latestInvestments.reduce((sum, item) => sum + (item.marketPrice * (item.shares || 1)), 0);
  const totalLiabilities = latestLiabilities.reduce((sum, item) => sum + item.amount, 0);
  const netWorth = (totalAssets + totalInvestments) - totalLiabilities;

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(amt);
  };

  const investmentRatio = (totalAssets + totalInvestments) > 0 
    ? (totalInvestments / (totalAssets + totalInvestments)) * 100 
    : 0;
  
  const debtRatio = (totalAssets + totalInvestments) > 0 
    ? (totalLiabilities / (totalAssets + totalInvestments)) * 100 
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <p className="text-[10px] text-wabi-stone uppercase tracking-[0.2em]">Current Balance</p>
          <h2 className="text-2xl font-serif text-wabi-ink">財務概覽</h2>
        </div>
        {latestDate && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-wabi-paper rounded-full border border-wabi-accent/5">
            <Clock size={10} className="text-wabi-stone" />
            <span className="text-[10px] font-bold text-wabi-stone uppercase tracking-widest">
              {(() => {
                const d = latestDate.toDate ? latestDate.toDate() : new Date(latestDate);
                return d.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' });
              })()}
            </span>
          </div>
        )}
      </div>

      {/* Main Net Worth Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-wabi-paper p-5 rounded-3xl border border-wabi-accent/10 shadow-sm space-y-4"
      >
        <div className="space-y-0.5">
          <p className="text-[10px] text-wabi-stone uppercase tracking-widest">Net Worth / 淨資產</p>
          <p className="text-3xl font-serif text-wabi-ink tabular-nums">{formatCurrency(netWorth)}</p>
        </div>

        <div className="pt-4 border-t border-wabi-bg flex justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] text-wabi-stone uppercase tracking-widest">
              <TrendingUp size={10} className="text-green-600" />
              <span>Assets</span>
            </div>
            <p className="text-sm font-medium text-wabi-ink tabular-nums">{formatCurrency(totalAssets + totalInvestments)}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] text-wabi-stone uppercase tracking-widest">
              <TrendingDown size={10} className="text-red-500" />
              <span>Liabilities</span>
            </div>
            <p className="text-sm font-medium text-wabi-ink tabular-nums">{formatCurrency(totalLiabilities)}</p>
          </div>
        </div>
      </motion.div>

      {/* Snapshot Items Debug/Detail */}
      {(latestAssets.length > 0 || latestLiabilities.length > 0 || latestInvestments.length > 0) && (
        <div className="space-y-4">
          <h3 className="text-sm font-serif text-wabi-ink px-1">當前計算項目</h3>
          <div className="bg-wabi-paper/50 rounded-2xl border border-wabi-accent/5 divide-y divide-wabi-bg">
            {[...latestAssets, ...latestInvestments].map((item, i) => (
              <div key={`asset-${item.id}-${i}`} className="p-2.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-wabi-ink">{item.name}</p>
                  <p className="text-[9px] text-wabi-stone uppercase tracking-widest">Asset</p>
                </div>
                <p className="text-xs font-bold text-emerald-600 tabular-nums">
                  {formatCurrency(('amount' in item ? item.amount : (item.marketPrice * item.shares)) * (('exchangeRate' in item ? item.exchangeRate : 1) || 1))}
                </p>
              </div>
            ))}
            {latestLiabilities.map((item, i) => (
              <div key={`liab-${item.id}-${i}`} className="p-2.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-wabi-ink">{item.name}</p>
                  <p className="text-[9px] text-wabi-stone uppercase tracking-widest text-red-400">Liability</p>
                </div>
                <p className="text-xs font-bold text-red-500 tabular-nums">
                  -{formatCurrency(item.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-serif text-wabi-ink px-1">財務分析 Insights</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-wabi-paper p-3.5 rounded-2xl border border-wabi-accent/5 space-y-1.5">
            <p className="text-[9px] text-wabi-stone uppercase tracking-wider">投資比率</p>
            <div className="flex items-end gap-1">
              <p className="text-base font-medium text-wabi-ink">{investmentRatio.toFixed(1)}%</p>
            </div>
            <div className="w-full h-1 bg-wabi-bg rounded-full overflow-hidden">
              <div className="h-full bg-wabi-accent" style={{ width: `${Math.min(investmentRatio, 100)}%` }} />
            </div>
          </div>
          <div className="bg-wabi-paper p-3.5 rounded-2xl border border-wabi-accent/5 space-y-1.5">
            <p className="text-[9px] text-wabi-stone uppercase tracking-wider">負債比率</p>
            <div className="flex items-end gap-1">
              <p className="text-base font-medium text-wabi-ink">{debtRatio.toFixed(1)}%</p>
            </div>
            <div className="w-full h-1 bg-wabi-bg rounded-full overflow-hidden">
              <div className="h-full bg-red-200" style={{ width: `${Math.min(debtRatio, 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Sections */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-wabi-paper p-3.5 rounded-2xl border border-wabi-accent/5 space-y-2">
          <div className="w-7 h-7 rounded-full bg-wabi-bg flex items-center justify-center text-wabi-stone">
            <Wallet size={14} />
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] text-wabi-stone uppercase tracking-wider">Savings</p>
            <p className="text-xs font-medium text-wabi-ink">{formatCurrency(totalAssets)}</p>
          </div>
        </div>
        <div className="bg-wabi-paper p-3.5 rounded-2xl border border-wabi-accent/5 space-y-2">
          <div className="w-7 h-7 rounded-full bg-wabi-bg flex items-center justify-center text-wabi-stone">
            <Clock size={14} />
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] text-wabi-stone uppercase tracking-wider">Reminders</p>
            <p className="text-xs font-medium text-wabi-ink">{reminders.length} 筆待付</p>
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

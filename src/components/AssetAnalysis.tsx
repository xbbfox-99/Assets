import React, { useState } from 'react';
import { Asset, Liability, Investment } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Line, Bar, CartesianGrid } from 'recharts';
import { TrendingUp, CheckSquare, Square, Filter, BarChart3, Activity } from 'lucide-react';

interface AssetAnalysisProps {
  assets: Asset[];
  liabilities: Liability[];
  investments: Investment[];
}

export const AssetAnalysis: React.FC<AssetAnalysisProps> = ({ assets, liabilities, investments }) => {
  const [excludedKeys, setExcludedKeys] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Use Name + Category as a unique key for filtering across history
  const getItemKey = (item: any) => `${item.name}|${item.category}`;

  // Helper to check if item is included
  const isIncluded = (item: any) => !excludedKeys.has(getItemKey(item));

  const toggleItem = (key: string) => {
    setExcludedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // 1. Group by date to get Net Worth Trend
  const getTrendData = () => {
    const allItems = [...assets, ...liabilities, ...investments].filter(isIncluded);
    if (allItems.length === 0) return [];

    const groupedByTs: { [key: number]: { ts: number, date: string, netWorth: number, assets: number, liabilities: number } } = {};

    allItems.forEach(item => {
      const dateObj = item.updatedAt?.toDate ? item.updatedAt.toDate() : new Date(item.updatedAt);
      // Normalize to start of day for grouping
      const midnight = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()).getTime();
      const dateStr = dateObj.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' });
      
      if (!groupedByTs[midnight]) {
        groupedByTs[midnight] = { ts: midnight, date: dateStr, netWorth: 0, assets: 0, liabilities: 0 };
      }

      const amount = 'amount' in item ? (item.amount * (item.exchangeRate || 1)) : (item.marketPrice * item.shares * ((item as any).exchangeRate || 1));
      
      if ('shares' in item) { // Investment
        groupedByTs[midnight].assets += amount;
      } else if (['loan', 'card', 'investment_payable'].includes((item as any).category)) { // Liability
        groupedByTs[midnight].liabilities += amount;
      } else { // Asset
        groupedByTs[midnight].assets += amount;
      }
    });

    const sortedData = Object.values(groupedByTs).sort((a, b) => a.ts - b.ts);

    return sortedData.map(d => ({
        ...d,
        netWorth: d.assets - d.liabilities
    }));
  };

  const trendData = getTrendData();
  const performanceData = (() => {
    const includedInvestments = investments.filter(isIncluded);
    if (includedInvestments.length === 0) return [];

    const groupedByTs: { [key: number]: { ts: number, date: string, cost: number, value: number } } = {};

    includedInvestments.forEach(inv => {
      const dateObj = inv.updatedAt?.toDate ? inv.updatedAt.toDate() : new Date(inv.updatedAt);
      const midnight = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()).getTime();
      const dateStr = dateObj.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' });

      if (!groupedByTs[midnight]) {
        groupedByTs[midnight] = { ts: midnight, date: dateStr, cost: 0, value: 0 };
      }

      const rate = inv.exchangeRate || 1;
      const cost = inv.avgCost * inv.shares * rate;
      const value = inv.marketPrice * inv.shares * rate;

      groupedByTs[midnight].cost += cost;
      groupedByTs[midnight].value += value;
    });

    const sortedData = Object.values(groupedByTs).sort((a, b) => a.ts - b.ts);
    return sortedData.map(d => ({
      ...d,
      profit: d.value - d.cost,
      profitPct: d.cost > 0 ? ((d.value - d.cost) / d.cost * 100) : 0
    }));
  })();

  // 2. Asset Allocation Data (Latest snapshot)
  const getAllocationData = () => {
    const includedAssets = assets.filter(isIncluded);
    const includedInvestments = investments.filter(isIncluded);
    
    if (includedAssets.length === 0 && includedInvestments.length === 0) return [];
    
    // Find latest date from all items
    const all = [...includedAssets, ...includedInvestments];
    const latestTs = Math.max(...all.map(i => i.updatedAt?.toDate ? i.updatedAt.toDate().getTime() : new Date(i.updatedAt).getTime()));
    
    // Normalize latestTs to start of day if needed, but here we just want the batch
    const latestItems = all.filter(i => {
        const ts = i.updatedAt?.toDate ? i.updatedAt.toDate().getTime() : new Date(i.updatedAt).getTime();
        // Allow within same minute/second if multiple fields updated slightly different, but usually they are exact
        return Math.abs(ts - latestTs) < 1000;
    });

    const categories: { [key: string]: number } = {};
    latestItems.forEach(i => {
        const amount = 'amount' in i ? (i.amount * (i.exchangeRate || 1)) : (i.marketPrice * i.shares * ((i as any).exchangeRate || 1));
        categories[i.category] = (categories[i.category] || 0) + amount;
    });

    return Object.entries(categories)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
  };

  const allocationData = getAllocationData();
  const totalAllocationValue = allocationData.reduce((acc, curr) => acc + curr.value, 0);
  const COLORS = ['#E11D48', '#059669', '#94A3B8', '#F59E0B', '#3B82F6', '#8B5CF6'];

  const categoryLabels: Record<string, string> = {
    'saving': '銀行儲蓄',
    'stock': '股票投資',
    'crypto': '加密貨幣',
    'card': '信用卡費',
    'loan': '貸款專案',
    'cash': '現金資產',
    'foreign': '外幣資產',
    'other': '其他項目'
  };

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(amt);
  };

  const currentNetWorth = trendData.length > 0 ? trendData[trendData.length - 1].netWorth : 0;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <p className="text-[10px] text-wabi-stone uppercase tracking-[0.2em]">Insights & Analytics</p>
        <h2 className="text-2xl font-serif text-wabi-ink">資產分析</h2>
      </div>

      {/* Filter Toggle */}
      <div className="flex justify-start">
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-medium tracking-widest uppercase transition-colors ${showFilters ? 'bg-wabi-ink text-white' : 'bg-wabi-paper text-wabi-stone border border-wabi-accent/10'}`}
        >
          <Filter size={10} />
          {showFilters ? '隱藏篩選' : '篩選項目'}
          {excludedKeys.size > 0 && <span className="ml-1 px-1 bg-wabi-accent text-white rounded-full leading-none py-0.5">{excludedKeys.size}</span>}
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-wabi-paper p-5 rounded-3xl border border-wabi-accent/10 shadow-sm space-y-4">
              <p className="text-[10px] text-wabi-stone uppercase tracking-widest">Include in calculation / 納入計算項目</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {(() => {
                  const uniqueItems: any[] = [];
                  const seenKeys = new Set<string>();
                  
                  [...assets, ...investments, ...liabilities].forEach(item => {
                    const key = getItemKey(item);
                    if (!seenKeys.has(key)) {
                      seenKeys.add(key);
                      uniqueItems.push(item);
                    }
                  });

                  return uniqueItems.map(item => {
                    const key = getItemKey(item);
                    const included = isIncluded(item);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleItem(key)}
                        className="flex items-center gap-3 p-2 rounded-xl border border-wabi-accent/5 hover:bg-wabi-bg transition-colors text-left"
                      >
                        {included ? (
                          <CheckSquare size={14} className="text-wabi-ink shrink-0" />
                        ) : (
                          <Square size={14} className="text-wabi-stone shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className={`text-[10px] font-medium truncate ${included ? 'text-wabi-ink' : 'text-wabi-stone line-through opacity-50'}`}>
                            {item.name}
                          </p>
                          <p className="text-[8px] text-wabi-stone uppercase tracking-tighter">
                            {categoryLabels[item.category] || item.category}
                          </p>
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trend Chart Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-wabi-paper p-5 rounded-3xl border border-wabi-accent/10 shadow-sm space-y-6"
      >
        <div className="flex justify-between items-end">
            <div className="space-y-0.5">
                <p className="text-[10px] text-wabi-stone uppercase tracking-widest">Asset Trend / 資產推移走勢圖</p>
                <p className="text-xl font-serif text-wabi-ink tabular-nums">{formatCurrency(currentNetWorth)}</p>
            </div>
            {trendData.length > 1 && (
                <div className="flex items-center gap-1 text-wabi-up bg-wabi-up/5 px-2 py-0.5 rounded-full border border-wabi-up/10">
                    <TrendingUp size={10} />
                    <span className="text-[8px] font-bold uppercase tracking-widest">Growth</span>
                </div>
            )}
        </div>

        <div className="h-[220px] w-full">
            {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#EDEDED" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#EDEDED" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#E11D48" stopOpacity={0.05}/>
                                <stop offset="95%" stopColor="#E11D48" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorLiabilities" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#059669" stopOpacity={0.05}/>
                                <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 9, fill: '#7A7A7A' }}
                            dy={10}
                        />
                        <YAxis 
                            hide={true}
                        />
                        <Tooltip 
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-wabi-paper p-3 border border-wabi-accent/10 rounded-2xl shadow-xl space-y-2">
                                            <p className="text-[10px] text-wabi-stone font-medium mb-1">{label}</p>
                                            <div className="space-y-1">
                                                {payload.map((entry, index) => (
                                                    <div key={index} className="flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                                            <span className="text-[10px] text-wabi-stone uppercase tracking-tighter">
                                                                {entry.name === 'netWorth' ? '淨資產' : entry.name === 'assets' ? '總資產' : '總負債'}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-wabi-ink tabular-nums">
                                                            {formatCurrency(entry.value as number)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="assets" 
                            name="assets"
                            stroke="#E11D48" 
                            strokeWidth={1}
                            strokeDasharray="3 3"
                            fillOpacity={1} 
                            fill="url(#colorAssets)" 
                            animationDuration={1500}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="liabilities" 
                            name="liabilities"
                            stroke="#059669" 
                            strokeWidth={1}
                            strokeDasharray="3 3"
                            fillOpacity={1} 
                            fill="url(#colorLiabilities)" 
                            animationDuration={1500}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="netWorth" 
                            name="netWorth"
                            stroke="#EDEDED" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorNet)" 
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-wabi-stone text-xs italic gap-4">
                    <div className="w-12 h-12 rounded-full border border-dashed border-wabi-accent/30 flex items-center justify-center">
                        <TrendingUp size={20} className="opacity-20" />
                    </div>
                    <span>尚無足夠數據生成走勢圖表</span>
                </div>
            )}
        </div>
      </motion.div>

      {/* Investment Analysis Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-wabi-paper p-5 rounded-3xl border border-wabi-accent/10 shadow-sm space-y-6"
      >
        <div className="flex justify-between items-end">
            <div className="space-y-0.5">
                <p className="text-[10px] text-wabi-stone uppercase tracking-widest">Investment Performance / 投資成本與損益推移</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl font-serif text-wabi-ink tabular-nums">
                    {formatCurrency(performanceData.length > 0 ? performanceData[performanceData.length - 1].profit : 0)}
                  </p>
                  <span className={`text-[10px] font-bold ${(performanceData.length > 0 && performanceData[performanceData.length - 1].profit >= 0) ? 'text-wabi-up' : 'text-red-500'}`}>
                    {performanceData.length > 0 ? (performanceData[performanceData.length - 1].profitPct.toFixed(2) + '%') : '0.00%'}
                  </span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-wabi-stone bg-opacity-30" />
                  <span className="text-[8px] text-wabi-stone uppercase tracking-tighter">Cost</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-wabi-ink" />
                  <span className="text-[8px] text-wabi-stone uppercase tracking-tighter">Market Value</span>
                </div>
            </div>
        </div>

        <div className="h-[220px] w-full">
            {performanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={performanceData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 9, fill: '#7A7A7A' }}
                            dy={10}
                        />
                        <YAxis hide={true} />
                        <Tooltip 
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-wabi-paper p-3 border border-wabi-accent/10 rounded-2xl shadow-xl space-y-2">
                                            <p className="text-[10px] text-wabi-stone font-medium mb-1">{label}</p>
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="text-[10px] text-wabi-stone uppercase tracking-tighter">投資成本</span>
                                                    <span className="text-[10px] font-medium text-wabi-ink tabular-nums">{formatCurrency(data.cost)}</span>
                                                </div>
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="text-[10px] text-wabi-stone uppercase tracking-tighter">市場價值</span>
                                                    <span className="text-[10px] font-medium text-wabi-ink tabular-nums">{formatCurrency(data.value)}</span>
                                                </div>
                                                <div className="pt-1 border-t border-wabi-bg flex items-center justify-between gap-4">
                                                    <span className="text-[10px] font-bold text-wabi-ink uppercase tracking-tighter">累積損益</span>
                                                    <span className={`text-[10px] font-bold tabular-nums ${data.profit >= 0 ? 'text-wabi-up' : 'text-red-500'}`}>
                                                        {formatCurrency(data.profit)} ({data.profitPct.toFixed(2)}%)
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="cost" 
                            fill="#EDEDED" 
                            fillOpacity={0.4}
                            stroke="#D1D1D1" 
                            strokeWidth={1}
                            strokeDasharray="4 4"
                        />
                        <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#1A1A1A" 
                            strokeWidth={2} 
                            dot={{ r: 2, fill: "#1A1A1A" }}
                            activeDot={{ r: 4 }}
                        />
                        <Bar 
                          dataKey="profit" 
                          fillOpacity={0.3}
                        >
                          {performanceData.map((entry, index) => (
                            <Cell key={`profit-cell-${index}`} fill={entry.profit >= 0 ? "#059669" : "#E11D48"} />
                          ))}
                        </Bar>
                    </ComposedChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-wabi-stone text-xs italic gap-4">
                    <div className="w-12 h-12 rounded-full border border-dashed border-wabi-accent/30 flex items-center justify-center">
                        <Activity size={20} className="opacity-20" />
                    </div>
                    <span>尚無投資部位數據進行分析</span>
                </div>
            )}
        </div>
      </motion.div>

      {/* Allocation Breakdown */}
      <div className="grid grid-cols-1 gap-6 pb-4">
          <div className="bg-wabi-paper p-6 rounded-3xl border border-wabi-accent/10 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
                <p className="text-[10px] text-wabi-stone uppercase tracking-widest">Allocation / 資產配置比重</p>
                <span className="text-[10px] font-serif text-wabi-ink">Portfolio Breakdown</span>
            </div>
            
            <div className="flex items-center gap-6">
                <div className="w-[110px] h-[110px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={allocationData}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={50}
                                paddingAngle={4}
                                dataKey="value"
                                animationDuration={1000}
                            >
                                {allocationData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-3">
                    {allocationData.length > 0 ? (
                        allocationData.map((d, i) => {
                            const percentage = totalAllocationValue > 0 ? ((d.value / totalAllocationValue) * 100).toFixed(1) : '0';
                            return (
                                <div key={d.name} className="flex items-center justify-between border-b border-wabi-bg pb-1.5 last:border-0 last:pb-0">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-wabi-stone uppercase tracking-wider font-medium">
                                                {categoryLabels[d.name] || d.name}
                                            </span>
                                            <span className="text-[8px] text-wabi-accent font-bold tabular-nums">{percentage}%</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-medium text-wabi-ink tabular-nums">{formatCurrency(d.value)}</span>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-[10px] text-wabi-stone italic">尚無資產資料</p>
                    )}
                </div>
            </div>
          </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'motion/react';
import { X, Save, Calculator, Landmark, Plus, ChevronUp, ChevronDown, RefreshCw, TrendingUp, TrendingDown, Trash2, GripVertical } from 'lucide-react';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { INSTITUTIONS, ProjectItem, DEFAULT_ASSETS, DEFAULT_LIABILITIES, DEFAULT_INVESTMENTS } from '../constants';
import { Asset, Liability, Investment } from '../types';
import { getExchangeRate } from '../lib/exchangeRate';

interface BatchEntryProps {
  onClose: () => void;
  initialItems?: (Asset | Liability | Investment)[];
  isClone?: boolean;
}

// Internal component for Draggable items with restricted handle
const BankItem: React.FC<{
  item: ProjectItem;
  instIdx: number;
  itemIdx: number;
  totalItems: number;
  amounts: { [key: string]: string };
  currencies: { [key: string]: string };
  exchangeRates: { [key: string]: string };
  investmentData: { [key: string]: { shares: string, price: string, cost?: string } };
  marketPrices: Record<string, number>;
  confirmingDelete: { instIdx: number, itemId: string } | null;
  fetchingRates: Record<string, boolean>;
  handleAmountChange: (id: string, value: string) => void;
  handleCurrencyChange: (id: string, value: string) => void;
  handleExchangeRateChange: (id: string, value: string) => void;
  handleInvestmentChange: (id: string, field: 'shares' | 'price' | 'cost', value: string) => void;
  handleDeleteItem: (instIdx: number, itemId: string) => void;
  onMove: (idx: number, direction: 'up' | 'down') => void;
  calculatePL: (item: ProjectItem) => { profit: number, percent: number } | null;
}> = ({ 
  item, 
  instIdx, 
  itemIdx,
  totalItems,
  amounts, 
  currencies,
  exchangeRates,
  investmentData, 
  marketPrices, 
  confirmingDelete, 
  handleAmountChange, 
  handleCurrencyChange,
  handleInvestmentChange, 
  handleDeleteItem,
  onMove,
  calculatePL,
  handleExchangeRateChange,
  fetchingRates
}) => {
  const pl = item.type === 'investment' ? calculatePL(item) : null;
  const currentCurrency = currencies[item.id] || item.currency || 'TWD';
  const currentExRate = exchangeRates[item.id] || (item as any).exchangeRate?.toString() || '1';
  const isFetchingRate = fetchingRates[item.id];

  return (
    <motion.div 
      layout
      className="group/item space-y-2 pb-2 border-b border-wabi-accent/5 last:border-0 last:pb-0 bg-transparent relative"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div className="flex items-center gap-3 min-w-0">
          {/* SORT BUTTONS - NEW REPLACEMENT FOR DRAG HANDLE */}
          <div className="flex flex-col gap-0.5 sm:opacity-40 group-hover/item:opacity-100 transition-opacity">
            <button 
              disabled={itemIdx === 0}
              onClick={() => onMove(itemIdx, 'up')}
              className="p-1 text-wabi-stone hover:text-wabi-ink disabled:opacity-10 transition-colors"
            >
              <ChevronUp size={14} />
            </button>
            <button 
              disabled={itemIdx === totalItems - 1}
              onClick={() => onMove(itemIdx, 'down')}
              className="p-1 text-wabi-stone hover:text-wabi-ink disabled:opacity-10 transition-colors"
            >
              <ChevronDown size={14} />
            </button>
          </div>
          
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDeleteItem(instIdx, item.id);
            }}
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all z-20 gap-2 ${
              confirmingDelete?.itemId === item.id 
                ? 'bg-rose-900/80 text-white w-auto px-4 ring-1 ring-rose-500/50' 
                : 'text-rose-400/40 hover:text-wabi-up hover:bg-wabi-up/10'
            }`}
          >
            <Trash2 size={confirmingDelete?.itemId === item.id ? 14 : 16} />
            {confirmingDelete?.itemId === item.id && (
              <span className="text-[10px] font-bold">確定移除？</span>
            )}
          </button>
          <div className="min-w-0">
            <p className="text-sm font-medium text-wabi-ink truncate">{item.name}</p>
            <div className="flex items-center gap-2">
              <p className="text-[9px] text-wabi-stone uppercase tracking-widest">
                {item.symbol || (
                  item.category === 'saving' ? '資產' : 
                  item.category === 'foreign' ? '外幣資產' : 
                  item.category === 'card' ? '卡費' : 
                  item.category === 'loan' ? '負債' : 
                  (item.type === 'asset' ? '資產' : '負債')
                )}
              </p>
              {(item.category === 'foreign' || item.type === 'investment') && (
                <div className="flex bg-wabi-bg rounded-md p-0.5 border border-wabi-accent/5">
                  {['TWD', 'USD', 'JPY', 'EUR'].map((curr) => (
                    <button
                      key={curr}
                      onClick={() => handleCurrencyChange(item.id, curr)}
                      className={`px-1.5 py-0.5 text-[8px] font-bold rounded ${currentCurrency === curr ? 'bg-wabi-ink text-white shadow-sm' : 'text-wabi-stone hover:text-wabi-ink'}`}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1">
            {item.type !== 'investment' ? (
              <div className="relative flex items-center gap-2">
                <input
                  type="number"
                  placeholder="0"
                  value={amounts[item.id] || ''}
                  onChange={e => handleAmountChange(item.id, e.target.value)}
                  className={`w-full sm:w-32 bg-transparent py-1 text-right font-serif text-lg text-wabi-ink focus:border-wabi-ink outline-none transition-colors tabular-nums border-b border-white/5`}
                />
                <span className="text-[10px] text-wabi-stone w-8 text-left">{currentCurrency}</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 flex-grow sm:flex-grow-0 sm:flex sm:items-center sm:gap-4">
                <div className="w-full sm:w-16">
                  <p className="text-[8px] text-wabi-stone uppercase text-right">股數</p>
                  <input
                    type="number"
                    placeholder="0"
                    value={investmentData[item.id]?.shares || ''}
                    onChange={e => handleInvestmentChange(item.id, 'shares', e.target.value)}
                    className="w-full bg-transparent py-1 text-right font-serif text-sm text-wabi-ink outline-none"
                  />
                </div>
                <div className="w-full sm:w-20">
                  <p className="text-[8px] text-wabi-stone uppercase text-right">成本</p>
                  <input
                    type="number"
                    placeholder="0"
                    value={investmentData[item.id]?.cost || ''}
                    onChange={e => handleInvestmentChange(item.id, 'cost', e.target.value)}
                    className="w-full bg-transparent py-1 text-right font-serif text-sm text-wabi-ink outline-none"
                  />
                </div>
                <div className="w-full sm:w-20">
                  <p className="text-[8px] text-wabi-stone uppercase text-right mx-1">市價({currentCurrency})</p>
                  <input
                    type="number"
                    placeholder="0"
                    value={investmentData[item.id]?.price || ''}
                    onChange={e => handleInvestmentChange(item.id, 'price', e.target.value)}
                    className={`w-full bg-transparent py-1 text-right font-serif text-sm outline-none transition-colors ${item.symbol && marketPrices[item.symbol] ? 'text-wabi-accent font-bold' : 'text-wabi-ink'}`}
                  />
                </div>
              </div>
            )}
          </div>
          
          {currentCurrency !== 'TWD' && (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[8px] text-wabi-stone uppercase tracking-widest flex items-center gap-1">
                  匯率 Rate
                  {isFetchingRate && <RefreshCw size={8} className="animate-spin" />}
                </span>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="1.0"
                  value={currentExRate}
                  onChange={e => handleExchangeRateChange(item.id, e.target.value)}
                  className={`w-16 bg-wabi-bg px-2 py-0.5 text-right font-serif text-[10px] text-wabi-ink border-b border-wabi-accent/30 focus:border-wabi-ink outline-none transition-opacity ${isFetchingRate ? 'opacity-50' : 'opacity-100'}`}
                />
              </div>
              <p className="text-[10px] text-wabi-accent font-medium tabular-nums">
                ≈ {new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(
                  (item.type === 'investment' 
                    ? (Number(investmentData[item.id]?.shares || 0) * Number(investmentData[item.id]?.price || 0))
                    : Number(amounts[item.id] || 0)) * Number(currentExRate)
                )}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {pl && (
        <div className="flex items-center justify-end gap-2 text-[10px]">
          <span className="text-wabi-stone">本期損益:</span>
          <div className={`flex items-center gap-1 font-medium ${pl.profit >= 0 ? 'text-wabi-up' : 'text-wabi-down'}`}>
            {pl.profit >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            <span>${Math.abs(pl.profit).toLocaleString()}</span>
            <span className="opacity-60">({pl.percent.toFixed(2)}%)</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export const BatchEntry: React.FC<BatchEntryProps> = ({ onClose, initialItems, isClone }) => {
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [hasLoadedTemplates, setHasLoadedTemplates] = useState(false);
  
  const isEditing = !!initialItems;
  
  // Track amounts and investment details
  const [amounts, setAmounts] = useState<{ [key: string]: string }>({});
  const [currencies, setCurrencies] = useState<{ [key: string]: string }>({});
  const [exchangeRates, setExchangeRates] = useState<{ [key: string]: string }>({});
  const [investmentData, setInvestmentData] = useState<{ [key: string]: { shares: string, price: string, cost?: string } }>({});
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [fetchingRates, setFetchingRates] = useState<Record<string, boolean>>({});
  const [isFetching, setIsFetching] = useState(false);
  const [currentInstIndex, setCurrentInstIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState(0);
  const tabsRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll active tab into view
  useEffect(() => {
    if (tabsRef.current) {
      const activeTab = tabsRef.current.children[currentInstIndex] as HTMLElement;
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentInstIndex]);

  // UI state for adding items
  const [addingToInstId, setAddingToInstId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<{instIdx: number, itemId: string} | null>(null);
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [confirmingBankDelete, setConfirmingBankDelete] = useState<number | null>(null);
  const [newBankName, setNewBankName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemSymbol, setNewItemSymbol] = useState('');
  const [newItemType, setNewItemType] = useState<'asset' | 'foreign_asset' | 'card' | 'liability' | 'investment'>('asset');

  // Load persistence templates and merge with initialItems if editing
  useEffect(() => {
    const normalizeBankName = (name: string) => {
      if (name === '台新' || name === '台新銀行') return '台新銀行';
      return name;
    };

    const fetchTemplatesAndInitial = async () => {
      if (!auth.currentUser) return;
      
      let baseInstitutions = [...INSTITUTIONS];
      try {
        const docSnap = await getDoc(doc(db, `users/${auth.currentUser.uid}/settings`, 'templates'));
        if (docSnap.exists() && docSnap.data().institutions) {
          const storedInsts = docSnap.data().institutions;
          // Merge missing defaults from constants (e.g. newly added "中鋼持股信託" or new items)
          const updatedStoredInsts = storedInsts.map((sInst: any) => {
            // Remove requested items: 兆豐存款, 台新證卷 and 中鋼持股信託's 投資項目/負債
            if (sInst.name === '兆豐銀行') {
              sInst.items = (sInst.items || []).filter((i: any) => i.name !== '兆豐存款');
            }
            if (sInst.name === '台新銀行') {
              sInst.items = (sInst.items || []).filter((i: any) => i.name !== '台新證卷');
            }
            if (sInst.name === '中鋼持股信託') {
              sInst.items = (sInst.items || []).filter((i: any) => i.name !== '投資項目' && i.type !== 'liability');
            }

            const defaultInst = INSTITUTIONS.find(d => d.id === sInst.id);
            // Deduplicate existing items by ID first
            const existingIds = new Set();
            const uniqueExistingItems = (sInst.items || []).filter((i: any) => {
              if (!i.id || existingIds.has(i.id)) return false;
              existingIds.add(i.id);
              return true;
            });
            sInst.items = uniqueExistingItems;

            const sItemIds = new Set(sInst.items.map((i: any) => i.id));
            const sItemNames = new Set(sInst.items.map((i: any) => i.name.trim()));
            if (defaultInst) {
              const missingItems = defaultInst.items.filter(i => !sItemIds.has(i.id) && !sItemNames.has(i.name.trim()));
              if (missingItems.length > 0) {
                return { ...sInst, items: [...uniqueExistingItems, ...missingItems] };
              }
            }
            return { ...sInst, items: uniqueExistingItems };
          });

          const storedIds = new Set(updatedStoredInsts.map((inst: any) => inst.id));
          const newFromDefaults = INSTITUTIONS.filter(inst => !storedIds.has(inst.id));
          
          if (newFromDefaults.length > 0) {
            // Find "股票與投資" or similar to place it after
            const investIdx = updatedStoredInsts.findIndex((inst: any) => inst.name.includes('投資') || inst.name.includes('股票'));
            if (investIdx !== -1) {
              baseInstitutions = [
                ...updatedStoredInsts.slice(0, investIdx + 1),
                ...newFromDefaults,
                ...updatedStoredInsts.slice(investIdx + 1)
              ];
            } else {
              baseInstitutions = [...updatedStoredInsts, ...newFromDefaults];
            }
          } else {
            baseInstitutions = updatedStoredInsts;
          }

          // Final safety deduplication of institutions by ID and items within them
          const finalInstIds = new Set();
          baseInstitutions = baseInstitutions.filter(inst => {
            if (finalInstIds.has(inst.id)) return false;
            finalInstIds.add(inst.id);

            // Deduplicate items within this institution
            const seenItemIds = new Set();
            const seenItemNames = new Set();
            inst.items = inst.items.filter((item: any) => {
              const nameKey = item.name.trim();
              if (seenItemIds.has(item.id) || seenItemNames.has(nameKey)) return false;
              seenItemIds.add(item.id);
              seenItemNames.add(nameKey);
              return true;
            });

            return true;
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${auth.currentUser.uid}/settings/templates`);
      }

      if (initialItems && initialItems.length > 0) {
        const newAmounts: Record<string, string> = { ...amounts };
        const newCurrencies: Record<string, string> = { ...currencies };
        const newExRates: Record<string, string> = { ...exchangeRates };
        const newInvest: Record<string, any> = { ...investmentData };
        
        const firstItem = initialItems[0];
        const timestamp = firstItem.updatedAt;
        const targetDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        setDate(targetDate.toISOString().split('T')[0]);

        // Group initial items by bank
        const groupedBatchItems: Record<string, (Asset | Liability | Investment)[]> = {};
        initialItems.forEach(item => {
          const bankName = normalizeBankName((item as any).bank || '其他');
          if (!groupedBatchItems[bankName]) groupedBatchItems[bankName] = [];
          groupedBatchItems[bankName].push(item);
          
          if (item.type === 'investment') {
            newInvest[item.id] = {
              shares: (item as any).shares?.toString() || '',
              price: (item as any).marketPrice?.toString() || '',
              cost: (item as any).avgCost?.toString() || ''
            };
            newCurrencies[item.id] = (item as any).currency || 'TWD';
            newExRates[item.id] = (item as any).exchangeRate?.toString() || '1';
          } else {
            newAmounts[item.id] = item.amount?.toString() || '';
            newCurrencies[item.id] = (item as any).currency || 'TWD';
            newExRates[item.id] = (item as any).exchangeRate?.toString() || '1';
          }
        });

        // Merge initial items into base institutions
        const mergedInstitutions = baseInstitutions.map(inst => ({
          ...inst,
          items: [...inst.items]
        }));
        
        Object.entries(groupedBatchItems).forEach(([bankName, batchItems]) => {
          let existingInst = mergedInstitutions.find(inst => normalizeBankName(inst.name) === bankName);
          
          const batchProjectItems: ProjectItem[] = batchItems.map(item => ({
            id: item.id,
            name: item.name,
            bank: bankName,
            category: (item as any).category,
            type: item.type as any,
            symbol: (item as any).symbol,
            currency: (item as any).currency || 'TWD'
          }));

          if (existingInst) {
            // Deduplicate batch items by ID (first) then by name to ensure clean merge
            const seenIds = new Set();
            const uniqueBatchItems = batchProjectItems.filter(bi => {
              if (seenIds.has(bi.id)) return false;
              seenIds.add(bi.id);
              return true;
            });

            // Replace matching template items with batch items (matching by name)
            existingInst.items = existingInst.items.map(templateItem => {
              const matchedBatchItem = uniqueBatchItems.find(bi => bi.name.trim() === templateItem.name.trim());
              return matchedBatchItem || templateItem;
            });

            // Add batch items that weren't in the template (by name or ID)
            const templateItemNames = new Set(existingInst.items.map(ti => ti.name.trim()));
            const templateItemIds = new Set(existingInst.items.map(ti => ti.id));
            
            uniqueBatchItems.forEach(bi => {
              if (!templateItemNames.has(bi.name.trim()) && !templateItemIds.has(bi.id)) {
                existingInst!.items.push(bi);
              }
            });
          } else {
            // New bank from historical data
            mergedInstitutions.push({
              id: `inst-${bankName}`,
              name: bankName,
              items: batchProjectItems
            });
          }
        });

        // Initialize empty states for template items that weren't in this specific batch
        mergedInstitutions.forEach(inst => {
          inst.items.forEach(item => {
            if (newCurrencies[item.id] === undefined) {
              newCurrencies[item.id] = item.currency || (item.category === 'foreign' ? 'USD' : 'TWD');
            }
            if (newExRates[item.id] === undefined) {
              newExRates[item.id] = (item as any).exchangeRate?.toString() || '1';
            }
            if (newAmounts[item.id] === undefined) newAmounts[item.id] = '';
            if (item.type === 'investment' && newInvest[item.id] === undefined) {
              newInvest[item.id] = { shares: '', price: '', cost: '' };
            }
          });
        });

        setInstitutions(mergedInstitutions);
        setAmounts(newAmounts);
        setCurrencies(newCurrencies);
        setExchangeRates(newExRates);
        setInvestmentData(newInvest);
      } else {
        setInstitutions(baseInstitutions);
      }
      
      setHasLoadedTemplates(true);
    };

    fetchTemplatesAndInitial();
  }, [initialItems]);

  // Sync state initialization
  useEffect(() => {
    if (!hasLoadedTemplates || isEditing) return;
    
    const initialAmounts: Record<string, string> = { ...amounts };
    const initialCurrencies: Record<string, string> = { ...currencies };
    const initialExRates: Record<string, string> = { ...exchangeRates };
    const initialInvest: Record<string, any> = { ...investmentData };
    
    institutions.forEach(inst => {
      inst.items.forEach(item => {
        if (initialAmounts[item.id] === undefined) initialAmounts[item.id] = '';
        if (initialCurrencies[item.id] === undefined) initialCurrencies[item.id] = item.currency || (item.category === 'foreign' ? 'USD' : 'TWD');
        if (initialExRates[item.id] === undefined) initialExRates[item.id] = (item as any).exchangeRate?.toString() || '1';
        if (item.type === 'investment' && initialInvest[item.id] === undefined) {
          initialInvest[item.id] = { shares: '', price: '', cost: '' };
        }
      });
    });
    
    setAmounts(initialAmounts);
    setCurrencies(initialCurrencies);
    setExchangeRates(initialExRates);
    setInvestmentData(initialInvest);
  }, [institutions, hasLoadedTemplates]);

  const saveTemplates = async (newInsts: any[]) => {
    if (!auth.currentUser) return;
    try {
      // Firestore does not support undefined values, sanitize the objects
      const sanitizedInsts = JSON.parse(JSON.stringify(newInsts));
      
      await setDoc(doc(db, `users/${auth.currentUser.uid}/settings`, 'templates'), {
        institutions: sanitizedInsts,
        updatedAt: new Date()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${auth.currentUser.uid}/settings/templates`);
    }
  };

  const fetchPrices = async () => {
    setIsFetching(true);
    try {
      const symbols = Array.from(new Set(
        institutions.flatMap(inst => 
          inst.items.filter(item => item.type === 'investment' && item.symbol)
          .map(item => item.symbol!)
        )
      )).join(',');

      const response = await fetch(`/api/prices?symbols=${encodeURIComponent(symbols)}`);
      const data = await response.json();
      const priceMap: Record<string, number> = {};
      data.forEach((item: any) => {
        priceMap[item.Code] = parseFloat(item.ClosingPrice);
      });
      setMarketPrices(prev => ({ ...prev, ...priceMap }));
      
      const newInvestData = { ...investmentData };
      institutions.forEach(inst => {
        inst.items.forEach(item => {
          if (item.type === 'investment' && item.symbol && priceMap[item.symbol]) {
            newInvestData[item.id] = {
              ...newInvestData[item.id],
              price: priceMap[item.symbol].toString()
            };
          }
        });
      });
      setInvestmentData(newInvestData);
    } catch (err: any) {
      console.error('Fetch error:', err);
      // More informative alert for the user if it's a network error
      if (err instanceof Error && err.message === 'Failed to fetch') {
        alert('網路連線或是伺服器暫時無法回應，請稍後再試。 (Network/Fetch Error)');
      }
    } finally {
      setIsFetching(false);
    }
  };

  const handleAmountChange = (id: string, value: string) => {
    setAmounts(prev => ({ ...prev, [id]: value }));
  };

  const handleCurrencyChange = async (id: string, value: string) => {
    setCurrencies(prev => ({ ...prev, [id]: value }));
    
    // Automatically fetch exchange rate
    if (value === 'TWD') {
      setExchangeRates(prev => ({ ...prev, [id]: '1' }));
    } else {
      setFetchingRates(prev => ({ ...prev, [id]: true }));
      try {
        const rate = await getExchangeRate(value, 'TWD');
        setExchangeRates(prev => ({ ...prev, [id]: rate.toString() }));
      } catch (err) {
        console.error('Failed to fetch rate for batch item:', err);
      } finally {
        setFetchingRates(prev => ({ ...prev, [id]: false }));
      }
    }
  };

  const handleExchangeRateChange = (id: string, value: string) => {
    setExchangeRates(prev => ({ ...prev, [id]: value }));
  };

  const handleInvestmentChange = (id: string, field: 'shares' | 'price' | 'cost', value: string) => {
    setInvestmentData(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleAddItem = (instId: string) => {
    const inst = institutions.find(i => i.id === instId);
    setAddingToInstId(instId);
    setNewItemName('');
    setNewItemSymbol('');
    
    // Strict typing: if it's a known investment institution, force investment.
    // Otherwise force asset/liability options.
    const isInvest = inst?.name.includes('投資') || inst?.name.includes('股票') || inst?.name.includes('證券') || inst?.name.includes('中鋼持股信託');
    setNewItemType(isInvest ? 'investment' : 'asset');
  };

  const confirmAddItem = (instId: string) => {
    if (!newItemName.trim()) {
      setAddingToInstId(null);
      return;
    }

    const instIdx = institutions.findIndex(i => i.id === instId);
    if (instIdx === -1) return;

    const newItem: ProjectItem = {
      id: "item-" + Math.random().toString(36).substr(2, 9),
      name: newItemName.trim(),
      bank: institutions[instIdx].name,
      category: 
        newItemType === 'asset' ? 'saving' : 
        newItemType === 'foreign_asset' ? 'foreign' :
        newItemType === 'investment' ? 'stock' : 
        newItemType === 'card' ? 'card' : 'loan',
      type: (newItemType === 'investment' ? 'investment' : 
             (newItemType === 'asset' || newItemType === 'foreign_asset' ? 'asset' : 'liability')) as any,
      currency: newItemType === 'foreign_asset' ? 'USD' : 'TWD'
    };

    if (newItemType === 'investment' && newItemSymbol.trim()) {
      newItem.symbol = newItemSymbol.trim();
    }

    const newInsts = [...institutions];
    const targetInst = { ...newInsts[instIdx] };
    targetInst.items = [...targetInst.items, newItem];
    newInsts[instIdx] = targetInst;
    
    setInstitutions(newInsts);
    saveTemplates(newInsts);
    
    setAddingToInstId(null);
    setNewItemName('');
    setNewItemSymbol('');
  };

  const confirmAddBank = () => {
    if (!newBankName.trim()) {
      setIsAddingBank(false);
      return;
    }
    
    const newInst = {
      id: 'inst-' + Math.random().toString(36).substr(2, 5),
      name: newBankName.trim(),
      items: [] as ProjectItem[]
    };
    const newInsts = [...institutions, newInst];
    setInstitutions(newInsts);
    saveTemplates(newInsts);
    
    setIsAddingBank(false);
    setNewBankName('');
  };

  const handleDeleteItem = (instIdx: number, itemId: string) => {
    // If we haven't clicked once yet, enter confirmation mode
    if (confirmingDelete?.itemId !== itemId) {
      setConfirmingDelete({ instIdx, itemId });
      // Reset after 3 seconds if no action
      setTimeout(() => setConfirmingDelete(prev => prev?.itemId === itemId ? null : prev), 3000);
      return;
    }

    const newInsts = [...institutions];
    const targetInst = { ...newInsts[instIdx] };
    targetInst.items = targetInst.items.filter(i => i.id !== itemId);
    newInsts[instIdx] = targetInst;
    
    setInstitutions(newInsts);
    saveTemplates(newInsts);
    setConfirmingDelete(null);
  };

  const handleDeleteBank = (instIdx: number) => {
    const instName = institutions[instIdx].name;
    if (instName === '股票與投資' || instName === '中鋼持股信託') {
      return;
    }

    if (confirmingBankDelete !== instIdx) {
      setConfirmingBankDelete(instIdx);
      setTimeout(() => setConfirmingBankDelete(prev => prev === instIdx ? null : prev), 3000);
      return;
    }

    const newInsts = [...institutions];
    newInsts.splice(instIdx, 1);
    setInstitutions(newInsts);
    saveTemplates(newInsts);
    setConfirmingBankDelete(null);
  };

  const handleReorderItems = (instIdx: number, newItems: ProjectItem[]) => {
    const newInsts = [...institutions];
    newInsts[instIdx] = { ...newInsts[instIdx], items: newItems };
    setInstitutions(newInsts);
    saveTemplates(newInsts);
  };


  const moveInst = (idx: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= institutions.length) return;
    
    const newInsts = [...institutions];
    const [moved] = newInsts.splice(idx, 1);
    newInsts.splice(newIdx, 0, moved);
    setInstitutions(newInsts);
    saveTemplates(newInsts);

    // Adjust current index if the active page was moved
    if (idx === currentInstIndex) {
      setCurrentInstIndex(newIdx);
    } else if (newIdx === currentInstIndex) {
      setCurrentInstIndex(idx);
    }
  };

  const moveItemInInst = (instIdx: number, itemIdx: number, direction: 'up' | 'down') => {
    const items = institutions[instIdx].items;
    const newIdx = direction === 'up' ? itemIdx - 1 : itemIdx + 1;
    if (newIdx < 0 || newIdx >= items.length) return;

    const newItems = [...items];
    const [moved] = newItems.splice(itemIdx, 1);
    newItems.splice(newIdx, 0, moved);
    
    handleReorderItems(instIdx, newItems);
  };

  const handleNextPage = () => {
    if (currentInstIndex < institutions.length - 1) {
      setSwipeDirection(1);
      setCurrentInstIndex(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentInstIndex > 0) {
      setSwipeDirection(-1);
      setCurrentInstIndex(prev => prev - 1);
    }
  };

  const calculatePL = (item: ProjectItem) => {
    const data = investmentData[item.id];
    if (!data || !data.shares || !data.price || !data.cost) return null;
    const shares = Number(data.shares);
    const price = Number(data.price);
    const cost = Number(data.cost);
    if (isNaN(shares) || isNaN(price) || isNaN(shares) || isNaN(cost) || cost === 0) return null;
    
    const profit = (price - cost) * shares;
    return {
      profit,
      percent: ((price - cost) / cost) * 100
    };
  };

  const handleSaveAll = async () => {
    if (!auth.currentUser) return;
    
    const allItems = institutions.flatMap(inst => inst.items);
    const activeEntries = allItems.filter(item => {
      if (item.type === 'investment') {
        const data = investmentData[item.id];
        return data?.shares && data?.price;
      }
      return amounts[item.id] !== '' && !isNaN(Number(amounts[item.id]));
    });

    if (activeEntries.length === 0) {
      alert('請至少輸入一項有效金額');
      return;
    }

    setLoading(true);
    try {
      const timestamp = new Date(date);

      // If editing, find out which items were removed to delete them
      if (isEditing && initialItems) {
        const currentActiveIds = new Set(activeEntries.map(e => e.id));
        const removedItems = initialItems.filter(item => !currentActiveIds.has(item.id));
        
        const deletePromises = removedItems.map(item => {
          let path = (item as any)._collection;
          if (!path) {
            if ('shares' in item) path = 'investments';
            else if (['loan', 'card', 'investment_payable'].includes((item as any).category)) path = 'liabilities';
            else path = 'assets';
          }
          return deleteDoc(doc(db, `users/${auth.currentUser!.uid}/${path}`, item.id));
        });
        await Promise.all(deletePromises);
      }

      const savePromises = activeEntries.map((item) => {
        let collectionPath = '';
        const payload: any = {
          userId: auth.currentUser!.uid,
          name: item.name,
          category: item.category,
          updatedAt: timestamp,
          type: item.type,
        };

        const itemCurrency = currencies[item.id] || item.currency || 'TWD';
        const itemExchangeRate = Number(exchangeRates[item.id]) || 1;

        if (item.type === 'asset') {
          collectionPath = `users/${auth.currentUser!.uid}/assets`;
          payload.amount = Number(amounts[item.id]);
          payload.bank = item.bank || '其他';
          payload.currency = itemCurrency;
          payload.exchangeRate = itemExchangeRate; 
        } else if (item.type === 'liability') {
          collectionPath = `users/${auth.currentUser!.uid}/liabilities`;
          payload.amount = Number(amounts[item.id]);
          payload.bank = item.bank || '其他';
        } else if (item.type === 'investment') {
          collectionPath = `users/${auth.currentUser!.uid}/investments`;
          payload.shares = Number(investmentData[item.id].shares);
          payload.marketPrice = Number(investmentData[item.id].price);
          payload.avgCost = Number(investmentData[item.id].cost || 0);
          payload.symbol = item.symbol || '';
          payload.amount = payload.shares * payload.marketPrice;
          payload.currency = itemCurrency; 
          payload.exchangeRate = itemExchangeRate;
          payload.bank = item.bank || '其他';
        }

        // If it's an existing item (id doesn't start with 'item-'), update it
        // Or if we are in edit mode and it was one of the initial items
        const isExisting = !isClone && isEditing && initialItems?.some(ii => ii.id === item.id);
        
        if (isExisting) {
          let path = (item as any)._collection;
          if (!path) {
            if (item.type === 'investment') path = 'investments';
            else if (item.type === 'liability') path = 'liabilities';
            else path = 'assets';
          }
          return setDoc(doc(db, `users/${auth.currentUser!.uid}/${path}`, item.id), payload);
        } else {
          return addDoc(collection(db, collectionPath), payload);
        }
      });

      await Promise.all(savePromises);
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'batch_entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-wabi-bg flex flex-col max-w-md mx-auto"
    >
      {/* Header */}
      <div className="px-6 pt-10 pb-4 bg-wabi-bg/95 backdrop-blur-md sticky top-0 z-50 border-b border-wabi-accent/5">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-0.5">
            <p className="text-[9px] text-wabi-stone tracking-[0.3em] uppercase">Step {currentInstIndex + 1} of {institutions.length}</p>
            <h2 className="text-xl font-serif text-wabi-ink">{isClone ? '從紀錄複製並新增' : (isEditing ? '編輯歷史紀錄' : '本期資料填報')}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-wabi-stone hover:bg-white/5 transition-colors border border-transparent hover:border-wabi-accent/20">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 space-y-0.5">
            <label className="text-[8px] text-wabi-stone uppercase tracking-widest block px-1">結算日期 Date</label>
            <input 
              type="date" 
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-wabi-paper border border-wabi-accent/20 rounded-xl px-3 py-2 text-[11px] text-wabi-ink focus:outline-none shadow-sm"
            />
          </div>
          <button 
            onClick={fetchPrices}
            disabled={isFetching}
            className="px-3 py-2 bg-wabi-paper rounded-xl text-wabi-ink border border-wabi-accent/5 flex items-center gap-1.5 hover:bg-white transition-colors disabled:opacity-50 mt-3"
          >
            <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
            <span className="text-[10px] font-bold">市價</span>
          </button>
        </div>

        {/* Bank Tabs Navigation */}
        <div 
          ref={tabsRef} 
          className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 -mx-2 px-2 scroll-smooth"
        >
          {institutions.map((inst, i) => (
            <div
              key={inst.id}
              className="flex-shrink-0"
            >
              <button
                onClick={() => {
                  if (i === currentInstIndex) return;
                  setSwipeDirection(i > currentInstIndex ? 1 : -1);
                  setCurrentInstIndex(i);
                }}
                className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all duration-300 pointer-events-auto cursor-pointer ${
                  i === currentInstIndex 
                    ? 'bg-wabi-ink text-wabi-bg shadow-sm ring-1 ring-wabi-ink' 
                    : 'bg-wabi-paper text-wabi-stone border border-wabi-accent/10 hover:bg-wabi-accent/20'
                }`}
              >
                {inst.name}
              </button>
            </div>
          ))}
          <div className="flex-shrink-0">
            <button 
              onClick={() => setIsAddingBank(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-wabi-stone bg-wabi-paper hover:bg-white transition-all border border-wabi-accent/5 border-dashed"
              title="新增分類"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Grouped Content - Paginated View */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence initial={false} custom={swipeDirection} mode="wait">
          {institutions.length > 0 && currentInstIndex < institutions.length && (
            <motion.div 
              key={institutions[currentInstIndex].id}
              custom={swipeDirection}
              initial={{ opacity: 0, x: swipeDirection * 150 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: swipeDirection * -150 }}
              transition={{ type: 'spring', damping: 30, stiffness: 400, mass: 0.8 }}
              className="absolute inset-0 overflow-y-auto px-6 py-6"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.05}
              onDragEnd={(e, info) => {
                if (info.offset.x > 80 && currentInstIndex > 0) {
                  handlePrevPage();
                } else if (info.offset.x < -80 && currentInstIndex < institutions.length - 1) {
                  handleNextPage();
                }
              }}
            >
              {(() => {
                const inst = institutions[currentInstIndex];
                const instIdx = currentInstIndex;
                return (
                  <div className="space-y-4 pb-32">
                    <div className="flex items-center justify-between group/title">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-1 sm:opacity-0 group-hover/title:opacity-100 transition-opacity">
                          <button onClick={() => moveInst(instIdx, 'up')} className="text-wabi-stone/30 hover:text-wabi-ink cursor-pointer">
                            <ChevronUp size={10} />
                          </button>
                          <button onClick={() => moveInst(instIdx, 'down')} className="text-wabi-stone/30 hover:text-wabi-ink cursor-pointer">
                            <ChevronDown size={10} />
                          </button>
                        </div>
                        <div className="border-l-2 border-wabi-ink pl-3">
                          <h3 className="text-base font-serif text-wabi-ink">{inst.name}</h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {inst.name !== '股票與投資' && inst.name !== '中鋼持股信託' && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBank(instIdx);
                            }}
                            className={`px-3 h-8 rounded-full flex items-center justify-center transition-all gap-2 ${
                              confirmingBankDelete === instIdx 
                                ? 'bg-rose-900/80 text-white w-auto ring-1 ring-rose-500/50 opacity-100' 
                                : 'text-rose-400/40 opacity-0 group-hover/title:opacity-100 hover:bg-wabi-up/10'
                            }`}
                          >
                            <Trash2 size={confirmingBankDelete === instIdx ? 12 : 14} />
                            {confirmingBankDelete === instIdx && <span className="text-[10px] font-bold">移除分類？</span>}
                          </button>
                        )}
                        <button 
                          onClick={() => handleAddItem(inst.id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-wabi-ink bg-wabi-paper shadow-sm border border-wabi-accent/20 hover:scale-110 active:scale-95 transition-all"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                      <div className="bg-wabi-paper/50 p-4 rounded-3xl border border-wabi-accent/10 shadow-sm min-h-[300px]">
                        {inst.items.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                            <div className="w-12 h-12 rounded-full bg-wabi-paper flex items-center justify-center text-wabi-stone/30">
                              <Landmark size={24} />
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-wabi-stone">尚未新增任何填報項目</p>
                              <button 
                                onClick={() => handleAddItem(inst.id)}
                                className="text-[10px] text-wabi-ink font-bold uppercase tracking-widest hover:underline"
                              >
                                立即新增第一個項目
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {inst.items.map((item, itemIdx) => (
                              <BankItem 
                                key={item.id} 
                                item={item} 
                                instIdx={instIdx}
                                itemIdx={itemIdx}
                                totalItems={inst.items.length}
                                amounts={amounts}
                                currencies={currencies}
                                exchangeRates={exchangeRates}
                                investmentData={investmentData}
                                marketPrices={marketPrices}
                                confirmingDelete={confirmingDelete}
                                handleAmountChange={handleAmountChange}
                                handleCurrencyChange={handleCurrencyChange}
                                handleExchangeRateChange={handleExchangeRateChange}
                                handleInvestmentChange={handleInvestmentChange}
                                handleDeleteItem={handleDeleteItem}
                                onMove={(idx, dir) => moveItemInInst(instIdx, idx, dir)}
                                calculatePL={calculatePL}
                                fetchingRates={fetchingRates}
                              />
                            ))}
                          </div>
                        )}

                      <AnimatePresence>
                        {addingToInstId === inst.id && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="pt-6 border-t border-wabi-accent/5 overflow-hidden"
                          >
                            <div className="space-y-4 bg-wabi-bg/30 p-4 rounded-2xl border border-wabi-accent/5">
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  {newItemType === 'investment' ? (
                                    <div className="col-span-2 py-3 text-[10px] uppercase tracking-widest rounded-xl border text-center bg-wabi-ink text-wabi-paper border-wabi-ink font-bold shadow-sm">
                                      新增投資項目 (美股/台股/基金)
                                    </div>
                                  ) : (
                                    <>
                                      <button 
                                        type="button"
                                        onClick={() => setNewItemType('asset')}
                                        className={`py-3 text-[10px] uppercase tracking-widest rounded-xl border transition-all ${newItemType === 'asset' ? 'bg-wabi-ink text-wabi-bg border-wabi-ink font-bold shadow-md' : 'bg-wabi-paper text-wabi-stone border-wabi-accent/10 hover:bg-wabi-accent/20'}`}
                                      >
                                        資產
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={() => setNewItemType('foreign_asset')}
                                        className={`py-3 text-[10px] uppercase tracking-widest rounded-xl border transition-all ${newItemType === 'foreign_asset' ? 'bg-wabi-ink text-wabi-bg border-wabi-ink font-bold shadow-md' : 'bg-wabi-paper text-wabi-stone border-wabi-accent/10 hover:bg-wabi-accent/20'}`}
                                      >
                                        外幣資產
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={() => setNewItemType('card')}
                                        className={`py-3 text-[10px] uppercase tracking-widest rounded-xl border transition-all ${newItemType === 'card' ? 'bg-wabi-ink text-wabi-bg border-wabi-ink font-bold shadow-md' : 'bg-wabi-paper text-wabi-stone border-wabi-accent/10 hover:bg-wabi-accent/20'}`}
                                      >
                                        卡費
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={() => setNewItemType('liability')}
                                        className={`py-3 text-[10px] uppercase tracking-widest rounded-xl border transition-all ${newItemType === 'liability' ? 'bg-wabi-ink text-wabi-bg border-wabi-ink font-bold shadow-md' : 'bg-wabi-paper text-wabi-stone border-wabi-accent/10 hover:bg-wabi-accent/20'}`}
                                      >
                                        負債
                                      </button>
                                    </>
                                  )}
                                </div>
                              
                              <div className="space-y-3">
                                <input 
                                  autoFocus
                                  placeholder="請輸入項目名稱 (如：薪資帳戶)"
                                  value={newItemName}
                                  onChange={e => setNewItemName(e.target.value)}
                                  className="w-full bg-wabi-paper px-4 py-2 text-xs rounded-xl border border-wabi-accent/20 outline-none text-wabi-ink"
                                />
                                {newItemType === 'investment' && (
                                  <input 
                                    placeholder="股票代碼 (如：2330)"
                                    value={newItemSymbol}
                                    onChange={e => setNewItemSymbol(e.target.value)}
                                    className="w-full bg-wabi-paper px-4 py-2 text-xs rounded-xl border border-wabi-accent/20 outline-none text-wabi-ink"
                                  />
                                )}
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => confirmAddItem(inst.id)}
                                    className="flex-1 bg-wabi-ink text-wabi-paper py-3 rounded-xl text-xs font-medium"
                                  >
                                    確認新增
                                  </button>
                                  <button 
                                    onClick={() => setAddingToInstId(null)}
                                    className="px-4 py-3 bg-wabi-paper text-wabi-stone rounded-xl text-xs font-medium"
                                  >
                                    取消
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Modals/Overlays inside content for z-index purposes */}
        <AnimatePresence>
          {isAddingBank && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-wabi-bg/95 flex items-center justify-center p-8 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-sm bg-wabi-paper rounded-[2rem] border border-wabi-accent/20 shadow-2xl p-8 space-y-6"
              >
                <div className="space-y-2">
                  <p className="text-[10px] text-wabi-stone uppercase tracking-[0.3em] font-semibold">New Group</p>
                  <h4 className="text-xl font-serif text-wabi-ink">新增機構 / 銀行分類</h4>
                </div>
                <input 
                  autoFocus
                  placeholder="如：渣打銀行、富邦證券..."
                  value={newBankName}
                  onChange={e => setNewBankName(e.target.value)}
                  className="w-full bg-wabi-bg px-6 py-4 rounded-2xl border border-wabi-accent/20 outline-none text-sm focus:border-wabi-ink text-wabi-ink transition-colors"
                  onKeyDown={e => e.key === 'Enter' && confirmAddBank()}
                />
                <div className="flex gap-3">
                  <button 
                    onClick={confirmAddBank}
                    className="flex-1 bg-wabi-ink text-white py-4 rounded-2xl text-xs font-semibold shadow-lg active:scale-95 transition-transform"
                  >
                    存入
                  </button>
                  <button 
                    onClick={() => setIsAddingBank(false)}
                    className="px-8 py-4 bg-wabi-paper text-wabi-stone rounded-2xl text-xs font-semibold hover:bg-white border border-wabi-accent/5 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      <div className="px-10 py-6 bg-gradient-to-t from-wabi-bg via-wabi-bg/90 to-transparent sticky bottom-0 z-20 flex flex-col items-center">
        <button
          disabled={loading}
          onClick={handleSaveAll}
          className="w-auto px-12 py-4 bg-wabi-ink text-wabi-bg rounded-full text-xs font-bold uppercase tracking-[0.2em] shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
        >
          {loading ? '儲存中...' : (isClone ? '確認複製並儲存' : (isEditing ? '更新此份紀錄' : '確認儲存全部'))}
        </button>
      </div>
    </motion.div>
  );
};

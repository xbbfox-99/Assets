import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, ChevronDown, RefreshCw } from 'lucide-react';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { DEFAULT_ASSETS, DEFAULT_LIABILITIES, DEFAULT_INVESTMENTS } from '../constants';
import { getExchangeRate } from '../lib/exchangeRate';

interface AddEntryProps {
  onClose: () => void;
  type: string;
}

export const AddEntry: React.FC<AddEntryProps> = ({ onClose, type }) => {
  const [loading, setLoading] = useState(false);
  
  const getTemplates = () => {
    if (type === 'asset') return DEFAULT_ASSETS;
    if (type === 'liability') return DEFAULT_LIABILITIES;
    return DEFAULT_INVESTMENTS;
  };

  const templates = getTemplates();
  
  const [formData, setFormData] = useState({
    name: templates[0]?.name || '',
    category: templates[0]?.category || 'saving',
    bank: (templates[0] as any)?.bank || '',
    amount: '',
    currency: 'TWD',
    exchangeRate: '1',
    symbol: (templates[0] as any)?.symbol || '',
    shares: '',
    price: '',
    updatedAt: new Date().toISOString().split('T')[0]
  });

  const [fetchingRate, setFetchingRate] = useState(false);

  useEffect(() => {
    const fetchRate = async () => {
      if (formData.currency === 'TWD') {
        setFormData(prev => ({ ...prev, exchangeRate: '1' }));
        return;
      }
      
      setFetchingRate(true);
      try {
        const rate = await getExchangeRate(formData.currency, 'TWD');
        setFormData(prev => ({ ...prev, exchangeRate: rate.toString() }));
      } catch (err) {
        console.error('Error fetching rate:', err);
      } finally {
        setFetchingRate(false);
      }
    };

    fetchRate();
  }, [formData.currency]);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = templates.find(t => t.name === e.target.value);
    if (selected) {
      setFormData({
        ...formData,
        name: selected.name,
        category: selected.category,
        bank: (selected as any).bank || '',
        symbol: (selected as any).symbol || '',
      });
    } else {
      setFormData({
        ...formData,
        name: e.target.value,
        bank: '',
        symbol: '',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      const collectionPath = `users/${auth.currentUser.uid}/${type === 'asset' ? 'assets' : (type === 'liability' ? 'liabilities' : 'investments')}`;
      
      const payload: any = {
        userId: auth.currentUser.uid,
        name: formData.name,
        category: formData.category,
        updatedAt: new Date(formData.updatedAt),
        type: type, // Add this
      };

      if (type === 'asset') {
        payload.bank = formData.bank;
        payload.amount = Number(formData.amount);
        payload.currency = formData.currency;
        payload.exchangeRate = Number(formData.exchangeRate) || 1;
      } else if (type === 'liability') {
        payload.amount = Number(formData.amount);
      } else if (type === 'investment') {
        payload.symbol = formData.symbol;
        payload.shares = Number(formData.shares);
        payload.marketPrice = Number(formData.price);
        payload.avgCost = Number(formData.price);
        payload.amount = payload.shares * payload.marketPrice;
        payload.currency = formData.currency;
        payload.exchangeRate = Number(formData.exchangeRate) || 1;
      }

      await addDoc(collection(db, collectionPath), payload);
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'entries');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[100] bg-wabi-bg flex flex-col max-w-md mx-auto shadow-2xl"
    >
      <div className="px-6 pt-10 pb-6 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] text-wabi-stone tracking-[0.3em] uppercase">New Entry</p>
          <h2 className="text-xl font-serif text-wabi-ink">新增{type === 'asset' ? '資產' : (type === 'liability' ? '負債' : '投資')}</h2>
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-wabi-paper flex items-center justify-center text-wabi-stone border border-wabi-accent/5">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-2 space-y-6">
        {/* Template Selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-wabi-stone uppercase tracking-widest px-1">選擇項目 Template</label>
          <div className="relative">
            <select
              value={formData.name}
              onChange={handleTemplateChange}
              className="w-full bg-wabi-paper border border-wabi-accent/10 rounded-2xl py-3 px-5 appearance-none focus:outline-none focus:ring-1 focus:ring-wabi-accent/30 text-sm font-medium text-wabi-ink"
            >
              {templates.map(t => (
                <option key={t.name} value={t.name}>{t.name}</option>
              ))}
              <option value="custom">+ 自定義項目</option>
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-wabi-stone/50">
              <ChevronDown size={16} />
            </div>
          </div>
        </div>

        {formData.name === 'custom' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <label className="text-[10px] text-wabi-stone uppercase tracking-widest px-1">項目名稱 Name</label>
            <input
              required
              type="text"
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-transparent border-b border-wabi-accent/20 py-2 focus:border-wabi-ink outline-none transition-colors text-sm"
              placeholder="請輸入名稱"
            />
          </motion.div>
        )}

        {/* Date and Currency */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] text-wabi-stone uppercase tracking-widest px-1">日期 Date</label>
            <input
              required
              type="date"
              value={formData.updatedAt}
              onChange={e => setFormData({ ...formData, updatedAt: e.target.value })}
              className="w-full bg-transparent border-b border-wabi-accent/20 py-2 focus:border-wabi-ink outline-none transition-colors text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-wabi-stone uppercase tracking-widest px-1">幣別 Currency</label>
            <select
              value={formData.currency}
              onChange={e => setFormData({ ...formData, currency: e.target.value })}
              className="w-full bg-transparent border-b border-wabi-accent/20 py-2 focus:border-wabi-ink outline-none transition-colors text-sm"
            >
              <option value="TWD">TWD</option>
              <option value="USD">USD</option>
              <option value="JPY">JPY</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>

        {formData.currency !== 'TWD' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] text-wabi-stone uppercase tracking-widest">匯率 Exchange Rate (1 {formData.currency} = ? TWD)</label>
              {fetchingRate && <RefreshCw size={10} className="animate-spin text-wabi-accent" />}
            </div>
            <input
              required
              type="number"
              step="0.0001"
              value={formData.exchangeRate}
              onChange={e => setFormData({ ...formData, exchangeRate: e.target.value })}
              className="w-full bg-transparent border-b border-wabi-accent/20 py-2 focus:border-wabi-ink outline-none transition-colors text-sm"
              placeholder={fetchingRate ? "載入中..." : "請輸入匯率，例如 32.5"}
            />
          </motion.div>
        )}

        {/* Amount Section */}
        {(type === 'asset' || type === 'liability') && (
          <div className="space-y-1.5">
            <label className="text-[10px] text-wabi-stone uppercase tracking-widest px-1">本期金額 Current Amount</label>
            <div className="relative">
              <input
                required
                type="number"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                className="w-full bg-wabi-paper border-b border-wabi-ink py-4 px-4 text-3xl font-serif focus:outline-none transition-colors tabular-nums"
                placeholder="0"
                autoFocus
              />
              <span className="absolute right-4 bottom-4 text-[10px] text-wabi-stone font-sans">{formData.currency}</span>
            </div>
            {formData.currency !== 'TWD' && formData.amount && formData.exchangeRate && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[10px] text-wabi-accent font-medium mt-1 px-1"
              >
                約合 {new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(Number(formData.amount) * Number(formData.exchangeRate))}
              </motion.p>
            )}
          </div>
        )}

        {type === 'investment' && (
          <div className="space-y-8">
            <div className="space-y-1">
              <label className="text-[10px] text-wabi-stone uppercase tracking-widest px-1">投資代號 Symbol (台股/美股/BTC)</label>
              <input
                type="text"
                value={formData.symbol}
                onChange={e => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                className="w-full bg-transparent border-b border-wabi-accent/20 py-2 focus:border-wabi-ink outline-none transition-colors text-sm"
                placeholder="例如: 2330, AAPL, BTC"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] text-wabi-stone uppercase tracking-widest px-1">持有股數 Shares</label>
                <input
                  required
                  type="number"
                  value={formData.shares}
                  onChange={e => setFormData({ ...formData, shares: e.target.value })}
                  className="w-full bg-transparent border-b border-wabi-accent/20 py-2 focus:border-wabi-ink outline-none transition-colors text-sm"
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-wabi-stone uppercase tracking-widest px-1">目前市價 Price ({formData.currency})</label>
                  {formData.symbol && (
                    <button 
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/prices?symbols=${formData.symbol}`);
                          if (res.ok) {
                            const data = await res.json();
                            const match = data.find((d: any) => d.Code.toUpperCase() === formData.symbol.toUpperCase());
                            if (match) {
                              setFormData(prev => ({ ...prev, price: match.ClosingPrice.toString() }));
                            }
                          }
                        } catch (e) { console.error(e); }
                      }}
                      className="text-[8px] text-blue-600 font-bold flex items-center gap-1 hover:underline"
                    >
                      <RefreshCw size={10} /> 抓取市價
                    </button>
                  )}
                </div>
                <input
                  required
                  type="number"
                  step="0.00000001"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  className="w-full bg-transparent border-b border-wabi-accent/20 py-2 focus:border-wabi-ink outline-none transition-colors text-sm"
                  placeholder="0.00"
                />
              </div>
            </div>
            {formData.currency !== 'TWD' && formData.shares && formData.price && formData.exchangeRate && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[10px] text-wabi-accent font-medium mt-1 px-1"
              >
                約合 {new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(Number(formData.shares) * Number(formData.price) * Number(formData.exchangeRate))}
              </motion.p>
            )}
          </div>
        )}

        <div className="pt-10">
          <button
            disabled={loading}
            type="submit"
            className="w-full py-5 bg-wabi-ink text-wabi-paper rounded-full text-sm font-medium uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? '儲存中...' : '確認儲存本期資料'}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

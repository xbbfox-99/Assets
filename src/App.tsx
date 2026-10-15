/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { useData } from './lib/useData';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { EntryList } from './components/EntryList';
import { AddEntry } from './components/AddEntry';
import { BatchEntry } from './components/BatchEntry';
import { AssetAnalysis } from './components/AssetAnalysis';
import { Login } from './components/Login';
import { AnimatePresence } from 'motion/react';
import { User as UserIcon } from 'lucide-react';
import { db, logout } from './lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';

import { BatchHistoryList } from './components/BatchHistoryList';
import { Asset, Liability, Investment } from './types';
import { useToast } from './lib/ToastContext';

import { seedDemoData } from './lib/seed';

function AppContent() {
  const { user } = useAuth();
  const { toast, confirm } = useToast();
  const { assets, liabilities, investments, reminders, loading } = useData();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAdd, setShowAdd] = useState(false);
  const [editingItems, setEditingItems] = useState<(Asset | Liability | Investment)[] | null>(null);
  const [isClone, setIsClone] = useState(false);
  const [addType, setAddType] = useState('asset');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const isTestUser = user?.email?.startsWith('test@');

  const handleSeed = async () => {
    if (!user || isSeeding) return;
    setIsSeeding(true);
    try {
      await seedDemoData(user.uid);
      toast.success('已匯入範例資料');
    } catch (err) {
      console.error(err);
      toast.error('範例資料匯入失敗');
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    if (isTestUser && !loading && assets.length === 0 && liabilities.length === 0 && !isSeeding) {
      handleSeed();
    }
  }, [isTestUser, loading, assets.length, liabilities.length, isSeeding]);

  if (!user) return <Login />;

  const handleDelete = async (id: string, path: string, skipConfirm = false) => {
    const doDelete = async () => {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/${path}`, id));
        toast.success('已刪除該筆項目');
      } catch (err) {
        console.error(err);
        toast.error('刪除失敗', '請確認權限或稍後再試');
      }
    };

    if (skipConfirm) {
      await doDelete();
    } else {
      confirm({
        title: '確定刪除此項目？',
        message: '此項目移除後將自記錄中排除，確定要刪除嗎？',
        confirmLabel: '刪除',
        onConfirm: doDelete,
      });
    }
  };

  const handleDeleteBatch = async (items: (Asset | Liability | Investment)[]) => {
    if (!items.length || !user || isDeleting) return;

    // Use the first item's timestamp as the reference for the entire batch
    const firstItem = items[0];
    const timestamp = firstItem.updatedAt;
    const targetTime = timestamp.toDate ? timestamp.toDate().getTime() : new Date(timestamp).getTime();

    try {
      setIsDeleting(true);
      
      // Find ALL items in all three collections that match this exact timestamp
      const allBatchItemsToClean = [
        ...assets,
        ...liabilities,
        ...investments
      ].filter(item => {
        const itemTs = item.updatedAt.toDate ? item.updatedAt.toDate().getTime() : new Date(item.updatedAt).getTime();
        return Math.abs(itemTs - targetTime) < 10;
      });

      const deletePromises = allBatchItemsToClean.map(item => {
        let path = (item as any)._collection;
        if (!path) {
          if ('shares' in item) path = 'investments';
          else if (['loan', 'card', 'investment_payable'].includes((item as any).category)) path = 'liabilities';
          else path = 'assets';
        }
        return deleteDoc(doc(db, `users/${user.uid}/${path}`, item.id));
      });

      await Promise.all(deletePromises);
      toast.success('已刪除批次紀錄', '該期結算之所有明細已同步清除。');
    } catch (err) {
      console.error('Delete Batch Error:', err);
      toast.error('刪除失敗', '批次資料刪除時發生異常，請稍後再試。');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicateBatch = (items: (Asset | Liability | Investment)[]) => {
    // To duplicate, we strip IDs and change the date to today
    const duplicatedItems = items.map(item => ({
      ...item,
      id: "item-" + Math.random().toString(36).substr(2, 9),
      updatedAt: new Date()
    }));
    setEditingItems(duplicatedItems as any);
    setIsClone(true);
    setShowAdd(true);
  };

  const handlePlusClick = () => {
    setAddType(activeTab === 'liabilities' ? 'liability' : (activeTab === 'investments' || activeTab === 'analysis' ? 'investment' : 'asset'));
    setEditingItems(null);
    setIsClone(false);
    setShowAdd(true);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard assets={assets} liabilities={liabilities} investments={investments} reminders={reminders} />;
      case 'assets':
        const allHistoryItems = [...assets, ...liabilities, ...investments];
        return (
          <BatchHistoryList 
            title="資產歷史" 
            items={allHistoryItems} 
            type="asset" 
            onDeleteBatch={(items) => handleDeleteBatch(items)} 
            onEditBatch={(items) => {
              setEditingItems(items);
              setIsClone(false);
              setShowAdd(true);
            }}
            onDuplicateBatch={handleDuplicateBatch}
          />
        );
      case 'analysis':
        return <AssetAnalysis assets={assets} liabilities={liabilities} investments={investments} />;
      case 'settings':
        return (
          <div className="space-y-12">
            <div className="space-y-1">
              <p className="text-[10px] text-wabi-stone uppercase tracking-[0.2em]">Preferences</p>
              <h2 className="text-3xl font-serif text-wabi-ink">個人設定</h2>
            </div>
            
            <div className="space-y-4">
              <div className="bg-wabi-paper p-6 rounded-2xl border border-wabi-accent/5 flex items-center gap-4">
                {user.photoURL ? (
                  <img src={user.photoURL} className="w-12 h-12 rounded-full border border-wabi-bg shadow-sm" alt="profile" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-wabi-bg flex items-center justify-center text-wabi-stone border border-wabi-accent/10 shadow-sm">
                    <UserIcon size={20} strokeWidth={1} />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-wabi-ink">{isTestUser ? '測試演示帳戶' : (user.displayName || '同步帳戶')}</p>
                  <p className="text-xs text-wabi-stone">{isTestUser ? '僅供演示使用' : '跨裝置同步進行中'}</p>
                </div>
              </div>

              {isTestUser && (
                <button 
                  onClick={handleSeed}
                  disabled={isSeeding}
                  className="w-full py-4 bg-wabi-accent/5 text-wabi-ink text-[10px] font-sans uppercase tracking-[0.2em] rounded-2xl border border-wabi-accent/10 hover:bg-wabi-accent/10 transition-colors"
                >
                  {isSeeding ? '正在生成...' : '生成示範歷史資料 (Demo Data)'}
                </button>
              )}

              <button 
                onClick={logout}
                className="w-full py-4 text-sm text-red-500 font-sans uppercase tracking-widest"
              >
                登出帳戶 Logout
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab} onPlusClick={handlePlusClick}>
        {renderContent()}
      </Layout>

      <AnimatePresence>
        {showAdd && (
          <BatchEntry 
            initialItems={editingItems}
            isClone={isClone}
            onClose={() => {
              setShowAdd(false);
              setEditingItems(null);
              setIsClone(false);
            }} 
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

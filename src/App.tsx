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

import { seedDemoData } from './lib/seed';

function AppContent() {
  const { user } = useAuth();
  const { assets, liabilities, investments, reminders, loading } = useData();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAdd, setShowAdd] = useState(false);
  const [editingItems, setEditingItems] = useState<(Asset | Liability | Investment)[] | null>(null);
  const [addType, setAddType] = useState('asset');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const isTestUser = user?.email?.startsWith('test@');

  const handleSeed = async () => {
    if (!user || isSeeding) return;
    setIsSeeding(true);
    try {
      await seedDemoData(user.uid);
    } catch (err) {
      console.error(err);
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
    if (!skipConfirm && !window.confirm('確定要刪除此項目嗎？')) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/${path}`, id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBatch = async (items: (Asset | Liability | Investment)[]) => {
    if (!items.length || !user || isDeleting) return;

    // Use the first item's timestamp as the reference for the entire batch
    const firstItem = items[0];
    const timestamp = firstItem.updatedAt;
    const targetTime = timestamp.toDate ? timestamp.toDate().getTime() : new Date(timestamp).getTime();

    // Remove window.confirm as it is already handled by the UI internal state

    try {
      setIsDeleting(true);
      
      // Find ALL items in all three collections that match this exact timestamp
      // We use a small epsilon or exact match if possible
      const allBatchItemsToClean = [
        ...assets,
        ...liabilities,
        ...investments
      ].filter(item => {
        const itemTs = item.updatedAt.toDate ? item.updatedAt.toDate().getTime() : new Date(item.updatedAt).getTime();
        // Allow a 10ms difference just in case of slight precision issues, though they should be identical
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
    } catch (err) {
      console.error('Delete Batch Error:', err);
      alert('刪除失敗');
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePlusClick = () => {
    setAddType(activeTab === 'liabilities' ? 'liability' : (activeTab === 'investments' || activeTab === 'analysis' ? 'investment' : 'asset'));
    setEditingItems(null);
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
              setShowAdd(true);
            }}
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
            onClose={() => {
              setShowAdd(false);
              setEditingItems(null);
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

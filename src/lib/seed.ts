import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const seedDemoData = async (userId: string) => {
  const assets = [
    { name: '玉山銀行 活存', category: 'saving', amount: 50000, bank: '玉山銀行', currency: 'TWD', updatedAt: new Date(Date.now() - 86400000 * 30 * 5) },
    { name: '台新銀行 Richart', category: 'saving', amount: 150000, bank: '台新銀行', currency: 'TWD', updatedAt: new Date(Date.now() - 86400000 * 30 * 4) },
    { name: '國泰世華 薪轉', category: 'saving', amount: 80000, bank: '國泰世華', currency: 'TWD', updatedAt: new Date(Date.now() - 86400000 * 30 * 3) },
    { name: '玉山銀行 活存', category: 'saving', amount: 55000, bank: '玉山銀行', currency: 'TWD', updatedAt: new Date(Date.now() - 86400000 * 30 * 2) },
    { name: '台新銀行 Richart', category: 'saving', amount: 155000, bank: '台新銀行', currency: 'TWD', updatedAt: new Date(Date.now() - 86400000 * 30 * 1) },
    { name: '國泰世華 薪轉', category: 'saving', amount: 85000, bank: '國泰世華', currency: 'TWD', updatedAt: new Date() }
  ];

  const liabilities = [
    { name: '信用卡分期', category: 'card', amount: 12000, dueDate: '2026-05-15', updatedAt: new Date(Date.now() - 86400000 * 30 * 2) },
    { name: '信貸項目', category: 'loan', amount: 200000, dueDate: '2026-05-20', updatedAt: new Date(Date.now() - 86400000 * 30 * 1) }
  ];

  const investments = [
    { name: '台積電', symbol: '2330.TW', category: 'stock', shares: 1000, avgCost: 600, marketPrice: 800, updatedAt: new Date(Date.now() - 86400000 * 30 * 3) },
    { name: '比特幣', symbol: 'BTC', category: 'crypto', shares: 0.5, avgCost: 40000, marketPrice: 65000, updatedAt: new Date() }
  ];

  const promises = [];
  
  for (const asset of assets) {
    promises.push(addDoc(collection(db, `users/${userId}/assets`), { ...asset, userId }));
  }
  for (const liability of liabilities) {
    promises.push(addDoc(collection(db, `users/${userId}/liabilities`), { ...liability, userId }));
  }
  for (const investment of investments) {
    promises.push(addDoc(collection(db, `users/${userId}/investments`), { ...investment, userId }));
  }

  await Promise.all(promises);
};

import React, { useState, useEffect } from 'react';
import { db, OperationType, handleFirestoreError } from './firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { Asset, Liability, Investment, Reminder } from '../types';

export function useData() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAssets([]);
      setLiabilities([]);
      setInvestments([]);
      setReminders([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const assetQuery = query(collection(db, `users/${user.uid}/assets`), orderBy('updatedAt', 'desc'));
    const liabilityQuery = query(collection(db, `users/${user.uid}/liabilities`), orderBy('updatedAt', 'desc'));
    const investmentQuery = query(collection(db, `users/${user.uid}/investments`), orderBy('updatedAt', 'desc'));
    const reminderQuery = query(collection(db, `users/${user.uid}/reminders`));

    const unsubAssets = onSnapshot(assetQuery, (snapshot) => {
      setAssets(snapshot.docs.map(doc => ({ id: doc.id, _collection: 'assets', ...doc.data() } as any)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/assets`));

    const unsubLiabilities = onSnapshot(liabilityQuery, (snapshot) => {
      setLiabilities(snapshot.docs.map(doc => ({ id: doc.id, _collection: 'liabilities', ...doc.data() } as any)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/liabilities`));

    const unsubInvestments = onSnapshot(investmentQuery, (snapshot) => {
      setInvestments(snapshot.docs.map(doc => ({ id: doc.id, _collection: 'investments', ...doc.data() } as any)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/investments`));

    const unsubReminders = onSnapshot(reminderQuery, (snapshot) => {
      setReminders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reminder)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/reminders`));

    setLoading(false);

    return () => {
      unsubAssets();
      unsubLiabilities();
      unsubInvestments();
      unsubReminders();
    };
  }, [user]);

  return { assets, liabilities, investments, reminders, loading };
}

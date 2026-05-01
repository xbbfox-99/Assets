import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { loginWithPasscode } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Unlock } from 'lucide-react';

export const Login: React.FC = () => {
  const [passcode, setPasscode] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePasscodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setPasscode(val);
    
    const allowedPasscodes = ['HAERIN', 'TEST'];
    if (allowedPasscodes.includes(val)) {
      setIsUnlocked(true);
      setError(false);
      setLoading(true);
      try {
        await loginWithPasscode(val);
      } catch (err) {
        console.error('Auth error:', err);
        setError(true);
        setIsUnlocked(false);
      } finally {
        setLoading(false);
      }
    } else if (val.length >= 6) {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-wabi-bg px-10 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12 w-full max-w-[280px]"
      >
        <div className="space-y-4">
          <h1 className="text-4xl font-serif text-wabi-ink tracking-tight">WabiBalance</h1>
          <p className="text-wabi-stone font-sans text-[10px] tracking-[0.3em] uppercase">日式極簡資產管理</p>
        </div>

        <div className="w-12 h-px bg-wabi-accent/30 mx-auto" />

        <div className="space-y-8">
          <AnimatePresence mode="wait">
            {!isUnlocked ? (
              <motion.div
                key="locked"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="relative">
                  <input
                    type="password"
                    value={passcode}
                    onChange={handlePasscodeChange}
                    className={`w-full bg-transparent border-b ${error ? 'border-red-300' : 'border-wabi-accent/20'} py-3 text-center outline-none transition-colors tracking-[0.5em] text-sm uppercase`}
                    placeholder="ENTER PASSCODE"
                    autoFocus
                  />
                  <div className="absolute right-0 bottom-3 text-wabi-stone/30">
                    <Lock size={14} />
                  </div>
                </div>
                {error && <p className="text-[10px] text-red-400 font-sans">密碼錯誤，請重新輸入</p>}
              </motion.div>
            ) : (
              <motion.div
                key="unlocked"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="flex justify-center text-wabi-accent mb-4">
                  <Unlock size={24} strokeWidth={1} />
                </div>
                <p className="text-xs text-wabi-stone animate-pulse">正在開啟金庫...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <p className="text-[10px] text-wabi-stone/40 leading-relaxed italic">
          「物哀」之美，在於秩序與平靜
        </p>
      </motion.div>
    </div>
  );
};

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, ReceiptText, PieChart, Plus, Settings, Wallet } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onPlusClick: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, onPlusClick }) => {
  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto relative overflow-hidden bg-wabi-bg">
      <main className="flex-1 overflow-y-auto pb-28 px-5 pt-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Navigation Rail */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-wabi-paper/80 backdrop-blur-md border-t border-wabi-accent/10 px-6 py-2.5 flex items-center justify-between z-50">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`p-3 transition-colors ${activeTab === 'dashboard' ? 'text-wabi-ink' : 'text-wabi-stone hover:text-wabi-ink'}`}
          id="nav-dashboard"
        >
          <LayoutDashboard size={24} strokeWidth={1.5} />
        </button>
        <button 
          onClick={() => setActiveTab('assets')}
          className={`p-3 transition-colors ${activeTab === 'assets' ? 'text-wabi-ink' : 'text-wabi-stone hover:text-wabi-ink'}`}
          id="nav-assets"
        >
          <ReceiptText size={24} strokeWidth={1.5} />
        </button>
        
        {/* Floating Plus Button */}
        <button 
          onClick={onPlusClick}
          className="absolute -top-12 left-1/2 -translate-x-1/2 w-14 h-14 bg-wabi-ink text-wabi-paper rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform"
          id="nav-add"
        >
          <Plus size={28} strokeWidth={2} />
        </button>

        <button 
          onClick={() => setActiveTab('analysis')}
          className={`p-3 transition-colors ${activeTab === 'analysis' ? 'text-wabi-ink' : 'text-wabi-stone hover:text-wabi-ink'}`}
          id="nav-analysis"
        >
          <PieChart size={24} strokeWidth={1.5} />
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`p-3 transition-colors ${activeTab === 'settings' ? 'text-wabi-ink' : 'text-wabi-stone hover:text-wabi-ink'}`}
          id="nav-settings"
        >
          <Settings size={24} strokeWidth={1.5} />
        </button>
      </nav>
    </div>
  );
};

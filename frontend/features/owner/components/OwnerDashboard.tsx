'use client';

import React, { useState } from 'react';
import StockTab from './StockTab';
import WholesaleTab from './WholesaleTab';
import ClientsTab from './ClientsTab';
import ExpensesTab from './ExpensesTab';
import AnalyticsTab from './AnalyticsTab';

type TabType = 'stock' | 'wholesale' | 'expenses' | 'analytics' | 'clients';

export default function OwnerDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('stock');

  return (
    <div className="flex flex-col gap-6 pb-6">
      {/* Navigation tabs */}
      <div className="flex bg-slate-900 border border-slate-850 p-1 rounded-xl">
        {(['stock', 'wholesale', 'clients', 'expenses', 'analytics'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-colors capitalize ${
              activeTab === tab 
                ? 'bg-indigo-600 text-white shadow shadow-indigo-500/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab === 'stock' ? 'Склад' : 
             tab === 'wholesale' ? 'Опт' : 
             tab === 'clients' ? 'Долги' : 
             tab === 'expenses' ? 'Расходы' : 'Отчеты'}
          </button>
        ))}
      </div>

      {/* Tabs View */}
      <div className="flex flex-col gap-4">
        {activeTab === 'stock' && <StockTab />}
        {activeTab === 'wholesale' && <WholesaleTab />}
        {activeTab === 'clients' && <ClientsTab />}
        {activeTab === 'expenses' && <ExpensesTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
      </div>
    </div>
  );
}

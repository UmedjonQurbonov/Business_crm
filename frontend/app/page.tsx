'use client';

import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import LoginForm from '../features/auth/components/LoginForm';
import SellerDashboard from '../features/seller/components/SellerDashboard';
import OwnerDashboard from '../features/owner/components/OwnerDashboard';

export default function SPA() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'owner' | 'seller' | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  // Authentication State
  useEffect(() => {
    const savedToken = localStorage.getItem('crm_token');
    const savedRole = localStorage.getItem('crm_role') as 'owner' | 'seller' | null;
    const savedName = localStorage.getItem('crm_username');
    if (savedToken && savedRole && savedName) {
      setToken(savedToken);
      setUserRole(savedRole);
      setUsername(savedName);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_role');
    localStorage.removeItem('crm_username');
    setToken(null);
    setUserRole(null);
    setUsername(null);
    queryClient.clear();
  };

  if (!token) {
    return <LoginForm onLogin={(t, r, u) => {
      setToken(t);
      setUserRole(r);
      setUsername(u);
    }} />;
  }

  return (
    <div className="mx-auto w-full max-w-[480px] min-h-screen bg-slate-950 text-slate-100 flex flex-col shadow-2xl relative border-x border-slate-900 pb-20">
      {/* Header */}
      <header className="p-4 border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
            D
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide">DISH CRM</h1>
            <p className="text-[10px] text-slate-400 capitalize">{username} • {userRole === 'owner' ? 'Владелец' : 'Продавец'}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="w-8 h-8 rounded-lg border border-slate-900 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={16} />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 flex flex-col gap-6 overflow-y-auto">
        {userRole === 'owner' ? (
          <OwnerDashboard />
        ) : (
          <SellerDashboard username={username} />
        )}
      </main>

      {/* Footer Branding */}
      <footer className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-slate-600">
        Dish Micro-CRM v1.0.0
      </footer>
    </div>
  );
}

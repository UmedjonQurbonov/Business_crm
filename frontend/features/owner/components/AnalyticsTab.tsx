'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity, CreditCard } from 'lucide-react';
import api from '../../../services/api';
import { User, Analytics } from '../../../types';

export default function AnalyticsTab() {
  const queryClient = useQueryClient();
  const todayStr = new Date().toLocaleDateString('en-CA');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  // Fetch Sellers
  const { data: sellers, refetch: refetchSellers } = useQuery<User[]>({
    queryKey: ['sellers'],
    queryFn: async () => {
      const response = await api.get('/api/sellers/');
      return response.data;
    }
  });

  // Fetch Analytics
  const { data: analytics, refetch: refetchAnalytics } = useQuery<Analytics>({
    queryKey: ['analytics', startDate, endDate],
    queryFn: async () => {
      const response = await api.get(`/api/analytics/daily/?start_date=${startDate}&end_date=${endDate}`);
      return response.data;
    }
  });

  // Payout Mutation
  const payMutation = useMutation({
    mutationFn: async (sellerId: number) => {
      const response = await api.post(`/api/sellers/${sellerId}/pay/`, {});
      return response.data;
    },
    onSuccess: () => {
      refetchSellers();
      refetchAnalytics();
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Ошибка при проведении выплаты');
    }
  });

  const handlePayout = (sellerId: number) => {
    if (confirm('Вы подтверждаете выплату всей суммы зарплаты продавцу?')) {
      payMutation.mutate(sellerId);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Date Selectors */}
      <div className="grid grid-cols-2 gap-2 bg-slate-900 p-3 rounded-xl border border-slate-900">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-500 font-bold">Начало</span>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-[10px] p-2 rounded-lg text-slate-200 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-500 font-bold">Конец</span>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-[10px] p-2 rounded-lg text-slate-200 focus:outline-none"
          />
        </div>
      </div>

      {/* Analytics Info */}
      {analytics && (
        <div className="flex flex-col gap-3">
          {/* Main Profit Card */}
          <div className="p-5 rounded-2xl border border-indigo-900/30 bg-gradient-to-br from-indigo-950/60 to-slate-900/60 flex flex-col items-center gap-1 shadow-lg relative overflow-hidden">
            <Activity size={20} className="text-indigo-400 mb-1" />
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Чистая прибыль владельца</span>
            <span className="text-2xl font-black text-white">{analytics.net_profit} сомони</span>
          </div>

          {/* Details list */}
          <div className="p-4 rounded-xl border border-slate-900 bg-slate-900/20 flex flex-col gap-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Выручка Опт:</span>
              <span className="font-bold text-slate-300">+{analytics.wholesale_revenue} сомони</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Выручка Розница (60%):</span>
              <span className="font-bold text-slate-300">+{analytics.retail_revenue} сомони</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Возвраты долгов:</span>
              <span className="font-bold text-slate-300">+{analytics.debt_returns} сомони</span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-900/60 pt-3">
              <span className="text-slate-500">Расход:</span>
              <span className="font-bold text-red-400">-{analytics.expenses} сомони</span>
            </div>
          </div>
        </div>
      )}

      {/* Payout Seller salary list */}
      <div className="flex flex-col gap-3 mt-2">
        <h3 className="text-xs font-bold text-slate-400">Балансы и выплаты продавцам</h3>
        
        <div className="flex flex-col gap-2">
          {sellers?.map(seller => {
            const hasSalary = Number(seller.unpaid_balance) > 0;
            return (
              <div key={seller.id} className="p-4 rounded-xl border border-slate-900 bg-slate-900/40 flex justify-between items-center animate-in fade-in">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">{seller.username}</span>
                  <span className="text-[10px] text-slate-500">Долг по зарплате: {seller.unpaid_balance} сомони</span>
                </div>
                {hasSalary && (
                  <button 
                    onClick={() => handlePayout(seller.id)}
                    disabled={payMutation.isPending}
                    className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-[10px] font-bold text-white transition-colors flex items-center gap-1 shadow shadow-green-500/10"
                  >
                    <CreditCard size={12} />
                    Выплатить
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

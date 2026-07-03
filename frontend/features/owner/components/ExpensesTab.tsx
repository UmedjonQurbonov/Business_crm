'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, ShieldAlert, CheckCircle, X } from 'lucide-react';
import api from '../../../services/api';
import { Expense } from '../../../types';
import { expenseSchema, ExpenseInput } from '../../../lib/validation';

export default function ExpensesTab() {
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [apiError, setApiError] = useState('');

  // Fetch Expenses
  const { data: expenses, refetch: refetchExpenses } = useQuery<Expense[]>({
    queryKey: ['expenses'],
    queryFn: async () => {
      const response = await api.get('/api/expenses/');
      return response.data;
    }
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: '',
      description: '',
    }
  });

  // Expense Mutation
  const expenseMutation = useMutation({
    mutationFn: async (data: ExpenseInput) => {
      const response = await api.post('/api/expenses/', {
        amount: data.amount,
        description: data.description
      });
      return response.data;
    },
    onSuccess: () => {
      setSuccessMsg('Расход зафиксирован!');
      refetchExpenses();
      reset();
      setApiError('');
      setTimeout(() => {
        setSuccessMsg('');
        setShowExpenseModal(false);
      }, 1500);
    },
    onError: (error: any) => {
      setApiError(error.response?.data?.detail || 'Ошибка при сохранении расходов');
    }
  });

  const onSubmit = (data: ExpenseInput) => {
    setApiError('');
    expenseMutation.mutate(data);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold text-slate-300">Расходы компании</h2>
        <button 
          onClick={() => {
            reset();
            setApiError('');
            setSuccessMsg('');
            setShowExpenseModal(true);
          }}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center gap-1 transition-colors"
        >
          <Plus size={14} />
          Расход
        </button>
      </div>

      {/* Expenses list */}
      <div className="flex flex-col gap-2.5">
        {expenses?.map(exp => (
          <div key={exp.id} className="p-4 rounded-xl border border-slate-900 bg-slate-900/40 flex justify-between items-center animate-in fade-in">
            <div>
              <span className="text-xs font-bold text-slate-200 block">{exp.description}</span>
              <span className="text-[9px] text-slate-500">{new Date(exp.created_at).toLocaleDateString('ru-RU')}</span>
            </div>
            <span className="text-xs font-bold text-red-400">-{exp.amount} сомони</span>
          </div>
        ))}
      </div>

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="w-full max-w-[440px] bg-slate-900 border border-slate-800 rounded-t-2xl p-6 flex flex-col gap-5 shadow-2xl relative max-h-[85vh] overflow-y-auto mb-16">
            <button 
              onClick={() => {
                setShowExpenseModal(false);
                setApiError('');
                setSuccessMsg('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X size={18} />
            </button>

            <h2 className="text-base font-bold text-white">Добавление расхода</h2>

            {successMsg ? (
              <div className="py-6 flex flex-col items-center justify-center gap-3 text-center">
                <CheckCircle size={40} className="text-green-500" />
                <p className="text-sm font-semibold text-slate-200">{successMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                {/* Amount */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Сумма расхода (сомони)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    {...register('amount')}
                    className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-200"
                  />
                  {errors.amount && (
                    <span className="text-[10px] text-red-400 mt-0.5">{errors.amount.message}</span>
                  )}
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Описание расхода</label>
                  <input 
                    type="text" 
                    placeholder="На что потрачено..."
                    {...register('description')}
                    className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-200"
                  />
                  {errors.description && (
                    <span className="text-[10px] text-red-400 mt-0.5">{errors.description.message}</span>
                  )}
                </div>

                {apiError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 flex items-center gap-2">
                    <ShieldAlert size={14} />
                    <span>{apiError}</span>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={expenseMutation.isPending}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all disabled:opacity-50 mt-2"
                >
                  {expenseMutation.isPending ? 'Загрузка...' : 'Сохранить расход'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

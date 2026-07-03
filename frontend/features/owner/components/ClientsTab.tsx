'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, ShieldAlert, CheckCircle, X } from 'lucide-react';
import api from '../../../services/api';
import { Client } from '../../../types';
import { repaymentSchema, RepaymentInput, createClientSchema, CreateClientInput } from '../../../lib/validation';

export default function ClientsTab() {
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [apiError, setApiError] = useState('');

  // Fetch Clients
  const { data: clients, refetch: refetchClients } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => {
      const response = await api.get('/api/clients/');
      return response.data;
    }
  });

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<RepaymentInput>({
    resolver: zodResolver(repaymentSchema),
    defaultValues: {
      clientId: '',
      amount: '',
    }
  });

  const watchClientId = watch('clientId');
  const selectedClient = clients?.find(c => c.id === Number(watchClientId));

  // Repayment Mutation
  const repayMutation = useMutation({
    mutationFn: async (data: RepaymentInput) => {
      const response = await api.post(`/api/clients/${data.clientId}/repay/`, {
        amount: data.amount
      });
      return response.data;
    },
    onSuccess: () => {
      setSuccessMsg('Оплата принята, долг клиента уменьшен!');
      refetchClients();
      reset();
      setApiError('');
      setTimeout(() => {
        setSuccessMsg('');
        setShowRepayModal(false);
      }, 1500);
    },
    onError: (error: any) => {
      setApiError(error.response?.data?.detail || error.response?.data?.amount?.[0] || 'Ошибка при проведении платежа');
    }
  });

  const onSubmit = (data: RepaymentInput) => {
    if (selectedClient && Number(data.amount) > Number(selectedClient.current_debt)) {
      setApiError(`Сумма превышает текущий долг клиента (${selectedClient.current_debt} сомони)`);
      return;
    }
    setApiError('');
    repayMutation.mutate(data);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold text-slate-300">Клиенты и долги</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-900 text-xs font-bold text-slate-300 flex items-center gap-1 transition-colors animate-in fade-in"
          >
            <Plus size={14} />
            Добавить клиента
          </button>
          <button 
            onClick={() => {
              reset();
              setApiError('');
              setSuccessMsg('');
              setShowRepayModal(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center gap-1 transition-colors"
          >
            <Plus size={14} />
            Погасить долг
          </button>
        </div>
      </div>

      {/* Clients list */}
      <div className="flex flex-col gap-2.5">
        {clients?.map(c => {
          const hasDebt = Number(c.current_debt) > 0;
          return (
            <div 
              key={c.id}
              className={`p-4 rounded-xl border flex flex-col gap-1 bg-slate-900/40 ${
                hasDebt ? 'border-red-500/20 bg-red-500/[0.01]' : 'border-slate-900'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-200">{c.name}</span>
                <span className="text-[10px] text-slate-400">{c.phone}</span>
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-900/60 text-[10px]">
                <span className="text-slate-500">Сумма задолженности</span>
                <span className={`font-black ${hasDebt ? 'text-red-400' : 'text-slate-400'}`}>
                  {c.current_debt} сомони
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Repay Modal */}
      {showRepayModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="w-full max-w-[440px] bg-slate-900 border border-slate-800 rounded-t-2xl p-6 flex flex-col gap-5 shadow-2xl relative max-h-[85vh] overflow-y-auto mb-16">
            <button 
              onClick={() => {
                setShowRepayModal(false);
                setApiError('');
                setSuccessMsg('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X size={18} />
            </button>

            <h2 className="text-base font-bold text-white">Внесение оплаты по долгу</h2>

            {successMsg ? (
              <div className="py-6 flex flex-col items-center justify-center gap-3 text-center">
                <CheckCircle size={40} className="text-green-500" />
                <p className="text-sm font-semibold text-slate-200">{successMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                {/* Client select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Выберите клиента</label>
                  <select 
                    {...register('clientId')}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-200"
                  >
                    <option value="">-- Выбрать клиента --</option>
                    {clients?.filter(c => Number(c.current_debt) > 0).map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} (долг: {c.current_debt} сомони)
                      </option>
                    ))}
                  </select>
                  {errors.clientId && (
                    <span className="text-[10px] text-red-400 mt-0.5">{errors.clientId.message}</span>
                  )}
                </div>

                {/* Amount */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Сумма платежа (сомони)</label>
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
                  {selectedClient && (
                    <span className="text-[10px] text-slate-500 mt-0.5">Текущий долг: {selectedClient.current_debt} сомони</span>
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
                  disabled={repayMutation.isPending}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all disabled:opacity-50 mt-2"
                >
                  {repayMutation.isPending ? 'Загрузка...' : 'Внести оплату'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateClientModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

interface CreateClientModalProps {
  onClose: () => void;
}

function CreateClientModal({ onClose }: CreateClientModalProps) {
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState('');
  const [apiError, setApiError] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateClientInput>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      name: '',
      phone: '',
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateClientInput) => {
      const response = await api.post('/api/clients/', {
        name: data.name,
        phone: data.phone,
      });
      return response.data;
    },
    onSuccess: () => {
      setSuccessMsg('Клиент успешно добавлен!');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      reset();
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1500);
    },
    onError: (error: any) => {
      setApiError(error.response?.data?.detail || error.response?.data?.phone?.[0] || 'Ошибка при добавлении клиента');
    }
  });

  const onSubmit = (data: CreateClientInput) => {
    setApiError('');
    createMutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end justify-center p-4">
      <div className="w-full max-w-[440px] bg-slate-900 border border-slate-800 rounded-t-2xl p-6 flex flex-col gap-5 shadow-2xl relative max-h-[85vh] overflow-y-auto mb-16">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
        >
          <X size={18} />
        </button>

        <h2 className="text-base font-bold text-white">Добавление нового клиента</h2>

        {successMsg ? (
          <div className="py-6 flex flex-col items-center justify-center gap-3 text-center">
            <CheckCircle size={40} className="text-green-500 animate-bounce" />
            <p className="text-sm font-semibold text-slate-200">{successMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-400">ФИО клиента</label>
              <input 
                type="text" 
                placeholder="Например: Иван Иванов"
                {...register('name')}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-200"
              />
              {errors.name && <span className="text-[10px] text-red-400">{errors.name.message}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-400">Телефон</label>
              <input 
                type="text" 
                placeholder="Например: +992900000000"
                {...register('phone')}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-200"
              />
              {errors.phone && <span className="text-[10px] text-red-400">{errors.phone.message}</span>}
            </div>

            {apiError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 flex items-center gap-2">
                <ShieldAlert size={14} />
                <span>{apiError}</span>
              </div>
            )}

            <button 
              type="submit"
              disabled={createMutation.isPending}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all disabled:opacity-50 mt-2"
            >
              {createMutation.isPending ? 'Загрузка...' : 'Добавить клиента'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

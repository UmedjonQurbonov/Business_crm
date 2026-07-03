'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Search, TrendingUp, ShieldAlert, CheckCircle, X } from 'lucide-react';
import api from '../../../services/api';
import { Product } from '../../../types';
import { retailSaleSchema, RetailSaleInput } from '../../../lib/validation';

interface SellerDashboardProps {
  username: string | null;
}

export default function SellerDashboard({ username }: SellerDashboardProps) {
  const queryClient = useQueryClient();
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [apiError, setApiError] = useState('');

  // Fetch Balance
  const { data: balanceData, refetch: refetchBalance } = useQuery({
    queryKey: ['seller_balance'],
    queryFn: async () => {
      const response = await api.get('/api/sellers/me/balance/');
      return response.data;
    }
  });

  // Fetch Products
  const { data: products } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get('/api/products/');
      return response.data;
    }
  });

  // React Hook Form for retail sale
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<RetailSaleInput>({
    resolver: zodResolver(retailSaleSchema),
    defaultValues: {
      productId: '',
      quantity: 1,
      factPrice: '',
    }
  });

  const watchProductId = watch('productId');
  const watchQuantity = watch('quantity');
  const watchFactPrice = watch('factPrice');

  const selectedProduct = products?.find(p => p.id === Number(watchProductId));

  // Auto set factPrice when productId changes
  useEffect(() => {
    if (selectedProduct) {
      setValue('factPrice', selectedProduct.wholesale_price);
    } else {
      setValue('factPrice', '');
    }
  }, [watchProductId, selectedProduct, setValue]);

  // Sale Checkout Mutation
  const createSaleMutation = useMutation({
    mutationFn: async (data: RetailSaleInput) => {
      const response = await api.post('/api/transactions/retail/', {
        items: [
          {
            product: Number(data.productId),
            quantity: data.quantity,
            fact_price: data.factPrice
          }
        ],
        payment_status: 'cash'
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      const profit = (Number(variables.factPrice) - Number(selectedProduct?.wholesale_price)) * variables.quantity;
      const sellerShare = profit > 0 ? (profit * 0.4).toFixed(2) : '0.00';

      setSuccessMsg(`Продажа оформлена! Ваш заработок: +${sellerShare} сомони`);
      refetchBalance();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      reset();
      setApiError('');

      setTimeout(() => {
        setSuccessMsg('');
        setShowSaleModal(false);
      }, 3000);
    },
    onError: (error: any) => {
      setApiError(error.response?.data?.detail || error.response?.data?.non_field_errors?.[0] || 'Ошибка при проведении продажи');
    }
  });

  const onSubmit = (data: RetailSaleInput) => {
    if (selectedProduct && selectedProduct.stock_quantity < data.quantity) {
      setApiError(`Недостаточно товара на складе. Доступно: ${selectedProduct.stock_quantity}`);
      return;
    }
    setApiError('');
    createSaleMutation.mutate(data);
  };

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Earnings Summary */}
      <div className="p-6 rounded-2xl border border-indigo-900/30 bg-gradient-to-br from-indigo-950/60 to-slate-900/60 shadow-xl flex flex-col items-center justify-center gap-2 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
        <TrendingUp size={24} className="text-indigo-400 mb-1" />
        <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Мой заработок сегодня</span>
        <span className="text-3xl font-black text-white">{balanceData?.unpaid_balance || '0.00'} сомони</span>
      </div>

      <button 
        onClick={() => {
          reset();
          setApiError('');
          setSuccessMsg('');
          setShowSaleModal(true);
        }}
        className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
      >
        <Plus size={18} />
        Новая розничная продажа
      </button>

      {/* Sale Modal */}
      {showSaleModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="w-full max-w-[440px] bg-slate-900 border border-slate-800 rounded-t-2xl p-6 flex flex-col gap-5 shadow-2xl relative max-h-[85vh] overflow-y-auto mb-16 animate-in slide-in-from-bottom">
            <button 
              onClick={() => {
                setShowSaleModal(false);
                setApiError('');
                setSuccessMsg('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X size={18} />
            </button>

            <h2 className="text-base font-bold text-white">Оформление продажи</h2>

            {successMsg ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
                <CheckCircle size={48} className="text-green-500 animate-bounce" />
                <p className="text-sm font-semibold text-slate-200">{successMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                {/* Search & Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Выберите посуду</label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3 text-slate-500" size={14} />
                    <input 
                      type="text"
                      placeholder="Поиск по названию..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-200"
                    />
                  </div>

                  <select 
                    {...register('productId')}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-200 mt-1"
                  >
                    <option value="">-- Нажмите для выбора --</option>
                    {filteredProducts?.map(p => (
                      <option key={p.id} value={p.id} disabled={p.stock_quantity <= 0}>
                        {p.name} ({p.category}) - в наличии: {p.stock_quantity} шт. [{p.wholesale_price} сомони]
                      </option>
                    ))}
                  </select>
                  {errors.productId && (
                    <span className="text-[10px] text-red-400 mt-0.5">{errors.productId.message}</span>
                  )}
                </div>

                {/* Qty */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Количество (шт.)</label>
                  <input 
                    type="number" 
                    min="1"
                    {...register('quantity', { valueAsNumber: true })}
                    className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-200"
                  />
                  {errors.quantity && (
                    <span className="text-[10px] text-red-400 mt-0.5">{errors.quantity.message}</span>
                  )}
                </div>

                {/* Fact Price */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Цена продажи (сомони)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    {...register('factPrice')}
                    className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-200"
                  />
                  {errors.factPrice && (
                    <span className="text-[10px] text-red-400 mt-0.5">{errors.factPrice.message}</span>
                  )}

                  {selectedProduct && watchFactPrice && (
                    <div className="text-[10px] text-slate-500 mt-0.5 flex justify-between">
                      <span>Опт цена: {selectedProduct.wholesale_price} сомони</span>
                      {Number(watchFactPrice) > Number(selectedProduct.wholesale_price) && (
                        <span className="text-green-500">Прибыль: +{((Number(watchFactPrice) - Number(selectedProduct.wholesale_price)) * watchQuantity).toFixed(2)} сомони</span>
                      )}
                    </div>
                  )}
                </div>

                {apiError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 flex items-center gap-2">
                    <ShieldAlert size={14} className="shrink-0" />
                    <span>{apiError}</span>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={createSaleMutation.isPending}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all disabled:opacity-50 mt-2"
                >
                  {createSaleMutation.isPending ? 'Запись сделки...' : 'Оформить и сохранить'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

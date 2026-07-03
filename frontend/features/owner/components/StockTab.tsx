'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, AlertTriangle, ShieldAlert, CheckCircle, X } from 'lucide-react';
import api from '../../../services/api';
import { Product } from '../../../types';
import { supplySchema, SupplyInput } from '../../../lib/validation';

export default function StockTab() {
  const queryClient = useQueryClient();
  const [showSupplyModal, setShowSupplyModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [apiError, setApiError] = useState('');

  // Fetch Products
  const { data: products } = useQuery<Product[]>({
    queryKey: ['products_full'],
    queryFn: async () => {
      const response = await api.get('/api/products/');
      return response.data;
    }
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<SupplyInput>({
    resolver: zodResolver(supplySchema),
    defaultValues: {
      productId: '',
      quantity: 1,
      costPrice: '',
    }
  });

  const watchProductId = watch('productId');
  const selectedProduct = products?.find(p => p.id === Number(watchProductId));

  // Auto populate cost price
  useEffect(() => {
    if (selectedProduct) {
      setValue('costPrice', selectedProduct.cost_price || '');
    } else {
      setValue('costPrice', '');
    }
  }, [watchProductId, selectedProduct, setValue]);

  // Supply Mutation
  const supplyMutation = useMutation({
    mutationFn: async (data: SupplyInput) => {
      const currentQty = selectedProduct?.stock_quantity || 0;
      const updatedData: any = {
        stock_quantity: currentQty + data.quantity,
      };
      if (data.costPrice) {
        updatedData.cost_price = data.costPrice;
      }
      const response = await api.patch(`/api/products/${data.productId}/`, updatedData);
      return response.data;
    },
    onSuccess: () => {
      setSuccessMsg('Поставка успешно оформлена!');
      queryClient.invalidateQueries({ queryKey: ['products_full'] });
      reset();
      setApiError('');
      setTimeout(() => {
        setSuccessMsg('');
        setShowSupplyModal(false);
      }, 1500);
    },
    onError: (error: any) => {
      setApiError(error.response?.data?.detail || 'Ошибка при сохранении поставки');
    }
  });

  const onSubmit = (data: SupplyInput) => {
    setApiError('');
    supplyMutation.mutate(data);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold text-slate-300">Товары на складе</h2>
        <button 
          onClick={() => {
            reset();
            setApiError('');
            setSuccessMsg('');
            setShowSupplyModal(true);
          }}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center gap-1 transition-colors"
        >
          <Plus size={14} />
          Поставка
        </button>
      </div>

      {/* Stock list */}
      <div className="flex flex-col gap-2.5">
        {products?.map(p => {
          const isLow = p.stock_quantity <= p.min_stock_level;
          return (
            <div 
              key={p.id}
              className={`p-4 rounded-xl border flex flex-col gap-1 bg-slate-900/40 ${
                isLow ? 'border-amber-500/20 bg-amber-500/[0.02]' : 'border-slate-900'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <span className="text-xs font-bold text-slate-200">{p.name}</span>
                {isLow && (
                  <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-amber-500/10 text-amber-500 flex items-center gap-0.5 shrink-0">
                    <AlertTriangle size={8} />
                    Заканчивается!
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 capitalize">Категория: {p.category}</div>
              
              <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-900/60 text-[10px]">
                <div>
                  <span className="text-slate-500 block">На складе</span>
                  <span className={`font-bold ${isLow ? 'text-amber-500' : 'text-slate-300'}`}>{p.stock_quantity} шт.</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Себест.</span>
                  <span className="font-bold text-slate-300">{p.cost_price} сомони</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Опт цена</span>
                  <span className="font-bold text-slate-300">{p.wholesale_price} сомони</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Supply Modal */}
      {showSupplyModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="w-full max-w-[440px] bg-slate-900 border border-slate-800 rounded-t-2xl p-6 flex flex-col gap-5 shadow-2xl relative max-h-[85vh] overflow-y-auto mb-16">
            <button 
              onClick={() => {
                setShowSupplyModal(false);
                setApiError('');
                setSuccessMsg('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X size={18} />
            </button>

            <h2 className="text-base font-bold text-white">Оформление поставки</h2>

            {successMsg ? (
              <div className="py-6 flex flex-col items-center justify-center gap-3 text-center">
                <CheckCircle size={40} className="text-green-500" />
                <p className="text-sm font-semibold text-slate-200">{successMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                {/* Product */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Выберите товар</label>
                  <select 
                    {...register('productId')}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-200"
                  >
                    <option value="">-- Выбрать --</option>
                    {products?.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (остаток: {p.stock_quantity} шт.)
                      </option>
                    ))}
                  </select>
                  {errors.productId && (
                    <span className="text-[10px] text-red-400 mt-0.5">{errors.productId.message}</span>
                  )}
                </div>

                {/* Qty */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Количество к добавлению (шт.)</label>
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

                {/* Cost price */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Новая себестоимость (сомони)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    {...register('costPrice')}
                    className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-200"
                  />
                  {errors.costPrice && (
                    <span className="text-[10px] text-red-400 mt-0.5">{errors.costPrice.message}</span>
                  )}
                  {selectedProduct && (
                    <span className="text-[10px] text-slate-500 mt-0.5">Текущая себестоимость: {selectedProduct.cost_price} сомони</span>
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
                  disabled={supplyMutation.isPending}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all disabled:opacity-50 mt-2"
                >
                  {supplyMutation.isPending ? 'Загрузка...' : 'Сохранить поставку'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

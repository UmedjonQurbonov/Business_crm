'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ShieldAlert, CheckCircle } from 'lucide-react';
import api from '../../../services/api';
import { Product, Client } from '../../../types';

export default function WholesaleTab() {
  const queryClient = useQueryClient();

  // Fetch Products & Clients
  const { data: products } = useQuery<Product[]>({ queryKey: ['products_full'] });
  const { data: clients } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => {
      const response = await api.get('/api/clients/');
      return response.data;
    }
  });

  // State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'cash' | 'debt' | 'partial_debt'>('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [orderItems, setOrderItems] = useState<{ product_id: number; quantity: number; fact_price: string }[]>([]);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Cart Add Item Form State
  const [cartProductId, setCartProductId] = useState('');
  const [cartQty, setCartQty] = useState(1);
  const [cartPrice, setCartPrice] = useState('');

  const cartProduct = products?.find(p => p.id === Number(cartProductId));

  useEffect(() => {
    if (cartProduct) {
      setCartPrice(cartProduct.wholesale_price);
    } else {
      setCartPrice('');
    }
  }, [cartProductId, cartProduct]);

  const handleAddItem = () => {
    if (!cartProductId) return;
    if (cartQty <= 0) {
      setFormError('Количество должно быть больше 0');
      return;
    }
    if (!cartPrice || Number(cartPrice) <= 0) {
      setFormError('Укажите корректную цену продажи');
      return;
    }
    if (cartProduct && cartProduct.stock_quantity < cartQty) {
      setFormError(`Недостаточно товара ${cartProduct.name} на складе. Доступно: ${cartProduct.stock_quantity}`);
      return;
    }

    const newItem = {
      product_id: Number(cartProductId),
      quantity: cartQty,
      fact_price: cartPrice
    };

    setOrderItems([...orderItems, newItem]);
    setCartProductId('');
    setCartQty(1);
    setCartPrice('');
    setFormError('');
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  // Submit Mutation
  const createWholesaleMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        client: Number(selectedClientId),
        payment_status: paymentStatus,
        items: orderItems.map(item => ({
          product: item.product_id,
          quantity: item.quantity,
          fact_price: item.fact_price
        }))
      };
      if (paymentStatus === 'partial_debt' && paidAmount) {
        payload.paid_amount = paidAmount;
      }
      const response = await api.post('/api/transactions/wholesale/', payload);
      return response.data;
    },
    onSuccess: () => {
      setSuccessMsg('Оптовая продажа успешно зарегистрирована!');
      queryClient.invalidateQueries({ queryKey: ['products_full'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setSelectedClientId('');
      setPaymentStatus('cash');
      setPaidAmount('');
      setOrderItems([]);
      setFormError('');
      setTimeout(() => setSuccessMsg(''), 2000);
    },
    onError: (error: any) => {
      setFormError(error.response?.data?.detail || error.response?.data?.paid_amount?.[0] || 'Ошибка при проведении продажи');
    }
  });

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      setFormError('Выберите клиента');
      return;
    }
    if (orderItems.length === 0) {
      setFormError('Добавьте хотя бы один товар в корзину');
      return;
    }
    if (paymentStatus === 'partial_debt') {
      if (!paidAmount || Number(paidAmount) <= 0) {
        setFormError('Укажите полученную сумму');
        return;
      }
      const total = orderItems.reduce((acc, item) => acc + (Number(item.fact_price) * item.quantity), 0);
      if (Number(paidAmount) >= total) {
        setFormError('При частичной оплате полученная сумма должна быть меньше общей суммы сделки');
        return;
      }
    }
    setFormError('');
    createWholesaleMutation.mutate();
  };

  const totalAmount = orderItems.reduce((acc, item) => acc + (Number(item.fact_price) * item.quantity), 0);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-bold text-slate-300">Оформление оптового заказа</h2>

      {successMsg ? (
        <div className="p-6 rounded-xl border border-green-500/20 bg-green-500/[0.02] text-center flex flex-col items-center gap-3">
          <CheckCircle size={36} className="text-green-500" />
          <p className="text-xs font-semibold text-slate-200">{successMsg}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmitOrder} className="p-4 rounded-xl border border-slate-900 bg-slate-900/30 flex flex-col gap-4">
          {/* Client select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Выберите клиента</label>
            <select 
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-200"
            >
              <option value="">-- Клиент --</option>
              {clients?.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} (долг: {c.current_debt} сомони)
                </option>
              ))}
            </select>
          </div>

          {/* Cart */}
          <div className="border border-slate-850 p-3.5 rounded-xl bg-slate-950/40 flex flex-col gap-3">
            <span className="text-xs font-bold text-indigo-400">Корзина товаров</span>
            
            {orderItems.length === 0 ? (
              <div className="text-[10px] text-slate-500 italic py-2 text-center">Корзина пуста</div>
            ) : (
              <div className="flex flex-col gap-2">
                {orderItems.map((item, idx) => {
                  const prod = products?.find(p => p.id === item.product_id);
                  return (
                    <div key={idx} className="flex justify-between items-center text-[10px] bg-slate-950 p-2 rounded-lg border border-slate-900">
                      <div>
                        <span className="font-semibold block text-slate-300">{prod?.name}</span>
                        <span className="text-slate-500">{item.quantity} шт. х {item.fact_price} сомони</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-200">{(Number(item.fact_price) * item.quantity).toFixed(2)} сом.</span>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveItem(idx)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div className="text-right text-xs font-extrabold text-slate-200 pt-2 border-t border-slate-900">
                  Всего: {totalAmount.toFixed(2)} сомони
                </div>
              </div>
            )}

            {/* Add Cart Form */}
            <div className="mt-2 pt-3 border-t border-slate-900 flex flex-col gap-2 bg-slate-950/60 p-3 rounded-lg border border-slate-900">
              <span className="text-[10px] font-bold text-slate-400 block mb-1">Добавить товар в корзину</span>
              <select 
                value={cartProductId}
                onChange={(e) => setCartProductId(e.target.value)}
                className="w-full px-2 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-[11px] text-slate-200"
              >
                <option value="">-- Товар --</option>
                {products?.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (остаток: {p.stock_quantity} шт.)
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <input 
                  type="number" 
                  min="1"
                  placeholder="Количество"
                  value={cartQty}
                  onChange={(e) => setCartQty(Math.max(1, Number(e.target.value)))}
                  className="px-2 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-[11px] text-slate-200"
                />
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="Цена продажи"
                  value={cartPrice}
                  onChange={(e) => setCartPrice(e.target.value)}
                  className="px-2 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-[11px] text-slate-200"
                />
              </div>

              <button 
                type="button"
                onClick={handleAddItem}
                className="w-full py-2 bg-slate-900 hover:bg-slate-850 text-indigo-400 font-bold text-[10px] rounded-lg mt-1 border border-slate-850"
              >
                Добавить в заказ
              </button>
            </div>
          </div>

          {/* Payment Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Тип оплаты</label>
            <div className="grid grid-cols-3 gap-2">
              {(['cash', 'debt', 'partial_debt'] as const).map(status => (
                <button
                  type="button"
                  key={status}
                  onClick={() => {
                    setPaymentStatus(status);
                    if (status !== 'partial_debt') setPaidAmount('');
                  }}
                  className={`py-2 text-[10px] font-bold rounded-lg border transition-all ${
                    paymentStatus === status 
                      ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' 
                      : 'bg-slate-950 border-slate-850 text-slate-400'
                  }`}
                >
                  {status === 'cash' ? 'Наличные' : status === 'debt' ? 'В долг' : 'Частично'}
                </button>
              ))}
            </div>
          </div>

          {/* Paid Amount */}
          {paymentStatus === 'partial_debt' && (
            <div className="flex flex-col gap-1.5 animate-in fade-in">
              <label className="text-xs font-semibold text-slate-400">Полученная сумма (сомони)</label>
              <input 
                type="number" 
                step="0.01"
                placeholder="0.00"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-200"
              />
              <span className="text-[10px] text-slate-500">
                Остаток долга: {totalAmount > 0 ? (totalAmount - Number(paidAmount || 0)).toFixed(2) : '0.00'} сомони
              </span>
            </div>
          )}

          {formError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 flex items-center gap-2">
              <ShieldAlert size={14} />
              <span>{formError}</span>
            </div>
          )}

          <button 
            type="submit"
            disabled={createWholesaleMutation.isPending}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all disabled:opacity-50"
          >
            {createWholesaleMutation.isPending ? 'Загрузка...' : 'Сохранить оптовую продажу'}
          </button>
        </form>
      )}
    </div>
  );
}

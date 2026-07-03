'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  LogOut, Plus, Search, DollarSign, Package, Users, 
  TrendingUp, AlertTriangle, CheckCircle, Calendar,
  CreditCard, ArrowDownRight, ArrowUpRight, ShieldAlert,
  Activity, X
} from 'lucide-react';
import api from '../services/api';
import { Product, Client, Transaction, User, Analytics, Expense } from '../types';

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
    return <LoginPage onLogin={(t, r, u) => {
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

// ----------------- LOGIN PAGE -----------------
function LoginPage({ onLogin }: { onLogin: (token: string, role: 'owner' | 'seller', username: string) => void }) {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/auth/login/', {
        username: usernameInput,
        password: passwordInput,
      });
      return response.data;
    },
    onSuccess: (data) => {
      localStorage.setItem('crm_token', data.token);
      localStorage.setItem('crm_role', data.role);
      localStorage.setItem('crm_username', data.username);
      onLogin(data.token, data.role, data.username);
    },
    onError: (error: any) => {
      setErrorMsg(error.response?.data?.non_field_errors?.[0] || 'Неверный логин или пароль');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput || !passwordInput) {
      setErrorMsg('Пожалуйста, заполните все поля');
      return;
    }
    setErrorMsg('');
    loginMutation.mutate();
  };

  return (
    <div className="mx-auto w-full max-w-[480px] min-h-screen bg-slate-950 flex items-center justify-center p-6 border-x border-slate-900 shadow-2xl">
      <div className="w-full max-w-sm flex flex-col gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-3xl font-extrabold text-white shadow-xl shadow-indigo-500/30">
            D
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-100 mt-2">DISH MICRO-CRM</h1>
          <p className="text-xs text-slate-400">Вход в систему учета посуды</p>
        </div>

        {/* Card Form */}
        <form onSubmit={handleSubmit} className="p-6 rounded-2xl border border-slate-900 bg-slate-900/30 backdrop-blur flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Логин</label>
            <input 
              type="text" 
              placeholder="Введите логин"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none text-sm transition-colors text-slate-100"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Пароль</label>
            <input 
              type="password" 
              placeholder="Введите пароль"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none text-sm transition-colors text-slate-100"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2 mt-2">
              <ShieldAlert size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button 
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full py-3 mt-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-sm font-bold text-white transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {loginMutation.isPending ? 'Загрузка...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ----------------- SELLER DASHBOARD -----------------
function SellerDashboard({ username }: { username: string | null }) {
  const queryClient = useQueryClient();
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch Seller Balance
  const { data: balanceData, refetch: refetchBalance } = useQuery({
    queryKey: ['seller_balance'],
    queryFn: async () => {
      const response = await api.get('/api/sellers/me/balance/');
      return response.data;
    }
  });

  // Fetch Products for dropdown
  const { data: products } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get('/api/products/');
      return response.data;
    }
  });

  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState(1);
  const [factPrice, setFactPrice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [formError, setFormError] = useState('');

  const selectedProduct = products?.find(p => p.id === Number(selectedProductId));

  // Initialize Price when product selected
  useEffect(() => {
    if (selectedProduct) {
      setFactPrice(selectedProduct.wholesale_price);
    } else {
      setFactPrice('');
    }
  }, [selectedProductId, selectedProduct]);

  // Handle sale checkout
  const createSaleMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/transactions/retail/', {
        items: [
          {
            product: Number(selectedProductId),
            quantity: qty,
            fact_price: factPrice
          }
        ],
        payment_status: 'cash'
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Calculate earnings: Profit = (P_fact - P_opt) * Q. Seller Share = Profit * 0.4
      const profit = (Number(factPrice) - Number(selectedProduct?.wholesale_price)) * qty;
      const sellerShare = profit > 0 ? (profit * 0.4).toFixed(2) : '0.00';
      
      setSuccessMsg(`Продажа оформлена! Ваш заработок: +${sellerShare} сомони`);
      refetchBalance();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setSelectedProductId('');
      setQty(1);
      setFactPrice('');
      setFormError('');
      
      // Auto close modal after 3 seconds
      setTimeout(() => {
        setSuccessMsg('');
        setShowSaleModal(false);
      }, 3000);
    },
    onError: (error: any) => {
      const apiErr = error.response?.data?.detail || error.response?.data?.non_field_errors?.[0] || 'Ошибка при проведении продажи';
      setFormError(apiErr);
    }
  });

  const handleSaveSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setFormError('Выберите товар');
      return;
    }
    if (qty <= 0) {
      setFormError('Количество должно быть больше 0');
      return;
    }
    if (!factPrice || Number(factPrice) <= 0) {
      setFormError('Укажите корректную цену продажи');
      return;
    }
    if (selectedProduct && selectedProduct.stock_quantity < qty) {
      setFormError(`Недостаточно товара на складе. Доступно: ${selectedProduct.stock_quantity}`);
      return;
    }
    setFormError('');
    createSaleMutation.mutate();
  };

  // Filter products by search query
  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Earnings Summary Card */}
      <div className="p-6 rounded-2xl border border-indigo-900/30 bg-gradient-to-br from-indigo-950/60 to-slate-900/60 shadow-xl flex flex-col items-center justify-center gap-2 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
        <TrendingUp size={24} className="text-indigo-400 mb-1" />
        <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Мой заработок сегодня</span>
        <span className="text-3xl font-black text-white">{balanceData?.unpaid_balance || '0.00'} сомони</span>
      </div>

      {/* Action Button */}
      <button 
        onClick={() => setShowSaleModal(true)}
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
                setFormError('');
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
              <form onSubmit={handleSaveSale} className="flex flex-col gap-4">
                {/* Product Search & Dropdown */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Выберите посуду</label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3 text-slate-500" size={14} />
                    <input 
                      type="text"
                      placeholder="Поиск по названию..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs transition-colors text-slate-200"
                    />
                  </div>

                  <select 
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs transition-colors text-slate-200 mt-1"
                  >
                    <option value="">-- Нажмите для выбора --</option>
                    {filteredProducts?.map(p => (
                      <option key={p.id} value={p.id} disabled={p.stock_quantity <= 0}>
                        {p.name} (категория: {p.category}) - в наличии: {p.stock_quantity} шт. [Базовая: {p.wholesale_price} сомони]
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Количество (шт.)</label>
                  <input 
                    type="number" 
                    min="1"
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                    className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs transition-colors text-slate-200"
                  />
                </div>

                {/* Fact Price */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Фактическая розничная цена за 1 шт (сомони)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    value={factPrice}
                    onChange={(e) => setFactPrice(e.target.value)}
                    className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs transition-colors text-slate-200"
                  />
                  {selectedProduct && (
                    <div className="text-[10px] text-slate-500 mt-0.5 flex justify-between">
                      <span>Базовая оптовая цена: {selectedProduct.wholesale_price} сомони</span>
                      {Number(factPrice) > Number(selectedProduct.wholesale_price) && (
                        <span className="text-green-500">Прибыль сделки: +{((Number(factPrice) - Number(selectedProduct.wholesale_price)) * qty).toFixed(2)} сомони</span>
                      )}
                    </div>
                  )}
                </div>

                {formError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 flex items-center gap-2">
                    <ShieldAlert size={14} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={createSaleMutation.isPending}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 mt-2"
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

// ----------------- OWNER DASHBOARD -----------------
type TabType = 'stock' | 'wholesale' | 'expenses' | 'analytics' | 'clients';

function OwnerDashboard() {
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

// 1. Stock Tab
function StockTab() {
  const queryClient = useQueryClient();
  const [showSupplyModal, setShowSupplyModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qtyToAdd, setQtyToAdd] = useState(1);
  const [newCostPrice, setNewCostPrice] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch Products
  const { data: products } = useQuery<Product[]>({
    queryKey: ['products_full'],
    queryFn: async () => {
      const response = await api.get('/api/products/');
      return response.data;
    }
  });

  const selectedProduct = products?.find(p => p.id === Number(selectedProductId));

  useEffect(() => {
    if (selectedProduct) {
      setNewCostPrice(selectedProduct.cost_price || '');
    } else {
      setNewCostPrice('');
    }
  }, [selectedProductId, selectedProduct]);

  // Supply Mutation
  const supplyMutation = useMutation({
    mutationFn: async () => {
      const currentQty = selectedProduct?.stock_quantity || 0;
      const updatedData: any = {
        stock_quantity: currentQty + qtyToAdd,
      };
      if (newCostPrice) {
        updatedData.cost_price = newCostPrice;
      }
      const response = await api.patch(`/api/products/${selectedProductId}/`, updatedData);
      return response.data;
    },
    onSuccess: () => {
      setSuccessMsg('Поставка успешно оформлена!');
      queryClient.invalidateQueries({ queryKey: ['products_full'] });
      setSelectedProductId('');
      setQtyToAdd(1);
      setNewCostPrice('');
      setTimeout(() => {
        setSuccessMsg('');
        setShowSupplyModal(false);
      }, 1500);
    },
    onError: (error: any) => {
      setFormError(error.response?.data?.detail || 'Ошибка при сохранении поставки');
    }
  });

  const handleSaveSupply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setFormError('Выберите товар');
      return;
    }
    if (qtyToAdd <= 0) {
      setFormError('Количество должно быть больше 0');
      return;
    }
    if (!newCostPrice || Number(newCostPrice) < 0) {
      setFormError('Укажите корректную себестоимость');
      return;
    }
    setFormError('');
    supplyMutation.mutate();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold text-slate-300">Товары на складе</h2>
        <button 
          onClick={() => setShowSupplyModal(true)}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center gap-1 transition-colors"
        >
          <Plus size={14} />
          Поставка
        </button>
      </div>

      {/* Products list */}
      <div className="flex flex-col gap-2.5">
        {products?.map(p => {
          const isLow = p.stock_quantity <= p.min_stock_level;
          return (
            <div 
              key={p.id}
              className={`p-4 rounded-xl border flex flex-col gap-1 transition-colors bg-slate-900/40 ${
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
                  <span className="text-slate-500 block">Себест. (Owner)</span>
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
                setFormError('');
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
              <form onSubmit={handleSaveSupply} className="flex flex-col gap-4">
                {/* Product Dropdown */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Выберите товар</label>
                  <select 
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs transition-colors text-slate-200"
                  >
                    <option value="">-- Выбрать --</option>
                    {products?.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (остаток: {p.stock_quantity} шт.)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Qty */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Количество к добавлению (шт.)</label>
                  <input 
                    type="number" 
                    min="1"
                    value={qtyToAdd}
                    onChange={(e) => setQtyToAdd(Math.max(1, Number(e.target.value)))}
                    className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs transition-colors text-slate-200"
                  />
                </div>

                {/* New Cost Price */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Новая себестоимость за 1 шт (сомони)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    value={newCostPrice}
                    onChange={(e) => setNewCostPrice(e.target.value)}
                    className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs transition-colors text-slate-200"
                  />
                  {selectedProduct && (
                    <span className="text-[10px] text-slate-500 mt-0.5">Текущая себестоимость: {selectedProduct.cost_price} сомони</span>
                  )}
                </div>

                {formError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 flex items-center gap-2">
                    <ShieldAlert size={14} />
                    <span>{formError}</span>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={supplyMutation.isPending}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 mt-2"
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

// 2. Wholesale Tab (Wholesale sale checkout)
function WholesaleTab() {
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

  // State for order creation
  const [selectedClientId, setSelectedClientId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'cash' | 'debt' | 'partial_debt'>('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [orderItems, setOrderItems] = useState<{ product_id: number; quantity: number; fact_price: string }[]>([]);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Add Item to cart
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
    if (cartQty <= 0) return;
    if (!cartPrice || Number(cartPrice) < 0) return;

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

  // Submit Order Mutation
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
      if (!paidAmount || Number(paidAmount) < 0) {
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
          {/* Client Select */}
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
                  {c.name} (текущий долг: {c.current_debt} сомони)
                </option>
              ))}
            </select>
          </div>

          {/* Cart Section */}
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

            {/* Add Item form */}
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
                    {p.name} (на складе: {p.stock_quantity} шт.)
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

          {/* Paid Amount for Partial Debt */}
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
                Остаток долга (запишется клиенту): {totalAmount > 0 ? (totalAmount - Number(paidAmount || 0)).toFixed(2) : '0.00'} сомони
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
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            {createWholesaleMutation.isPending ? 'Загрузка...' : 'Сохранить оптовую продажу'}
          </button>
        </form>
      )}
    </div>
  );
}

// 3. Clients & Repayment Tab
function ClientsTab() {
  const queryClient = useQueryClient();
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [repayAmount, setRepayAmount] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch Clients
  const { data: clients } = useQuery<Client[]>({ queryKey: ['clients'] });

  const selectedClient = clients?.find(c => c.id === Number(selectedClientId));

  // Repayment Mutation
  const repayMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/api/clients/${selectedClientId}/repay/`, {
        amount: repayAmount
      });
      return response.data;
    },
    onSuccess: () => {
      setSuccessMsg('Оплата принята, долг клиента уменьшен!');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setSelectedClientId('');
      setRepayAmount('');
      setFormError('');
      setTimeout(() => {
        setSuccessMsg('');
        setShowRepayModal(false);
      }, 1500);
    },
    onError: (error: any) => {
      setFormError(error.response?.data?.detail || error.response?.data?.amount?.[0] || 'Ошибка при проведении платежа');
    }
  });

  const handleSaveRepay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      setFormError('Выберите клиента');
      return;
    }
    if (!repayAmount || Number(repayAmount) <= 0) {
      setFormError('Укажите корректную сумму погашения');
      return;
    }
    if (selectedClient && Number(repayAmount) > Number(selectedClient.current_debt)) {
      setFormError(`Сумма превышает текущий долг клиента (${selectedClient.current_debt} сомони)`);
      return;
    }
    setFormError('');
    repayMutation.mutate();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold text-slate-300">Клиенты и долги</h2>
        <button 
          onClick={() => setShowRepayModal(true)}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center gap-1 transition-colors"
        >
          <Plus size={14} />
          Погасить долг
        </button>
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
                setFormError('');
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
              <form onSubmit={handleSaveRepay} className="flex flex-col gap-4">
                {/* Client Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Выберите клиента</label>
                  <select 
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-200"
                  >
                    <option value="">-- Выбрать клиента --</option>
                    {clients?.filter(c => Number(c.current_debt) > 0).map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} (долг: {c.current_debt} сомони)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Сумма платежа (сомони)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    value={repayAmount}
                    onChange={(e) => setRepayAmount(e.target.value)}
                    className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-200"
                  />
                  {selectedClient && (
                    <span className="text-[10px] text-slate-500 mt-0.5">Текущий долг: {selectedClient.current_debt} сомони</span>
                  )}
                </div>

                {formError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 flex items-center gap-2">
                    <ShieldAlert size={14} />
                    <span>{formError}</span>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={repayMutation.isPending}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 mt-2"
                >
                  {repayMutation.isPending ? 'Загрузка...' : 'Внести оплату'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 4. Expenses Tab
function ExpensesTab() {
  const queryClient = useQueryClient();
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch Expenses
  const { data: expenses } = useQuery<Expense[]>({
    queryKey: ['expenses'],
    queryFn: async () => {
      const response = await api.get('/api/expenses/');
      return response.data;
    }
  });

  // Expense Mutation
  const expenseMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/expenses/', {
        amount,
        description
      });
      return response.data;
    },
    onSuccess: () => {
      setSuccessMsg('Расход зафиксирован!');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setAmount('');
      setDescription('');
      setFormError('');
      setTimeout(() => {
        setSuccessMsg('');
        setShowExpenseModal(false);
      }, 1500);
    },
    onError: (error: any) => {
      setFormError(error.response?.data?.detail || 'Ошибка при сохранении расходов');
    }
  });

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setFormError('Укажите корректную сумму расхода');
      return;
    }
    if (!description.trim()) {
      setFormError('Укажите описание расхода');
      return;
    }
    setFormError('');
    expenseMutation.mutate();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold text-slate-300">Расходы компании</h2>
        <button 
          onClick={() => setShowExpenseModal(true)}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center gap-1 transition-colors"
        >
          <Plus size={14} />
          Расход
        </button>
      </div>

      {/* Expenses list */}
      <div className="flex flex-col gap-2.5">
        {expenses?.map(exp => (
          <div key={exp.id} className="p-4 rounded-xl border border-slate-900 bg-slate-900/40 flex justify-between items-center">
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
                setFormError('');
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
              <form onSubmit={handleSaveExpense} className="flex flex-col gap-4">
                {/* Amount */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Сумма расхода (сомони)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-200"
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Описание (на что потрачено)</label>
                  <input 
                    type="text" 
                    placeholder="Например: Обед, Транспорт, Аренда..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-200"
                  />
                </div>

                {formError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 flex items-center gap-2">
                    <ShieldAlert size={14} />
                    <span>{formError}</span>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={expenseMutation.isPending}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 mt-2"
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

// 5. Analytics Tab
function AnalyticsTab() {
  const queryClient = useQueryClient();
  const todayStr = new Date().toLocaleDateString('en-CA');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  // Fetch Sellers List for salary checkout
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

  // Salary Payout Mutation
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

      {/* Analytics Values */}
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
              <div key={seller.id} className="p-4 rounded-xl border border-slate-900 bg-slate-900/40 flex justify-between items-center">
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

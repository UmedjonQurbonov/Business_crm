'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import api from '../../../services/api';
import { loginSchema, LoginInput } from '../../../lib/validation';

interface LoginFormProps {
  onLogin: (token: string, role: 'owner' | 'seller', username: string) => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [errorMsg, setErrorMsg] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginInput) => {
      const response = await api.post('/api/auth/login/', {
        username: data.username,
        password: data.password,
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

  const onSubmit = (data: LoginInput) => {
    setErrorMsg('');
    loginMutation.mutate(data);
  };

  return (
    <div className="mx-auto w-full max-w-[480px] min-h-screen bg-slate-950 flex items-center justify-center p-6 border-x border-slate-900 shadow-2xl">
      <div className="w-full max-w-sm flex flex-col gap-8">
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-3xl font-extrabold text-white shadow-xl shadow-indigo-500/30">
            D
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-100 mt-2">DISH MICRO-CRM</h1>
          <p className="text-xs text-slate-400">Вход в систему учета посуды</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 rounded-2xl border border-slate-900 bg-slate-900/30 backdrop-blur flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Логин</label>
            <input 
              type="text" 
              placeholder="Введите логин"
              {...register('username')}
              className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none text-sm transition-colors text-slate-100"
            />
            {errors.username && (
              <span className="text-[10px] text-red-400 mt-0.5">{errors.username.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Пароль</label>
            <input 
              type="password" 
              placeholder="Введите пароль"
              {...register('password')}
              className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none text-sm transition-colors text-slate-100"
            />
            {errors.password && (
              <span className="text-[10px] text-red-400 mt-0.5">{errors.password.message}</span>
            )}
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
            className="w-full py-3 mt-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-sm font-bold text-white transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 active:scale-[0.98] disabled:opacity-50"
          >
            {loginMutation.isPending ? 'Загрузка...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}

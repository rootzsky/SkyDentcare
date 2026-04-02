/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Stethoscope, ShieldCheck, Lock, Mail } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { auth, googleProvider, signInWithPopup } from '../firebase';
import { toast } from 'sonner';

interface LoginProps {
  onLogin: (role: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [captcha, setCaptcha] = useState({ a: 0, b: 0, result: 0 });
  const [captchaInput, setCaptchaInput] = useState('');

  React.useEffect(() => {
    generateCaptcha();
  }, []);

  const generateCaptcha = () => {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    setCaptcha({ a, b, result: a + b });
    setCaptchaInput('');
  };

  const validateCaptcha = () => {
    if (parseInt(captchaInput) !== captcha.result) {
      toast.error('Captcha salah. Silakan coba lagi.');
      generateCaptcha();
      return false;
    }
    return true;
  };

  const handleGoogleLogin = async () => {
    if (!validateCaptcha()) return;
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Berhasil masuk dengan Google');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Gagal masuk dengan Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCaptcha()) return;
    toast.info('Login email saat ini dinonaktifkan. Silakan gunakan Google Login.');
  };

  return (
    <div className="min-h-screen bg-pop-bg flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated background blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pop-pink/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pop-blue/10 rounded-full blur-[120px] animate-pulse delay-700"></div>
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-pop-purple/5 rounded-full blur-[100px] animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-pop-card rounded-3xl border-2 border-pop-pink pop-shadow-pink mb-2 shadow-xl">
            <Stethoscope className="h-12 w-12 text-pop-pink" />
          </div>
          <h1 className="text-5xl font-black text-pop-text tracking-tighter uppercase italic">
            Denta<span className="text-pop-blue">Care</span> <span className="text-pop-pink">RME</span>
          </h1>
          <p className="text-pop-blue font-bold tracking-widest uppercase text-xs">Sistem Rekam Medis Elektronik Terintegrasi</p>
        </div>

        <Card className="bg-pop-card border-2 border-pop-blue/20 shadow-2xl pop-shadow-blue rounded-[2rem] overflow-hidden">
          <CardHeader className="space-y-2 pt-10 pb-2">
            <CardTitle className="text-3xl font-black text-center text-pop-text uppercase italic">Selamat Datang</CardTitle>
            <CardDescription className="text-center text-gray-500 font-medium uppercase tracking-widest text-[10px]">
              Akses sistem dengan akun Google Anda
            </CardDescription>
          </CardHeader>
          <CardContent className="p-10 pt-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-5">
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-pop-pink group-focus-within:text-pop-blue transition-colors" />
                  <Input
                    type="email"
                    placeholder="Email Institusi"
                    className="pl-12 h-14 bg-gray-50 border-gray-200 text-pop-text placeholder:text-gray-400 focus:border-pop-blue focus:ring-pop-blue/20 rounded-2xl transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-pop-pink group-focus-within:text-pop-blue transition-colors" />
                  <Input
                    type="password"
                    placeholder="Kata Sandi"
                    className="pl-12 h-14 bg-gray-50 border-gray-200 text-pop-text placeholder:text-gray-400 focus:border-pop-blue focus:ring-pop-blue/20 rounded-2xl transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-sm font-bold text-pop-text uppercase tracking-wider">Captcha: {captcha.a} + {captcha.b} = ?</span>
                    <button type="button" onClick={generateCaptcha} className="text-[10px] font-bold text-pop-blue hover:text-pop-pink uppercase tracking-tighter transition-colors">Ganti Captcha</button>
                  </div>
                  <Input
                    type="number"
                    placeholder="Hasil Captcha"
                    className="h-14 bg-gray-50 border-gray-200 text-pop-text placeholder:text-gray-400 focus:border-pop-blue focus:ring-pop-blue/20 rounded-2xl transition-all"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between px-2">
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <div className="w-5 h-5 border-2 border-gray-200 rounded bg-gray-50 flex items-center justify-center group-hover:border-pop-pink transition-colors">
                    <input type="checkbox" className="hidden" />
                    <div className="w-2 h-2 bg-pop-pink rounded-sm opacity-0 group-hover:opacity-50 transition-opacity"></div>
                  </div>
                  <span className="text-sm text-gray-500 group-hover:text-pop-text transition-colors">Ingat saya</span>
                </label>
                <a href="#" className="text-sm font-bold text-pop-blue hover:text-pop-pink transition-colors uppercase tracking-tighter">Lupa kata sandi?</a>
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 text-lg font-black bg-pop-pink hover:bg-pop-purple text-white rounded-2xl shadow-lg shadow-pop-pink/20 transition-all uppercase italic tracking-wider"
                disabled={isLoading}
              >
                {isLoading ? 'Memproses...' : 'Masuk ke Sistem'}
              </Button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-100" />
                </div>
                <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.3em]">
                  <span className="bg-pop-card px-4 text-gray-400">Atau masuk dengan</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-14 flex items-center justify-center space-x-4 border-2 border-pop-blue/30 hover:border-pop-blue bg-transparent text-pop-text rounded-2xl transition-all group"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="h-6 w-6 group-hover:scale-110 transition-transform" alt="Google" />
                <span className="font-black uppercase italic tracking-wider">Google Login</span>
              </Button>
            </form>

            <div className="mt-10 pt-8 border-t border-gray-100 flex flex-col items-center space-y-4">
              <div className="flex items-center space-x-3 text-pop-green">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Enkripsi AES-256 Terjamin</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center space-y-6">
          <p className="text-[10px] text-gray-400 font-medium leading-relaxed max-w-[280px] mx-auto uppercase tracking-wider">
            Sesuai dengan Peraturan Menteri Kesehatan RI Nomor 24 Tahun 2022 tentang Rekam Medis.
          </p>
          <div className="flex justify-center space-x-8 items-center">
            <img src="https://picsum.photos/seed/kemenkes/100/40" alt="Kemenkes RI" className="h-6 grayscale opacity-30 hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
            <img src="https://picsum.photos/seed/who/100/40" alt="WHO" className="h-6 grayscale opacity-30 hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
          </div>
        </div>
      </div>
    </div>
  );
}

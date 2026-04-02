/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Terjadi kesalahan yang tidak terduga.";
      let errorDetail = this.state.error?.message;

      try {
        // Check if it's a Firestore error JSON
        if (errorDetail && errorDetail.startsWith('{')) {
          const parsed = JSON.parse(errorDetail);
          if (parsed.error && parsed.error.includes('Missing or insufficient permissions')) {
            errorMessage = "Akses Ditolak: Anda tidak memiliki izin untuk melakukan tindakan ini.";
            errorDetail = `Operasi: ${parsed.operationType}, Path: ${parsed.path}`;
          }
        }
      } catch (e) {
        // Not a JSON error, use default
      }

      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
          {/* Animated background blobs */}
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pop-pink/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pop-blue/20 rounded-full blur-[120px] animate-pulse delay-700" />

          <Card className="max-w-md w-full border-2 border-gray-800 bg-pop-card/50 backdrop-blur-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden">
            <CardHeader className="text-center p-10 pb-6">
              <div className="mx-auto bg-red-500/20 p-5 rounded-3xl w-fit mb-6 border-2 border-red-500/30 shadow-lg shadow-red-500/10">
                <AlertTriangle className="h-10 w-10 text-red-500" />
              </div>
              <CardTitle className="text-3xl font-black text-white uppercase italic tracking-tighter">Ups! Ada Masalah</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8 p-10 pt-0 text-center">
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs leading-relaxed">{errorMessage}</p>
              {errorDetail && (
                <div className="bg-black/60 p-6 rounded-2xl text-[10px] font-black font-mono text-red-500/80 break-all text-left border-2 border-red-500/20 uppercase tracking-widest leading-loose">
                  {errorDetail}
                </div>
              )}
              <Button onClick={this.handleReset} variant="primary" className="w-full flex items-center justify-center space-x-4 py-8 rounded-2xl group transition-all duration-500">
                <RefreshCcw className="h-5 w-5 group-hover:rotate-180 transition-transform duration-700" />
                <span className="font-black uppercase tracking-widest text-xs">Muat Ulang Aplikasi</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

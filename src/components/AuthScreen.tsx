import React, { useState } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import { Shield, Lock, Mail, Server, AlertCircle, ArrowRight, UserPlus, LogIn, ChevronRight, FileCheck } from 'lucide-react';

interface AuthScreenProps {
  onSessionActive: () => void;
}

export default function AuthScreen({ onSessionActive }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured || !supabase) {
      setError('Supabase não está configurado. Por favor, defina as variáveis no arquivo .env.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        // Sign Up with email and password
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });

        if (signUpError) throw signUpError;
        
        if (data.user && data.session) {
          // Instantly logged in
          onSessionActive();
        } else {
          setMessage('Cadastro realizado com sucesso! Verifique seu e-mail para confirmação de conta se necessário.');
        }
      } else {
        // Sign In
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        onSessionActive();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocorreu um erro ao processar a autenticação.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-height-screen min-h-screen bg-[#0f1419] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-radial from-[rgba(212,165,116,0.15)] to-transparent pointer-events-none blur-3xl"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-radial from-[rgba(124,179,128,0.1)] to-transparent pointer-events-none blur-3xl"></div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Logo/Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-[#1a2030] border border-[#2d3548] mb-4 text-[#d4a574] shadow-xl shadow-black/40">
            <FileCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-[#d4a574]">
            LICITA PLUS
          </h1>
          <p className="text-xs text-[#8892a6] mt-1.5 font-mono max-w-sm mx-auto leading-relaxed">
            Geração automatizada de documentos para processos licitatórios
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-[#1a2030] border border-[#2d3548] rounded-xl shadow-2xl p-8 relative overflow-hidden backdrop-blur-md">
          <h2 className="text-xl font-serif font-semibold text-[#e8ebf0] mb-2 flex items-center gap-2">
            <span>{isSignUp ? 'Criar Nova Conta' : 'Acesse sua Conta'}</span>
          </h2>
          <p className="text-xs text-[#8892a6] mb-6">
            {isSignUp 
              ? 'Cadastre-se para salvaguardar seus certames na nuvem de forma privada.' 
              : 'Faça login para gerenciar suas licitações na nuvem.'}
          </p>

          {!isConfigured && (
            <div className="mb-6 p-4 rounded-lg bg-[rgba(217,119,87,0.15)] border border-[#d97757]/30 text-xs text-[#d97757] flex gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Aviso: Banco de dados desconfigurado</p>
                <p className="mt-1 text-[11px] leading-relaxed text-[#e8ebf0]/80">
                  Por favor, defina as credenciais de banco de dados para habilitar a persistência em nuvem.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-xs text-[#d97757] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-xs text-[#7cb380] flex items-center gap-2">
              <LogIn className="w-4 h-4 flex-shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs uppercase font-mono text-[#8892a6] tracking-wider mb-1">
                  Nome Completo
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#8892a6]">
                    <UserPlus className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#e8ebf0] placeholder-[#8892a6]/50 focus:border-[#d4a574] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs uppercase font-mono text-[#8892a6] tracking-wider mb-1">
                E-mail Corporativo
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#8892a6]">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@empresa.com"
                  className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#e8ebf0] placeholder-[#8892a6]/50 focus:border-[#d4a574] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase font-mono text-[#8892a6] tracking-wider mb-1">
                Senha Segura
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#8892a6]">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#e8ebf0] placeholder-[#8892a6]/50 focus:border-[#d4a574] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || (!isConfigured)}
              className="w-full py-3 bg-[#d4a574] hover:bg-[#e0b585] disabled:bg-[#8a6d4a] disabled:opacity-40 disabled:cursor-not-allowed text-[#0f1419] font-semibold rounded-lg text-sm transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl shadow-[#d4a574]/10 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#0f1419] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>{isSignUp ? 'Registrar Conta' : 'Conectar com Segurança'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Tab */}
          <div className="mt-6 pt-6 border-t border-[#2d3548] text-center">
            {isSignUp ? (
              <p className="text-xs text-[#8892a6]">
                Já possui uma conta?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="text-[#d4a574] hover:underline focus:outline-none font-semibold cursor-pointer"
                >
                  Fazer login
                </button>
              </p>
            ) : (
              <p className="text-xs text-[#8892a6]">
                Não tem conta corporativa?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="text-[#d4a574] hover:underline focus:outline-none font-semibold cursor-pointer"
                >
                  Registrar-se agora
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Security Footer Notice */}
        <p className="text-[11px] text-[#8892a6]/60 text-center mt-8 leading-relaxed">
          <Shield className="w-3 h-3 inline-block mr-1 align-baseline text-[#7cb380]" />
          Seus dados são transmitidos com criptografia SSL fim-a-fim e governados por regras rígidas de segurança diretamente na infraestrutura do banco de dados.
        </p>

      </div>
    </div>
  );
}

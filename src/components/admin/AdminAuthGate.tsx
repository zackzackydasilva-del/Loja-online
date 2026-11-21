import React, { useState } from 'react';
import { ArrowLeft, Lock } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const AdminAuthGate: React.FC = () => {
  const { adminAuthMode, loginAdmin, setupAdmin, setActiveAppView } = useStore();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isSetup = adminAuthMode === 'setup';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSetup && password !== confirmPassword) {
      setError('As palavras-passe não coincidem.');
      return;
    }

    setSubmitting(true);
    const result = isSetup ? await setupAdmin(password) : await loginAdmin(password);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error || 'Acesso recusado.');
    }
  };

  return (
    <div className="min-h-screen bg-[#DFDFDC] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[28px] p-8 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.14)] border border-black/5 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1C1C1E] text-white flex items-center justify-center font-serif text-lg font-semibold">
              L
            </div>
            <div>
              <p className="text-sm font-bold text-[#1C1C1E]">Lunora Gestão</p>
              <p className="text-[11px] text-[#72726E]">Acesso reservado à equipa</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveAppView('storefront')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#555552] hover:text-[#1C1C1E] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar à Loja</span>
          </button>
        </div>

        {adminAuthMode === 'loading' ? (
          <div className="py-8 text-center text-sm text-[#72726E]">
            A verificar estado de acesso...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-[#1C1C1E]">
                {isSetup ? 'Definir Palavra-Passe de Gestão' : 'Iniciar Sessão de Gestão'}
              </h2>
              <p className="text-xs text-[#6A6A66] leading-relaxed">
                {isSetup
                  ? 'Crie uma palavra-passe para proteger o painel de encomendas, inventário e clientes.'
                  : 'Introduza a palavra-passe do painel para gerir produtos e encomendas.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#555552] mb-1">
                Palavra-passe
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8A8A85] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={4}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  className="w-full border border-black/15 rounded-xl pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1C1C1E]"
                  autoFocus
                />
              </div>
            </div>

            {isSetup && (
              <div>
                <label className="block text-xs font-medium text-[#555552] mb-1">
                  Confirmar palavra-passe
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a palavra-passe"
                  className="w-full border border-black/15 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1C1C1E]"
                />
              </div>
            )}

            {error && (
              <p className="text-xs text-red-700 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#1C1C1E] text-white text-sm font-medium rounded-full hover:bg-[#323235] disabled:opacity-60 transition-colors cursor-pointer"
            >
              {submitting
                ? 'A validar...'
                : isSetup
                ? 'Guardar e Entrar no Painel'
                : 'Entrar no Painel'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

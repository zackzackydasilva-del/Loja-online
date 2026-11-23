import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  LayoutTemplate,
  Lock,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { DEFAULT_STOREFRONT_CONFIG } from '../../data/seedData';
import { useStore } from '../../context/StoreContext';
import { StorefrontConfig } from '../../types/store';
import { ImageField } from './ImageField';

type SettingsSection = 'geral' | 'banner' | 'catalogo_rodape';

function mergeStorefrontConfig(cfg?: Partial<StorefrontConfig>): StorefrontConfig {
  return {
    ...DEFAULT_STOREFRONT_CONFIG,
    ...cfg,
    navLabels: {
      ...DEFAULT_STOREFRONT_CONFIG.navLabels,
      ...(cfg?.navLabels || {}),
    },
    heroSlides:
      cfg?.heroSlides && cfg.heroSlides.length > 0
        ? cfg.heroSlides
        : DEFAULT_STOREFRONT_CONFIG.heroSlides,
    heroTrustBadges:
      cfg?.heroTrustBadges && cfg.heroTrustBadges.length > 0
        ? cfg.heroTrustBadges
        : DEFAULT_STOREFRONT_CONFIG.heroTrustBadges,
    categoryStripItems:
      cfg?.categoryStripItems && cfg.categoryStripItems.length > 0
        ? cfg.categoryStripItems
        : DEFAULT_STOREFRONT_CONFIG.categoryStripItems,
    editorialCards:
      cfg?.editorialCards && cfg.editorialCards.length > 0
        ? cfg.editorialCards
        : DEFAULT_STOREFRONT_CONFIG.editorialCards,
    promoBanners:
      cfg?.promoBanners && cfg.promoBanners.length > 0
        ? cfg.promoBanners
        : DEFAULT_STOREFRONT_CONFIG.promoBanners,
    guarantees:
      cfg?.guarantees && cfg.guarantees.length > 0
        ? cfg.guarantees
        : DEFAULT_STOREFRONT_CONFIG.guarantees,
    newsletter: {
      ...DEFAULT_STOREFRONT_CONFIG.newsletter,
      ...(cfg?.newsletter || {}),
    },
    footer: {
      ...DEFAULT_STOREFRONT_CONFIG.footer,
      ...(cfg?.footer || {}),
    },
  };
}

export const AdminSettings: React.FC = () => {
  const {
    settings,
    updateSettings,
    toggleIntegration,
    addIntegration,
    resetDemoData,
    adminManagedByEnv,
    changeAdminPassword,
  } = useStore();

  const [section, setSection] = useState<SettingsSection>('geral');

  const [storeName, setStoreName] = useState(settings.storeName);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol || 'Kz');
  const [threshold, setThreshold] = useState(String(settings.freeShippingThreshold));
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail);
  const [sf, setSf] = useState<StorefrontConfig>(() =>
    mergeStorefrontConfig(settings.storefrontConfig)
  );

  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [saveError, setSaveError] = useState('');
  const hasUnsavedChangesRef = useRef(false);

  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelRole, setNewChannelRole] = useState('');

  const [confirmClear, setConfirmClear] = useState(false);
  const [clearingData, setClearingData] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'ok' | 'err'; msg: string } | null>(
    null
  );
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (hasUnsavedChangesRef.current) return;
    setStoreName(settings.storeName);
    setCurrencySymbol(settings.currencySymbol || 'Kz');
    setThreshold(String(settings.freeShippingThreshold));
    setSupportEmail(settings.supportEmail);
    setSf(mergeStorefrontConfig(settings.storefrontConfig));
  }, [settings]);

  const updateSfDraft = (nextSf: StorefrontConfig) => {
    hasUnsavedChangesRef.current = true;
    setSf(nextSf);
  };

  const persistStorefrontDraft = async (nextSf: StorefrontConfig) => {
    setSf(nextSf);
    setSaving(true);
    setSaveError('');
    setSavedNotice(false);
    try {
      await updateSettings({
        storeName: storeName.trim() || 'Lunora Fashion',
        currencySymbol: currencySymbol.trim() || 'Kz',
        freeShippingThreshold: Math.max(0, Number(threshold) || 0),
        supportEmail: supportEmail.trim(),
        storefrontConfig: nextSf,
      });
      hasUnsavedChangesRef.current = false;
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (err) {
      hasUnsavedChangesRef.current = true;
      setSaveError(err instanceof Error ? err.message : 'Erro ao guardar alterações.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await persistStorefrontDraft(sf);
  };

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    await addIntegration(newChannelName.trim(), newChannelRole.trim());
    setNewChannelName('');
    setNewChannelRole('');
  };

  const handleClearData = async () => {
    setClearingData(true);
    try {
      await resetDemoData();
      setConfirmClear(false);
    } finally {
      setClearingData(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);
    if (newPassword.trim().length < 4) {
      setPasswordStatus({ type: 'err', msg: 'Mínimo 4 caracteres para a nova palavra-passe.' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordStatus({ type: 'err', msg: 'A confirmação da palavra-passe não coincide.' });
      return;
    }
    setSavingPassword(true);
    const res = await changeAdminPassword(currentPassword, newPassword);
    setSavingPassword(false);
    if (res.ok) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordStatus({
        type: 'ok',
        msg: 'Palavra-passe atualizada e guardada no Supabase.',
      });
    } else {
      setPasswordStatus({ type: 'err', msg: res.error || 'Erro ao atualizar.' });
    }
  };

  const tabs: {
    id: SettingsSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'geral', label: 'Geral, Marca & Menu', icon: SlidersHorizontal },
    { id: 'banner', label: 'Banner Principal da Loja', icon: Sparkles },
    { id: 'catalogo_rodape', label: 'Catálogo, Código Promo & Rodapé', icon: LayoutTemplate },
  ];

  return (
    <div className="space-y-5">
      {/* Sub-navigation & Save Action Bar */}
      <div className="bg-white rounded-[24px] p-3 sm:p-4 border border-black/5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = section === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSection(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#1C1C1E] text-white'
                    : 'bg-[#F5F4F0] text-[#555552] hover:text-[#1C1C1E]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {savedNotice && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <Check className="w-4 h-4" />
              <span>Guardado na loja</span>
            </span>
          )}
          {saveError && <span className="text-xs text-red-700">{saveError}</span>}
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSaveAll()}
            className="px-5 py-2.5 bg-[#1C1C1E] text-white text-xs font-medium rounded-full hover:bg-[#323235] disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
          >
            {saving ? 'A guardar...' : 'Guardar Alterações'}
          </button>
        </div>
      </div>

      {/* SECTION 1: GERAL, MARCA & MENU */}
      {section === 'geral' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7 space-y-5">
            <form
              onSubmit={handleSaveAll}
              className="bg-white rounded-[24px] p-6 border border-black/5 space-y-4"
            >
              <h3 className="text-base font-semibold text-[#1C1C1E]">
                Identidade, Moeda & Menu da Loja
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#555552] mb-1">
                    Nome Comercial da Loja
                  </label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full border border-black/15 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1C1C1E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#555552] mb-1">
                    Logótipo Escrito no Topo & Rodapé
                  </label>
                  <input
                    type="text"
                    value={sf.headerWordmark}
                    onChange={(e) => setSf({ ...sf, headerWordmark: e.target.value })}
                    className="w-full border border-black/15 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1C1C1E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#555552] mb-1">
                    Símbolo da Moeda
                  </label>
                  <input
                    type="text"
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    placeholder="Kz"
                    className="w-full font-mono border border-black/15 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1C1C1E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#555552] mb-1">
                    Limiar de Envio Gratuito ({currencySymbol || 'Kz'})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="w-full font-mono tabular-nums border border-black/15 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1C1C1E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#555552] mb-1">
                    Email de Apoio ao Cliente
                  </label>
                  <input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="w-full border border-black/15 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1C1C1E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#555552] mb-1">
                    Título de Boas-Vindas no Painel
                  </label>
                  <input
                    type="text"
                    value={sf.adminGreeting}
                    onChange={(e) => setSf({ ...sf, adminGreeting: e.target.value })}
                    className="w-full border border-black/15 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1C1C1E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#555552] mb-1">
                  Aviso no Topo da Loja (Pagamento na Entrega)
                </label>
                <input
                  type="text"
                  value={sf.topNoticeText || ''}
                  onChange={(e) => setSf({ ...sf, topNoticeText: e.target.value })}
                  placeholder="Pagamento feito apenas na entrega · Pague apenas quando receber a sua encomenda"
                  className="w-full border border-black/15 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1C1C1E]"
                />
              </div>

              <div className="pt-2 border-t border-black/6 space-y-3">
                <p className="text-xs font-semibold text-[#1C1C1E]">
                  Links do Menu Superior da Loja
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-[#72726E] mb-1">Coleções</label>
                    <input
                      type="text"
                      value={sf.navLabels.collections}
                      onChange={(e) =>
                        setSf({
                          ...sf,
                          navLabels: { ...sf.navLabels, collections: e.target.value },
                        })
                      }
                      className="w-full border border-black/15 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#1C1C1E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#72726E] mb-1">Vestuário</label>
                    <input
                      type="text"
                      value={sf.navLabels.apparel}
                      onChange={(e) =>
                        setSf({
                          ...sf,
                          navLabels: { ...sf.navLabels, apparel: e.target.value },
                        })
                      }
                      className="w-full border border-black/15 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#1C1C1E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#72726E] mb-1">Acessórios</label>
                    <input
                      type="text"
                      value={sf.navLabels.accessories}
                      onChange={(e) =>
                        setSf({
                          ...sf,
                          navLabels: { ...sf.navLabels, accessories: e.target.value },
                        })
                      }
                      className="w-full border border-black/15 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#1C1C1E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#72726E] mb-1">Saldos</label>
                    <input
                      type="text"
                      value={sf.navLabels.sale}
                      onChange={(e) =>
                        setSf({
                          ...sf,
                          navLabels: { ...sf.navLabels, sale: e.target.value },
                        })
                      }
                      className="w-full border border-black/15 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#1C1C1E]"
                    />
                  </div>
                </div>
              </div>
            </form>

            {/* Segurança & Acesso */}
            <section className="bg-white rounded-[24px] p-6 border border-black/5 space-y-4">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#1C1C1E]" />
                <h3 className="text-base font-semibold text-[#1C1C1E]">
                  Palavra-Passe de Acesso à Gestão
                </h3>
              </div>

              {adminManagedByEnv ? (
                <div className="rounded-2xl bg-[#F6F6F4] p-4 text-xs text-[#444440] leading-relaxed space-y-1.5">
                  <p className="font-medium text-[#1C1C1E]">
                    A palavra-passe está definida na variável de servidor{' '}
                    <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-black/10">
                      ADMIN_PASSCODE
                    </code>
                    .
                  </p>
                  <p>
                    Para alterá-la, atualize a variável{' '}
                    <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-black/10">
                      ADMIN_PASSCODE
                    </code>{' '}
                    nas definições do servidor ou remova-a para passar a gerir a palavra-passe
                    diretamente aqui.
                  </p>
                </div>
              ) : (
                <form onSubmit={handlePasswordSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#555552] mb-1">Atual</label>
                      <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full border border-black/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#555552] mb-1">
                        Nova Palavra-Passe
                      </label>
                      <input
                        type="password"
                        required
                        minLength={4}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full border border-black/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#555552] mb-1">
                        Confirmar
                      </label>
                      <input
                        type="password"
                        required
                        minLength={4}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="w-full border border-black/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
                      />
                    </div>
                  </div>

                  {passwordStatus && (
                    <p
                      className={`text-xs px-3 py-2 rounded-xl ${
                        passwordStatus.type === 'ok'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {passwordStatus.msg}
                    </p>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={savingPassword}
                      className="px-5 py-2.5 bg-[#1C1C1E] text-white text-xs font-medium rounded-full hover:bg-[#323235] disabled:opacity-60 cursor-pointer"
                    >
                      {savingPassword ? 'A guardar...' : 'Atualizar Palavra-Passe'}
                    </button>
                  </div>
                </form>
              )}
            </section>
          </div>

          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white rounded-[24px] p-6 border border-black/5 space-y-4">
              <h3 className="text-base font-semibold text-[#1C1C1E]">Canais & Integrações</h3>

              {settings.integrations.length === 0 ? (
                <p className="text-xs text-[#8A8A85]">
                  Nenhum canal externo ligado. Adicione abaixo quando precisar.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {settings.integrations.map((int) => (
                    <div
                      key={int.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#F6F6F4]"
                    >
                      <div>
                        <p className="text-xs font-semibold text-[#1C1C1E]">{int.name}</p>
                        <p className="text-[11px] text-[#72726E]">{int.role}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleIntegration(int.id)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-medium cursor-pointer transition-colors ${
                          int.connected
                            ? 'bg-[#1C1C1E] text-white'
                            : 'bg-white border border-black/15 text-[#555552]'
                        }`}
                      >
                        {int.connected ? 'Ativo' : 'Desligado'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAddChannel} className="pt-2 border-t border-black/6 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="Canal (ex: Multicaixa Express)"
                    className="border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
                  />
                  <input
                    type="text"
                    value={newChannelRole}
                    onChange={(e) => setNewChannelRole(e.target.value)}
                    placeholder="Função (ex: Pagamentos)"
                    className="border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#F2F1EE] hover:bg-[#E5E4DF] text-[#1C1C1E] text-xs font-medium rounded-xl cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Canal</span>
                </button>
              </form>
            </div>

            <div className="bg-[#1C1C1E] text-white rounded-[24px] p-6 space-y-3">
              <h3 className="text-sm font-semibold">Limpar Registos & Atividades</h3>
              <p className="text-xs text-white/65 leading-relaxed">
                Remove todos os produtos, encomendas, clientes, custos, tarefas, objetivos e
                movimentos de inventário, mantendo as personalizações visuais da loja.
              </p>

              {confirmClear ? (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={clearingData}
                    onClick={handleClearData}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-full cursor-pointer disabled:opacity-60"
                  >
                    {clearingData ? 'A limpar...' : 'Confirmar Limpeza Total'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="px-4 py-2 bg-[#28282B] hover:bg-[#343438] text-xs font-medium rounded-full cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#28282B] hover:bg-[#343438] text-xs font-medium rounded-full cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Limpar Registos & Atividades</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: BANNER PRINCIPAL DA LOJA (Textos, Botão & Slides/Miniaturas) */}
      {section === 'banner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-5 bg-white rounded-[24px] p-6 border border-black/5 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-[#1C1C1E]">
                Textos & Botão do Banner Escuro
              </h3>
              <p className="text-[11px] text-[#72726E] mt-0.5">
                Estes detalhes aparecem diretamente no cartão escuro principal no topo da loja.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#555552] mb-1">
                Título em Destaque (exibido em maiúsculas)
              </label>
              <input
                type="text"
                value={sf.heroTitle}
                onChange={(e) => updateSfDraft({ ...sf, heroTitle: e.target.value })}
                placeholder="Ex: Essenciais da Estação"
                className="w-full border border-black/15 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#555552] mb-1">
                Subtítulo Curto (até 2 linhas no banner)
              </label>
              <textarea
                rows={3}
                value={sf.heroSubtitle}
                onChange={(e) => updateSfDraft({ ...sf, heroSubtitle: e.target.value })}
                className="w-full border border-black/15 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#555552] mb-1">
                Texto do Botão Branco (CTA)
              </label>
              <input
                type="text"
                value={sf.heroPrimaryCta}
                onChange={(e) => updateSfDraft({ ...sf, heroPrimaryCta: e.target.value })}
                placeholder="Ex: Explorar Coleção"
                className="w-full border border-black/15 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
              />
            </div>
          </div>

          <div className="lg:col-span-7 bg-white rounded-[24px] p-6 border border-black/5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-[#1C1C1E]">
                  Slides & Miniaturas do Banner ({sf.heroSlides.length})
                </h3>
                <p className="text-[11px] text-[#72726E] mt-0.5">
                  As primeiras 3 imagens aparecem como miniaturas clicáveis no banner e nos pontos de navegação por baixo. Tamanho ideal:{' '}
                  <span className="font-mono font-semibold text-[#1C1C1E]">900 × 1050 px</span>{' '}
                  (vertical 4:5 · mín. 700 × 820 px).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextNum = String(sf.heroSlides.length + 1).padStart(2, '0');
                  updateSfDraft({
                    ...sf,
                    heroSlides: [
                      ...sf.heroSlides,
                      {
                        index: nextNum,
                        image: '',
                        caption: `Look ${nextNum}`,
                      },
                    ],
                  });
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#1C1C1E] text-white text-xs font-medium cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Slide</span>
              </button>
            </div>

            <div className="space-y-4">
              {sf.heroSlides.map((slide, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-[#F6F6F4] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-semibold text-[#1C1C1E]">
                      Slide {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="flex items-center gap-3">
                      {slide.image?.trim() && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...sf.heroSlides];
                            next[idx] = { ...next[idx], image: '' };
                            persistStorefrontDraft({ ...sf, heroSlides: next });
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-[#555552] hover:text-[#1C1C1E] hover:underline cursor-pointer"
                        >
                          <span>Remover Imagem</span>
                        </button>
                      )}
                      {sf.heroSlides.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const filtered = sf.heroSlides
                              .filter((_, i) => i !== idx)
                              .map((item, i) => ({
                                ...item,
                                index: String(i + 1).padStart(2, '0'),
                              }));
                            persistStorefrontDraft({ ...sf, heroSlides: filtered });
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-red-700 hover:underline cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remover Slide</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#555552] mb-1">
                      Descrição / Alt da Imagem
                    </label>
                    <input
                      type="text"
                      value={slide.caption}
                      onChange={(e) => {
                        const next = [...sf.heroSlides];
                        next[idx] = { ...next[idx], caption: e.target.value };
                        updateSfDraft({ ...sf, heroSlides: next });
                      }}
                      className="w-full bg-white border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
                    />
                  </div>

                  <ImageField
                    label="Fotografia do Banner"
                    recommendedSize="900 × 1050 px (vertical 4:5 · mín. 700 × 820 px)"
                    value={slide.image}
                    allowEmpty
                    uploadFolder="banners"
                    onChange={(url) => {
                      const next = [...sf.heroSlides];
                      next[idx] = { ...next[idx], image: url };
                      const nextSf = { ...sf, heroSlides: next };
                      const shouldAutoSave =
                        url === '' ||
                        url.startsWith('data:image/') ||
                        url.includes('/storage/v1/object/public/') ||
                        url.startsWith('/src/assets/images/');
                      if (shouldAutoSave) {
                        persistStorefrontDraft(nextSf);
                      } else {
                        updateSfDraft(nextSf);
                      }
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-end gap-3 border-t border-black/6">
              {savedNotice && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <Check className="w-4 h-4" />
                  <span>Banner guardado permanentemente</span>
                </span>
              )}
              {saveError && <span className="text-xs text-red-700">{saveError}</span>}
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSaveAll()}
                className="px-5 py-2.5 bg-[#1C1C1E] text-white text-xs font-medium rounded-full hover:bg-[#323235] disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
              >
                {saving ? 'A guardar...' : 'Guardar Banner'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: CATÁLOGO, CÓDIGO PROMO & RODAPÉ */}
      {section === 'catalogo_rodape' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-6 space-y-5">
            <section className="bg-white rounded-[24px] p-6 border border-black/5 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-[#1C1C1E]">
                  Secção de Produtos & Cupão do Saco
                </h3>
                <p className="text-[11px] text-[#72726E] mt-0.5">
                  Personaliza o título principal acima dos cartões de produtos e o código promocional de 10% no carrinho.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#555552] mb-1">
                  Título da Secção de Artigos
                </label>
                <input
                  type="text"
                  value={sf.catalogTitle}
                  onChange={(e) => setSf({ ...sf, catalogTitle: e.target.value })}
                  placeholder="Ex: Novos Artigos Populares"
                  className="w-full border border-black/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#555552] mb-1">
                  Código Promocional Ativo no Saco (10% desconto)
                </label>
                <input
                  type="text"
                  value={sf.newsletter.promoCode}
                  onChange={(e) =>
                    setSf({
                      ...sf,
                      newsletter: { ...sf.newsletter, promoCode: e.target.value.toUpperCase() },
                    })
                  }
                  placeholder="Ex: LUNORA10"
                  className="w-full font-mono border border-black/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
                />
              </div>
            </section>
          </div>

          <div className="lg:col-span-6 bg-white rounded-[24px] p-6 border border-black/5 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-[#1C1C1E]">
                Textos Visíveis no Rodapé da Loja
              </h3>
              <p className="text-[11px] text-[#72726E] mt-0.5">
                Atualiza apenas os blocos escritos que aparecem no rodapé branco atual.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#555552] mb-1">
                Descrição da Marca (Tagline)
              </label>
              <textarea
                rows={2}
                value={sf.footer.tagline}
                onChange={(e) =>
                  setSf({ ...sf, footer: { ...sf.footer, tagline: e.target.value } })
                }
                className="w-full border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#555552] mb-1">
                  Título da Subscrição (Rodapé)
                </label>
                <input
                  type="text"
                  value={sf.footer.newsletterTitle}
                  onChange={(e) =>
                    setSf({ ...sf, footer: { ...sf.footer, newsletterTitle: e.target.value } })
                  }
                  className="w-full border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#555552] mb-1">
                  Texto da Subscrição (Rodapé)
                </label>
                <input
                  type="text"
                  value={sf.footer.newsletterDescription}
                  onChange={(e) =>
                    setSf({
                      ...sf,
                      footer: { ...sf.footer, newsletterDescription: e.target.value },
                    })
                  }
                  className="w-full border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-black/6">
              <div>
                <label className="block text-xs font-medium text-[#555552] mb-1">
                  Localização / Prazo de Entrega
                </label>
                <input
                  type="text"
                  value={sf.footer.locationText}
                  onChange={(e) =>
                    setSf({ ...sf, footer: { ...sf.footer, locationText: e.target.value } })
                  }
                  className="w-full border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#555552] mb-1">
                  Direitos de Autor
                </label>
                <input
                  type="text"
                  value={sf.footer.copyrightText}
                  onChange={(e) =>
                    setSf({ ...sf, footer: { ...sf.footer, copyrightText: e.target.value } })
                  }
                  className="w-full border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

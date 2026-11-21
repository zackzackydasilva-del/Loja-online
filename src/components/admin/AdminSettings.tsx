import React, { useEffect, useState } from 'react';
import {
  Check,
  Image as ImageIcon,
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
import { ProductCategory, StorefrontConfig } from '../../types/store';
import { ImageField } from './ImageField';

type SettingsSection = 'geral' | 'hero' | 'banners' | 'rodape';

const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Mulher',
  'Homem',
  'Vestidos',
  'Tops',
  'Calçado',
  'Malas',
  'Acessórios',
  'Saldos',
];

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
    setStoreName(settings.storeName);
    setCurrencySymbol(settings.currencySymbol || 'Kz');
    setThreshold(String(settings.freeShippingThreshold));
    setSupportEmail(settings.supportEmail);
    setSf(mergeStorefrontConfig(settings.storefrontConfig));
  }, [settings]);

  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSavedNotice(false);
    try {
      await updateSettings({
        storeName: storeName.trim() || 'Lunora Fashion',
        currencySymbol: currencySymbol.trim() || 'Kz',
        freeShippingThreshold: Math.max(0, Number(threshold) || 0),
        supportEmail: supportEmail.trim(),
        storefrontConfig: sf,
      });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao guardar alterações.');
    } finally {
      setSaving(false);
    }
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
    { id: 'geral', label: 'Geral & Moeda', icon: SlidersHorizontal },
    { id: 'hero', label: 'Banner Principal & Lookbook', icon: Sparkles },
    { id: 'banners', label: 'Banners & Categorias', icon: ImageIcon },
    { id: 'rodape', label: 'Catálogo, Newsletter & Rodapé', icon: LayoutTemplate },
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

      {/* SECTION 1: GERAL & MOEDA */}
      {section === 'geral' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7 space-y-5">
            <form
              onSubmit={handleSaveAll}
              className="bg-white rounded-[24px] p-6 border border-black/5 space-y-4"
            >
              <h3 className="text-base font-semibold text-[#1C1C1E]">
                Identidade, Moeda & Navegação da Loja
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
                    Marca no Cabeçalho / Rodapé
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

              <div className="pt-2 border-t border-black/6 space-y-3">
                <p className="text-xs font-semibold text-[#1C1C1E]">
                  Etiquetas do Menu Principal da Loja
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
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
                  <div>
                    <label className="block text-[11px] text-[#72726E] mb-1">Botão Gestão</label>
                    <input
                      type="text"
                      value={sf.navLabels.admin}
                      onChange={(e) =>
                        setSf({
                          ...sf,
                          navLabels: { ...sf.navLabels, admin: e.target.value },
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
                Remove todos os produtos, encomendas, clientes, tarefas, objetivos e movimentos de
                inventário, mantendo as personalizações visuais da loja.
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

      {/* SECTION 2: BANNER PRINCIPAL & LOOKBOOK */}
      {section === 'hero' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-6 bg-white rounded-[24px] p-6 border border-black/5 space-y-4">
            <h3 className="text-base font-semibold text-[#1C1C1E]">Textos do Banner Principal</h3>

            <div>
              <label className="block text-xs font-medium text-[#555552] mb-1">
                Etiqueta Superior (Eyebrow)
              </label>
              <input
                type="text"
                value={sf.heroEyebrow}
                onChange={(e) => setSf({ ...sf, heroEyebrow: e.target.value })}
                className="w-full border border-black/15 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#555552] mb-1">
                Título Principal
              </label>
              <input
                type="text"
                value={sf.heroTitle}
                onChange={(e) => setSf({ ...sf, heroTitle: e.target.value })}
                className="w-full border border-black/15 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#555552] mb-1">Subtítulo</label>
              <textarea
                rows={3}
                value={sf.heroSubtitle}
                onChange={(e) => setSf({ ...sf, heroSubtitle: e.target.value })}
                className="w-full border border-black/15 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#555552] mb-1">
                  Botão Primário
                </label>
                <input
                  type="text"
                  value={sf.heroPrimaryCta}
                  onChange={(e) => setSf({ ...sf, heroPrimaryCta: e.target.value })}
                  className="w-full border border-black/15 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#555552] mb-1">
                  Botão Secundário (Lookbook)
                </label>
                <input
                  type="text"
                  value={sf.heroSecondaryCta}
                  onChange={(e) => setSf({ ...sf, heroSecondaryCta: e.target.value })}
                  className="w-full border border-black/15 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-black/6 space-y-3">
              <p className="text-xs font-semibold text-[#1C1C1E]">
                3 Destaques de Confiança abaixo do Banner
              </p>
              {sf.heroTrustBadges.map((badge, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-[#F6F6F4] p-3 rounded-xl">
                  <input
                    type="text"
                    value={badge.title}
                    onChange={(e) => {
                      const next = [...sf.heroTrustBadges];
                      next[idx] = { ...next[idx], title: e.target.value };
                      setSf({ ...sf, heroTrustBadges: next });
                    }}
                    placeholder="Título"
                    className="bg-white border border-black/12 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  />
                  <input
                    type="text"
                    value={badge.subtitle}
                    onChange={(e) => {
                      const next = [...sf.heroTrustBadges];
                      next[idx] = { ...next[idx], subtitle: e.target.value };
                      setSf({ ...sf, heroTrustBadges: next });
                    }}
                    placeholder="Subtítulo"
                    className="bg-white border border-black/12 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 bg-white rounded-[24px] p-6 border border-black/5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-[#1C1C1E]">
                  Imagens do Banner Principal / Lookbook ({sf.heroSlides.length})
                </h3>
                <p className="text-[11px] text-[#72726E] mt-0.5">
                  Tamanho ideal: <span className="font-mono font-semibold text-[#1C1C1E]">1200 × 1400 px</span> (vertical 4:5 · mínimo 900 × 1050 px)
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextNum = String(sf.heroSlides.length + 1).padStart(2, '0');
                  setSf({
                    ...sf,
                    heroSlides: [
                      ...sf.heroSlides,
                      {
                        index: nextNum,
                        image: sf.heroSlides[0]?.image || DEFAULT_STOREFRONT_CONFIG.heroSlides[0].image,
                        caption: `Editorial Boutique · Look ${nextNum}`,
                      },
                    ],
                  });
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#1C1C1E] text-white text-xs font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Slide</span>
              </button>
            </div>

            <div className="space-y-4">
              {sf.heroSlides.map((slide, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-[#F6F6F4] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-[#1C1C1E]">
                      Slide {String(idx + 1).padStart(2, '0')}
                    </span>
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
                          setSf({ ...sf, heroSlides: filtered });
                        }}
                        className="inline-flex items-center gap-1 text-[11px] text-red-700 hover:underline cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#555552] mb-1">Legenda</label>
                    <input
                      type="text"
                      value={slide.caption}
                      onChange={(e) => {
                        const next = [...sf.heroSlides];
                        next[idx] = { ...next[idx], caption: e.target.value };
                        setSf({ ...sf, heroSlides: next });
                      }}
                      className="w-full bg-white border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
                    />
                  </div>

                  <ImageField
                    label="Fotografia do Banner"
                    recommendedSize="1200 × 1400 px (vertical 4:5 · mín. 900 × 1050 px)"
                    value={slide.image}
                    onChange={(url) => {
                      const next = [...sf.heroSlides];
                      next[idx] = { ...next[idx], image: url };
                      setSf({ ...sf, heroSlides: next });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: BANNERS & CATEGORIAS */}
      {section === 'banners' && (
        <div className="space-y-5">
          {/* Promo Banners */}
          <section className="bg-white rounded-[24px] p-6 border border-black/5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-[#1C1C1E]">
                  Banners Promocionais ({sf.promoBanners.length})
                </h3>
                <p className="text-[11px] text-[#72726E] mt-0.5">
                  Tamanho ideal da foto lateral: <span className="font-mono font-semibold text-[#1C1C1E]">900 × 960 px</span> (retrato/quadrado ~1:1 · mínimo 600 × 640 px)
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSf({
                    ...sf,
                    promoBanners: [
                      ...sf.promoBanners,
                      {
                        eyebrow: 'Campanha Especial',
                        title: 'Nova Seleção\nEm Destaque',
                        ctaText: 'Explorar',
                        targetCategory: 'Todos',
                        image: DEFAULT_STOREFRONT_CONFIG.promoBanners[0].image,
                      },
                    ],
                  })
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#1C1C1E] text-white text-xs font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Banner</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {sf.promoBanners.map((banner, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-[#F6F6F4] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#1C1C1E]">
                      Banner #{idx + 1}
                    </span>
                    {sf.promoBanners.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setSf({
                            ...sf,
                            promoBanners: sf.promoBanners.filter((_, i) => i !== idx),
                          })
                        }
                        className="inline-flex items-center gap-1 text-[11px] text-red-700 hover:underline cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-[#555552] mb-1">Etiqueta</label>
                      <input
                        type="text"
                        value={banner.eyebrow}
                        onChange={(e) => {
                          const next = [...sf.promoBanners];
                          next[idx] = { ...next[idx], eyebrow: e.target.value };
                          setSf({ ...sf, promoBanners: next });
                        }}
                        className="w-full bg-white border border-black/15 rounded-xl px-3 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#555552] mb-1">
                        Categoria Destino
                      </label>
                      <select
                        value={banner.targetCategory}
                        onChange={(e) => {
                          const next = [...sf.promoBanners];
                          next[idx] = {
                            ...next[idx],
                            targetCategory: e.target.value as ProductCategory | 'Todos',
                          };
                          setSf({ ...sf, promoBanners: next });
                        }}
                        className="w-full bg-white border border-black/15 rounded-xl px-3 py-1.5 text-xs"
                      >
                        <option value="Todos">Todos</option>
                        {PRODUCT_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#555552] mb-1">
                      Título (use Enter para quebra de linha)
                    </label>
                    <textarea
                      rows={2}
                      value={banner.title}
                      onChange={(e) => {
                        const next = [...sf.promoBanners];
                        next[idx] = { ...next[idx], title: e.target.value };
                        setSf({ ...sf, promoBanners: next });
                      }}
                      className="w-full bg-white border border-black/15 rounded-xl px-3 py-1.5 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#555552] mb-1">Texto do Botão</label>
                    <input
                      type="text"
                      value={banner.ctaText}
                      onChange={(e) => {
                        const next = [...sf.promoBanners];
                        next[idx] = { ...next[idx], ctaText: e.target.value };
                        setSf({ ...sf, promoBanners: next });
                      }}
                      className="w-full bg-white border border-black/15 rounded-xl px-3 py-1.5 text-xs"
                    />
                  </div>

                  <ImageField
                    label="Imagem do Banner"
                    recommendedSize="900 × 960 px (retrato/quadrado · mín. 600 × 640 px)"
                    compact
                    value={banner.image}
                    onChange={(url) => {
                      const next = [...sf.promoBanners];
                      next[idx] = { ...next[idx], image: url };
                      setSf({ ...sf, promoBanners: next });
                    }}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Editorial Collection Cards */}
          <section className="bg-white rounded-[24px] p-6 border border-black/5 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-[#1C1C1E]">
                Secção de Coleções & Cartões Editoriais
              </h3>
              <p className="text-[11px] text-[#72726E] mt-0.5">
                Tamanho ideal dos 4 cartões: <span className="font-mono font-semibold text-[#1C1C1E]">800 × 1000 px</span> (vertical 4:5 · mínimo 600 × 750 px)
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#555552] mb-1">Etiqueta</label>
                <input
                  type="text"
                  value={sf.collectionsEyebrow}
                  onChange={(e) => setSf({ ...sf, collectionsEyebrow: e.target.value })}
                  className="w-full border border-black/15 rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#555552] mb-1">
                  Título da Secção
                </label>
                <input
                  type="text"
                  value={sf.collectionsTitle}
                  onChange={(e) => setSf({ ...sf, collectionsTitle: e.target.value })}
                  className="w-full border border-black/15 rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#555552] mb-1">
                  Link de Ação
                </label>
                <input
                  type="text"
                  value={sf.collectionsActionText}
                  onChange={(e) => setSf({ ...sf, collectionsActionText: e.target.value })}
                  className="w-full border border-black/15 rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              {sf.editorialCards.map((card, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-[#F6F6F4] space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-[#555552] mb-1">Título do Cartão</label>
                      <input
                        type="text"
                        value={card.title}
                        onChange={(e) => {
                          const next = [...sf.editorialCards];
                          next[idx] = { ...next[idx], title: e.target.value };
                          setSf({ ...sf, editorialCards: next });
                        }}
                        className="w-full bg-white border border-black/15 rounded-xl px-3 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#555552] mb-1">Categoria</label>
                      <select
                        value={card.category}
                        onChange={(e) => {
                          const next = [...sf.editorialCards];
                          next[idx] = {
                            ...next[idx],
                            category: e.target.value as ProductCategory,
                          };
                          setSf({ ...sf, editorialCards: next });
                        }}
                        className="w-full bg-white border border-black/15 rounded-xl px-3 py-1.5 text-xs"
                      >
                        {PRODUCT_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <ImageField
                    label="Imagem Editorial"
                    recommendedSize="800 × 1000 px (vertical 4:5 · mín. 600 × 750 px)"
                    compact
                    value={card.image}
                    onChange={(url) => {
                      const next = [...sf.editorialCards];
                      next[idx] = { ...next[idx], image: url };
                      setSf({ ...sf, editorialCards: next });
                    }}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Category Strip Items */}
          <section className="bg-white rounded-[24px] p-6 border border-black/5 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-[#1C1C1E]">
                Barra de Categorias Circulares ({sf.categoryStripItems.length})
              </h3>
              <p className="text-[11px] text-[#72726E] mt-0.5">
                Tamanho ideal das miniaturas: <span className="font-mono font-semibold text-[#1C1C1E]">400 × 400 px</span> (quadrado 1:1 · recorte circular automático)
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {sf.categoryStripItems.map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-[#F6F6F4] space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                    <div>
                      <label className="block text-[11px] text-[#555552] mb-1">Etiqueta</label>
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => {
                          const next = [...sf.categoryStripItems];
                          next[idx] = { ...next[idx], label: e.target.value };
                          setSf({ ...sf, categoryStripItems: next });
                        }}
                        className="w-full bg-white border border-black/15 rounded-xl px-3 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#555552] mb-1">Categoria</label>
                      <select
                        value={item.category}
                        onChange={(e) => {
                          const next = [...sf.categoryStripItems];
                          next[idx] = {
                            ...next[idx],
                            category: e.target.value as ProductCategory,
                          };
                          setSf({ ...sf, categoryStripItems: next });
                        }}
                        className="w-full bg-white border border-black/15 rounded-xl px-3 py-1.5 text-xs"
                      >
                        {PRODUCT_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs text-[#1C1C1E] py-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(item.isSale)}
                        onChange={(e) => {
                          const next = [...sf.categoryStripItems];
                          next[idx] = { ...next[idx], isSale: e.target.checked };
                          setSf({ ...sf, categoryStripItems: next });
                        }}
                      />
                      <span>Estilo Badge Saldos</span>
                    </label>
                  </div>

                  {!item.isSale && (
                    <ImageField
                      label="Miniatura"
                      recommendedSize="400 × 400 px (quadrado 1:1 · recorte circular)"
                      compact
                      allowEmpty
                      value={item.image}
                      onChange={(url) => {
                        const next = [...sf.categoryStripItems];
                        next[idx] = { ...next[idx], image: url };
                        setSf({ ...sf, categoryStripItems: next });
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* SECTION 4: CATÁLOGO, NEWSLETTER & RODAPÉ */}
      {section === 'rodape' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-6 space-y-5">
            <section className="bg-white rounded-[24px] p-6 border border-black/5 space-y-4">
              <h3 className="text-base font-semibold text-[#1C1C1E]">
                Cabeçalho do Catálogo & Garantias
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#555552] mb-1">
                    Etiqueta do Catálogo
                  </label>
                  <input
                    type="text"
                    value={sf.catalogEyebrow}
                    onChange={(e) => setSf({ ...sf, catalogEyebrow: e.target.value })}
                    className="w-full border border-black/15 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#555552] mb-1">
                    Título do Catálogo
                  </label>
                  <input
                    type="text"
                    value={sf.catalogTitle}
                    onChange={(e) => setSf({ ...sf, catalogTitle: e.target.value })}
                    className="w-full border border-black/15 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-black/6">
                <p className="text-xs font-semibold text-[#1C1C1E]">4 Cartões de Garantia</p>
                {sf.guarantees.map((g, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-[#F6F6F4] p-3 rounded-xl"
                  >
                    <input
                      type="text"
                      value={g.title}
                      onChange={(e) => {
                        const next = [...sf.guarantees];
                        next[idx] = { ...next[idx], title: e.target.value };
                        setSf({ ...sf, guarantees: next });
                      }}
                      placeholder="Título"
                      className="bg-white border border-black/12 rounded-lg px-2.5 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      value={g.subtitle}
                      onChange={(e) => {
                        const next = [...sf.guarantees];
                        next[idx] = { ...next[idx], subtitle: e.target.value };
                        setSf({ ...sf, guarantees: next });
                      }}
                      placeholder="Descrição curta"
                      className="bg-white border border-black/12 rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-[24px] p-6 border border-black/5 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-[#1C1C1E]">Banner de Newsletter</h3>
                <p className="text-[11px] text-[#72726E] mt-0.5">
                  Tamanho ideal da fotografia lateral: <span className="font-mono font-semibold text-[#1C1C1E]">1000 × 600 px</span> (horizontal 5:3 · mínimo 800 × 480 px)
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#555552] mb-1">Etiqueta</label>
                  <input
                    type="text"
                    value={sf.newsletter.eyebrow}
                    onChange={(e) =>
                      setSf({
                        ...sf,
                        newsletter: { ...sf.newsletter, eyebrow: e.target.value },
                      })
                    }
                    className="w-full border border-black/15 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#555552] mb-1">
                    Código Promocional
                  </label>
                  <input
                    type="text"
                    value={sf.newsletter.promoCode}
                    onChange={(e) =>
                      setSf({
                        ...sf,
                        newsletter: { ...sf.newsletter, promoCode: e.target.value },
                      })
                    }
                    className="w-full font-mono border border-black/15 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#555552] mb-1">Título</label>
                  <input
                    type="text"
                    value={sf.newsletter.title}
                    onChange={(e) =>
                      setSf({
                        ...sf,
                        newsletter: { ...sf.newsletter, title: e.target.value },
                      })
                    }
                    className="w-full border border-black/15 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#555552] mb-1">
                    Texto do Botão
                  </label>
                  <input
                    type="text"
                    value={sf.newsletter.buttonText}
                    onChange={(e) =>
                      setSf({
                        ...sf,
                        newsletter: { ...sf.newsletter, buttonText: e.target.value },
                      })
                    }
                    className="w-full border border-black/15 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#555552] mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={sf.newsletter.description}
                  onChange={(e) =>
                    setSf({
                      ...sf,
                      newsletter: { ...sf.newsletter, description: e.target.value },
                    })
                  }
                  className="w-full border border-black/15 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <ImageField
                label="Imagem Lateral da Newsletter"
                recommendedSize="1000 × 600 px (horizontal 5:3 · mín. 800 × 480 px)"
                compact
                value={sf.newsletter.image}
                onChange={(url) =>
                  setSf({ ...sf, newsletter: { ...sf.newsletter, image: url } })
                }
              />
            </section>
          </div>

          <div className="lg:col-span-6 bg-white rounded-[24px] p-6 border border-black/5 space-y-4">
            <h3 className="text-base font-semibold text-[#1C1C1E]">Informações do Rodapé</h3>

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
                className="w-full border border-black/15 rounded-xl px-3 py-2 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  className="w-full border border-black/15 rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#555552] mb-1">
                  Texto de Direitos de Autor
                </label>
                <input
                  type="text"
                  value={sf.footer.copyrightText}
                  onChange={(e) =>
                    setSf({ ...sf, footer: { ...sf.footer, copyrightText: e.target.value } })
                  }
                  className="w-full border border-black/15 rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-black/6">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#555552]">
                  Título Coluna Apoio
                </label>
                <input
                  type="text"
                  value={sf.footer.supportTitle}
                  onChange={(e) =>
                    setSf({ ...sf, footer: { ...sf.footer, supportTitle: e.target.value } })
                  }
                  className="w-full border border-black/15 rounded-xl px-3 py-1.5 text-xs"
                />
                <label className="block text-[11px] text-[#72726E]">
                  Links (um por linha)
                </label>
                <textarea
                  rows={5}
                  value={sf.footer.supportLinks.join('\n')}
                  onChange={(e) =>
                    setSf({
                      ...sf,
                      footer: {
                        ...sf.footer,
                        supportLinks: e.target.value.split('\n').filter((l) => l.trim().length > 0),
                      },
                    })
                  }
                  className="w-full border border-black/15 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#555552]">
                  Título Coluna Atelier
                </label>
                <input
                  type="text"
                  value={sf.footer.atelierTitle}
                  onChange={(e) =>
                    setSf({ ...sf, footer: { ...sf.footer, atelierTitle: e.target.value } })
                  }
                  className="w-full border border-black/15 rounded-xl px-3 py-1.5 text-xs"
                />
                <label className="block text-[11px] text-[#72726E]">
                  Links (um por linha)
                </label>
                <textarea
                  rows={5}
                  value={sf.footer.atelierLinks.join('\n')}
                  onChange={(e) =>
                    setSf({
                      ...sf,
                      footer: {
                        ...sf.footer,
                        atelierLinks: e.target.value.split('\n').filter((l) => l.trim().length > 0),
                      },
                    })
                  }
                  className="w-full border border-black/15 rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-black/6">
              <div>
                <label className="block text-xs font-medium text-[#555552] mb-1">
                  Título Bloco Newsletter Rodapé
                </label>
                <input
                  type="text"
                  value={sf.footer.newsletterTitle}
                  onChange={(e) =>
                    setSf({ ...sf, footer: { ...sf.footer, newsletterTitle: e.target.value } })
                  }
                  className="w-full border border-black/15 rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#555552] mb-1">
                  Descrição Newsletter Rodapé
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
                  className="w-full border border-black/15 rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

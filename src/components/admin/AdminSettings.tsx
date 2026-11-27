import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Bell,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  ImagePlus,
  LayoutTemplate,
  Lock,
  Mail,
  Plus,
  RotateCcw,
  Send,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Volume2,
  Webhook,
} from 'lucide-react';
import { DEFAULT_STOREFRONT_CONFIG } from '../../data/seedData';
import { useStore } from '../../context/StoreContext';
import {
  CategoryRenameEntry,
  CategoryStripItemConfig,
  HighlightCardConfig,
  OrderNotificationRecord,
  ProductCategory,
  SaleWebhookDeliveryRecord,
  StorePopupConfig,
  StorefrontConfig,
} from '../../types/store';
import { formatMoney } from '../../utils/currency';
import { buildCategoryUrl, buildProductUrl } from '../../utils/categoryLinks';
import { compressImageFileToDataUrl } from '../../utils/imageUpload';
import { playOrderNotificationSound } from '../../utils/notificationSound';
import { ImageField } from './ImageField';

type SettingsSection =
  | 'geral'
  | 'banner'
  | 'destaques'
  | 'categorias'
  | 'popups'
  | 'catalogo_rodape';

const MAX_HIGHLIGHTS = 4;

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
    bottomBanner: {
      ...DEFAULT_STOREFRONT_CONFIG.bottomBanner!,
      ...(cfg?.bottomBanner || {}),
      slides:
        cfg?.bottomBanner?.slides && cfg.bottomBanner.slides.length > 0
          ? cfg.bottomBanner.slides
          : DEFAULT_STOREFRONT_CONFIG.bottomBanner!.slides,
    },
    highlights: Array.isArray(cfg?.highlights) ? cfg.highlights.slice(0, MAX_HIGHLIGHTS) : [],
    entryPopup: (() => {
      const merged: StorePopupConfig = {
        ...DEFAULT_STOREFRONT_CONFIG.entryPopup!,
        ...(cfg?.entryPopup || {}),
      };
      const imgs = Array.isArray(merged.images)
        ? merged.images.map((s) => s.trim()).filter(Boolean)
        : [];
      const fallbackImg = merged.image?.trim() || '';
      const finalImgs = imgs.length > 0 ? imgs : fallbackImg ? [fallbackImg] : [];
      return {
        ...merged,
        image: finalImgs[0] || fallbackImg || '',
        images: finalImgs,
      };
    })(),
    postCheckoutPopup: (() => {
      const merged: StorePopupConfig = {
        ...DEFAULT_STOREFRONT_CONFIG.postCheckoutPopup!,
        ...(cfg?.postCheckoutPopup || {}),
      };
      const imgs = Array.isArray(merged.images)
        ? merged.images.map((s) => s.trim()).filter(Boolean)
        : [];
      const fallbackImg = merged.image?.trim() || '';
      const finalImgs = imgs.length > 0 ? imgs : fallbackImg ? [fallbackImg] : [];
      return {
        ...merged,
        image: finalImgs[0] || fallbackImg || '',
        images: finalImgs,
      };
    })(),
    orderNotification: {
      ...DEFAULT_STOREFRONT_CONFIG.orderNotification!,
      ...(cfg?.orderNotification || {}),
    },
    saleWebhook: {
      ...DEFAULT_STOREFRONT_CONFIG.saleWebhook!,
      ...(cfg?.saleWebhook || {}),
    },
    paymentMethods:
      Array.isArray(cfg?.paymentMethods) && cfg.paymentMethods.length > 0
        ? cfg.paymentMethods
        : DEFAULT_STOREFRONT_CONFIG.paymentMethods,
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
    products,
    updateProduct,
    updateSettings,
    toggleIntegration,
    addIntegration,
    resetDemoData,
    adminManagedByEnv,
    changeAdminPassword,
    adminToken,
    setActiveAppView,
    setSelectedCategory,
    setSearchQuery,
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
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const hasUnsavedChangesRef = useRef(false);
  const [categoryRenames, setCategoryRenames] = useState<Record<string, string>>({});
  const [copiedCategoryKey, setCopiedCategoryKey] = useState<string | null>(null);
  const [copiedPopupLinkKey, setCopiedPopupLinkKey] = useState<'entry' | 'postCheckout' | null>(null);
  const [orderNotifications, setOrderNotifications] = useState<OrderNotificationRecord[]>([]);
  const [webhookDeliveries, setWebhookDeliveries] = useState<SaleWebhookDeliveryRecord[]>([]);
  const [webhookEnvConfigured, setWebhookEnvConfigured] = useState(false);
  const [emailTransportInfo, setEmailTransportInfo] = useState<{
    configured: boolean;
    provider: 'resend' | 'smtp' | 'none';
    defaultRecipient: string;
  } | null>(null);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailFeedback, setTestEmailFeedback] = useState<{
    type: 'ok' | 'warn';
    msg: string;
  } | null>(null);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testWebhookFeedback, setTestWebhookFeedback] = useState<{
    type: 'ok' | 'warn';
    msg: string;
  } | null>(null);
  const [showWebhookGuide, setShowWebhookGuide] = useState(false);

  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelRole, setNewChannelRole] = useState('');
  const [newPaymentLabel, setNewPaymentLabel] = useState('');
  const [uploadingPopupBatchKey, setUploadingPopupBatchKey] = useState<'entry' | 'postCheckout' | null>(null);

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
    setCategoryRenames({});
  }, [settings]);

  useEffect(() => {
    if (section !== 'popups' || !adminToken) return;
    let active = true;
    fetch('/api/admin/notifications', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            notifications?: OrderNotificationRecord[];
            webhooks?: SaleWebhookDeliveryRecord[];
            webhookEnvConfigured?: boolean;
            transport?: { configured: boolean; provider: 'resend' | 'smtp' | 'none'; defaultRecipient: string };
          } | null
        ) => {
          if (!active || !data) return;
          if (Array.isArray(data.notifications)) setOrderNotifications(data.notifications);
          if (Array.isArray(data.webhooks)) setWebhookDeliveries(data.webhooks);
          if (typeof data.webhookEnvConfigured === 'boolean') {
            setWebhookEnvConfigured(data.webhookEnvConfigured);
          }
          if (data.transport) setEmailTransportInfo(data.transport);
        }
      )
      .catch(() => {
        // Ignore error
      });
    return () => {
      active = false;
    };
  }, [section, adminToken]);

  const dynamicCategoryOptions = useMemo(() => {
    const names = (sf.categoryStripItems || [])
      .map((c) => c.category?.trim())
      .filter((c): c is string => Boolean(c));
    return ['Todos', ...Array.from(new Set(names))];
  }, [sf.categoryStripItems]);

  const markDirty = () => {
    hasUnsavedChangesRef.current = true;
    setHasUnsaved(true);
    setSavedNotice(false);
    setSaveError('');
  };

  const updateStoreNameField = (val: string) => {
    markDirty();
    setStoreName(val);
  };

  const updateCurrencyField = (val: string) => {
    markDirty();
    setCurrencySymbol(val);
  };

  const updateThresholdField = (val: string) => {
    markDirty();
    setThreshold(val);
  };

  const updateSupportEmailField = (val: string) => {
    markDirty();
    setSupportEmail(val);
  };

  const updateSfDraft = (nextSf: StorefrontConfig) => {
    markDirty();
    setSf(nextSf);
  };

  const persistStorefrontDraft = async (
    nextSf: StorefrontConfig,
    renamesOverride?: Record<string, string>
  ) => {
    const cleanedCategoryStrip = (nextSf.categoryStripItems || [])
      .map((item) => {
        const cleanLabel = item.label.trim() || item.category.trim();
        const cleanCategory = item.category.trim() || cleanLabel;
        return {
          ...item,
          label: cleanLabel,
          category: cleanCategory,
        };
      })
      .filter((item) => item.label && item.category);

    const cleanedPaymentMethods = (nextSf.paymentMethods || DEFAULT_STOREFRONT_CONFIG.paymentMethods || [])
      .map((m) => ({
        ...m,
        label: m.label.trim().slice(0, 60),
      }))
      .filter((m) => m.label.length > 0);
    const normalizedPaymentMethods =
      cleanedPaymentMethods.length > 0
        ? cleanedPaymentMethods.some((m) => m.enabled)
          ? cleanedPaymentMethods
          : cleanedPaymentMethods.map((m, idx) => (idx === 0 ? { ...m, enabled: true } : m))
        : DEFAULT_STOREFRONT_CONFIG.paymentMethods;

    const normalizePopupForSave = (
      raw: StorePopupConfig | undefined,
      fallback: StorePopupConfig
    ): StorePopupConfig => {
      const base: StorePopupConfig = { ...fallback, ...(raw || {}) };
      const cleanImages = (Array.isArray(base.images) ? base.images : [])
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20);
      const fallbackSingle = base.image?.trim() || '';
      const finalImages =
        cleanImages.length > 0 ? cleanImages : fallbackSingle ? [fallbackSingle] : [];
      return {
        ...base,
        image: finalImages[0] || '',
        images: finalImages,
      };
    };

    const preparedSf: StorefrontConfig = {
      ...nextSf,
      categoryStripItems:
        cleanedCategoryStrip.length > 0
          ? cleanedCategoryStrip
          : DEFAULT_STOREFRONT_CONFIG.categoryStripItems,
      paymentMethods: normalizedPaymentMethods,
      entryPopup: normalizePopupForSave(nextSf.entryPopup, DEFAULT_STOREFRONT_CONFIG.entryPopup!),
      postCheckoutPopup: normalizePopupForSave(
        nextSf.postCheckoutPopup,
        DEFAULT_STOREFRONT_CONFIG.postCheckoutPopup!
      ),
      highlights: (nextSf.highlights || []).slice(0, MAX_HIGHLIGHTS).map((hl) => ({
        ...hl,
        productId: '',
        targetCategory: hl.targetCategory?.trim() || 'Todos',
      })),
    };

    const activeRenamesMap = renamesOverride ?? categoryRenames;
    const renameEntries: CategoryRenameEntry[] = Object.entries(activeRenamesMap)
      .filter(([from, to]) => from.trim() && to.trim() && from.trim() !== to.trim())
      .map(([from, to]) => ({ from: from.trim(), to: to.trim() }));

    setSf(preparedSf);
    setSaving(true);
    setSaveError('');
    setSavedNotice(false);
    try {
      await updateSettings({
        storeName: storeName.trim() || settings.storeName || 'Lunora Fashion',
        currencySymbol: currencySymbol.trim() || settings.currencySymbol || 'Kz',
        freeShippingThreshold: Math.max(0, Number(threshold) || 0),
        supportEmail: supportEmail.trim(),
        storefrontConfig: preparedSf,
        categoryRenames: renameEntries,
      });
      try {
        sessionStorage.removeItem('lunora_entry_popup_seen_sig');
      } catch {
        // Ignore storage error
      }
      hasUnsavedChangesRef.current = false;
      setHasUnsaved(false);
      setCategoryRenames({});
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3500);
    } catch (err) {
      hasUnsavedChangesRef.current = true;
      setHasUnsaved(true);
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
    { id: 'banner', label: 'Banners da Loja (Topo & Rodapé)', icon: Sparkles },
    { id: 'destaques', label: 'Destaques', icon: Star },
    { id: 'categorias', label: 'Categorias', icon: Tag },
    { id: 'popups', label: 'Popups & Notificações', icon: Bell },
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
              <span>Guardado na base de dados</span>
            </span>
          )}
          {!savedNotice && hasUnsaved && !saving && (
            <span className="text-xs font-medium text-amber-700">Alterações por guardar</span>
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
                    onChange={(e) => updateStoreNameField(e.target.value)}
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
                    onChange={(e) => updateSfDraft({ ...sf, headerWordmark: e.target.value })}
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
                    onChange={(e) => updateCurrencyField(e.target.value)}
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
                    onChange={(e) => updateThresholdField(e.target.value)}
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
                    onChange={(e) => updateSupportEmailField(e.target.value)}
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
                    onChange={(e) => updateSfDraft({ ...sf, adminGreeting: e.target.value })}
                    className="w-full border border-black/15 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1C1C1E]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-black/6 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-[#1C1C1E]">
                    Cupão de Desconto & Taxa de Entrega
                  </p>
                  <p className="text-[11px] text-[#72726E] mt-0.5">
                    Defina o código do cupão promocional, a percentagem de desconto aplicada no saco e a taxa de entrega fixa (gratuita automaticamente acima do limiar de envio gratuito, quando &gt; 0).
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#555552] mb-1">
                      Código do Cupão
                    </label>
                    <input
                      type="text"
                      value={sf.newsletter.promoCode}
                      onChange={(e) =>
                        updateSfDraft({
                          ...sf,
                          newsletter: { ...sf.newsletter, promoCode: e.target.value.toUpperCase() },
                        })
                      }
                      placeholder="Ex: LUNORA10"
                      className="w-full font-mono uppercase border border-black/15 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1C1C1E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#555552] mb-1">
                      Desconto do Cupão (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={sf.promoDiscountPercent ?? 10}
                      onChange={(e) =>
                        updateSfDraft({
                          ...sf,
                          promoDiscountPercent: Math.max(
                            0,
                            Math.min(100, Number(e.target.value) || 0)
                          ),
                        })
                      }
                      className="w-full font-mono tabular-nums border border-black/15 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1C1C1E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#555552] mb-1">
                      Taxa de Entrega ({currencySymbol || 'Kz'})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={sf.shippingFee ?? 0}
                      onChange={(e) =>
                        updateSfDraft({
                          ...sf,
                          shippingFee: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      placeholder="0"
                      className="w-full font-mono tabular-nums border border-black/15 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1C1C1E]"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Methods Configuration */}
              <div className="p-4 rounded-2xl bg-[#F6F6F4] border border-black/8 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#1C1C1E]" />
                    <span className="text-xs font-semibold text-[#1C1C1E]">
                      Modos de Pagamento na Loja
                    </span>
                  </div>
                  <span className="text-[11px] text-[#72726E]">
                    {(sf.paymentMethods || []).filter((m) => m.enabled).length} ativo(s)
                  </span>
                </div>
                <p className="text-[11px] text-[#555552]">
                  Adicione, renomeie ou ative/desative os métodos de pagamento mostrados aos clientes no checkout.
                </p>

                <div className="space-y-2">
                  {(sf.paymentMethods || DEFAULT_STOREFRONT_CONFIG.paymentMethods || []).map((pm) => {
                    const allMethods =
                      sf.paymentMethods || DEFAULT_STOREFRONT_CONFIG.paymentMethods || [];
                    const enabledCount = allMethods.filter((m) => m.enabled).length;
                    const canDisable = !pm.enabled || enabledCount > 1;
                    const canRemove = allMethods.length > 1 && (!pm.enabled || enabledCount > 1);
                    return (
                      <div
                        key={pm.id}
                        className="flex flex-wrap items-center gap-2 bg-white border border-black/10 rounded-xl p-2"
                      >
                        <input
                          type="text"
                          value={pm.label}
                          maxLength={60}
                          onChange={(e) => {
                            const nextMethods = allMethods.map((item) =>
                              item.id === pm.id ? { ...item, label: e.target.value } : item
                            );
                            updateSfDraft({ ...sf, paymentMethods: nextMethods });
                          }}
                          className="flex-1 min-w-[160px] px-2.5 py-1.5 text-xs font-medium text-[#1C1C1E] bg-[#F8F8F6] border border-black/10 rounded-lg focus:outline-none focus:border-[#1C1C1E]"
                        />
                        <button
                          type="button"
                          disabled={!canDisable}
                          onClick={() => {
                            const nextMethods = allMethods.map((item) =>
                              item.id === pm.id ? { ...item, enabled: !item.enabled } : item
                            );
                            updateSfDraft({ ...sf, paymentMethods: nextMethods });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-45 ${
                            pm.enabled
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-[#EFECE5] text-[#555552] hover:bg-[#E4DFD4]'
                          }`}
                        >
                          {pm.enabled ? 'Ativo' : 'Inativo'}
                        </button>
                        <button
                          type="button"
                          disabled={!canRemove}
                          onClick={() => {
                            const nextMethods = allMethods.filter((item) => item.id !== pm.id);
                            updateSfDraft({ ...sf, paymentMethods: nextMethods });
                          }}
                          aria-label={`Remover ${pm.label}`}
                          className="p-1.5 rounded-lg text-[#72726E] hover:text-red-600 hover:bg-red-50 disabled:opacity-35 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <input
                    type="text"
                    value={newPaymentLabel}
                    maxLength={60}
                    onChange={(e) => setNewPaymentLabel(e.target.value)}
                    placeholder="Ex: Transferência Bancária / BAI Directo"
                    className="flex-1 min-w-[200px] bg-white border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const clean = newPaymentLabel.trim().slice(0, 60);
                      if (!clean) return;
                      const currentMethods =
                        sf.paymentMethods || DEFAULT_STOREFRONT_CONFIG.paymentMethods || [];
                      if (
                        currentMethods.some(
                          (m) => m.label.trim().toLowerCase() === clean.toLowerCase()
                        )
                      ) {
                        setNewPaymentLabel('');
                        return;
                      }
                      const nextMethods = [
                        ...currentMethods,
                        {
                          id: `pm-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                          label: clean,
                          enabled: true,
                        },
                      ];
                      updateSfDraft({ ...sf, paymentMethods: nextMethods });
                      setNewPaymentLabel('');
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1C1C1E] text-white text-xs font-medium rounded-xl hover:bg-[#323235] cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Modo</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#555552] mb-1">
                  Descrição da Loja (sobre a marca — visível no rodapé e faturas)
                </label>
                <textarea
                  rows={2}
                  value={sf.footer.tagline}
                  onChange={(e) =>
                    updateSfDraft({
                      ...sf,
                      footer: { ...sf.footer, tagline: e.target.value },
                    })
                  }
                  placeholder="Descreva a sua loja e o seu estilo..."
                  className="w-full border border-black/15 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1C1C1E]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#555552] mb-1">
                  Informação de Localização & Prazo de Entrega
                </label>
                <input
                  type="text"
                  value={sf.footer.locationText}
                  onChange={(e) =>
                    updateSfDraft({
                      ...sf,
                      footer: { ...sf.footer, locationText: e.target.value },
                    })
                  }
                  placeholder="Ex: Luanda · Talatona · Entregas em 24–48h"
                  className="w-full border border-black/15 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1C1C1E]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#555552] mb-1">
                  Aviso no Topo da Loja (Pagamento na Entrega)
                </label>
                <input
                  type="text"
                  value={sf.topNoticeText || ''}
                  onChange={(e) => updateSfDraft({ ...sf, topNoticeText: e.target.value })}
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
                        updateSfDraft({
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
                        updateSfDraft({
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
                        updateSfDraft({
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
                        updateSfDraft({
                          ...sf,
                          navLabels: { ...sf.navLabels, sale: e.target.value },
                        })
                      }
                      className="w-full border border-black/15 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#1C1C1E]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-black/6 flex flex-wrap items-center justify-end gap-3">
                {savedNotice && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                    <Check className="w-4 h-4" />
                    <span>Informações guardadas permanentemente</span>
                  </span>
                )}
                {saveError && <span className="text-xs text-red-700">{saveError}</span>}
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-[#1C1C1E] text-white text-xs font-medium rounded-full hover:bg-[#323235] disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
                >
                  {saving ? 'A guardar...' : 'Guardar Informações da Loja'}
                </button>
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

      {/* SECTION 2: BANNERS DA LOJA (Topo & Banner Inferior Após Produtos) */}
      {section === 'banner' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-5 bg-white rounded-[24px] p-6 border border-black/5 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-[#1C1C1E]">
                  Banner Principal (Topo da Loja)
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
                    Slides & Miniaturas do Banner Principal ({sf.heroSlides.length})
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

          {/* BANNER INFERIOR (APÓS OS PRODUTOS) */}
          {(() => {
            const bottom = sf.bottomBanner || DEFAULT_STOREFRONT_CONFIG.bottomBanner!;
            const updateBottom = (patch: Partial<typeof bottom>) =>
              updateSfDraft({ ...sf, bottomBanner: { ...bottom, ...patch } });

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start pt-2 border-t border-black/8">
                <div className="lg:col-span-5 bg-white rounded-[24px] p-6 border border-black/5 space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-[#1C1C1E]">
                      Banner Inferior (Após os Produtos)
                    </h3>
                    <p className="text-[11px] text-[#72726E] mt-0.5">
                      Aparece logo onde termina a secção de produtos, com o mesmo estilo escuro do banner principal. Começa vazio para adicionar as suas imagens.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#555552] mb-1">
                      Título do Banner Inferior
                    </label>
                    <input
                      type="text"
                      value={bottom.title}
                      onChange={(e) => updateBottom({ title: e.target.value })}
                      placeholder="Ex: Curadoria da Estação"
                      className="w-full border border-black/15 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#555552] mb-1">
                      Subtítulo Curto
                    </label>
                    <textarea
                      rows={3}
                      value={bottom.subtitle}
                      onChange={(e) => updateBottom({ subtitle: e.target.value })}
                      className="w-full border border-black/15 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#555552] mb-1">
                        Texto do Botão Branco
                      </label>
                      <input
                        type="text"
                        value={bottom.ctaText}
                        onChange={(e) => updateBottom({ ctaText: e.target.value })}
                        placeholder="Ex: Ver Coleção"
                        className="w-full border border-black/15 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#555552] mb-1">
                        Categoria de Destino
                      </label>
                      <select
                        value={bottom.targetCategory || 'Todos'}
                        onChange={(e) =>
                          updateBottom({ targetCategory: e.target.value as typeof bottom.targetCategory })
                        }
                        className="w-full border border-black/15 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#1C1C1E]"
                      >
                        {dynamicCategoryOptions.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7 bg-white rounded-[24px] p-6 border border-black/5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-[#1C1C1E]">
                        Imagens do Banner Inferior ({bottom.slides.length})
                      </h3>
                      <p className="text-[11px] text-[#72726E] mt-0.5">
                        Adicione até 3+ fotografias. Quando vazio, o banner exibe apenas o cartão escuro limpo; ao carregar fotos, aparece o destaque à direita.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextNum = String(bottom.slides.length + 1).padStart(2, '0');
                        updateBottom({
                          slides: [
                            ...bottom.slides,
                            {
                              index: nextNum,
                              image: '',
                              caption: `Banner Inferior ${nextNum}`,
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
                    {bottom.slides.map((slide, idx) => (
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
                                  const next = [...bottom.slides];
                                  next[idx] = { ...next[idx], image: '' };
                                  persistStorefrontDraft({
                                    ...sf,
                                    bottomBanner: { ...bottom, slides: next },
                                  });
                                }}
                                className="inline-flex items-center gap-1 text-[11px] text-[#555552] hover:text-[#1C1C1E] hover:underline cursor-pointer"
                              >
                                <span>Remover Imagem</span>
                              </button>
                            )}
                            {bottom.slides.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const filtered = bottom.slides
                                    .filter((_, i) => i !== idx)
                                    .map((item, i) => ({
                                      ...item,
                                      index: String(i + 1).padStart(2, '0'),
                                    }));
                                  persistStorefrontDraft({
                                    ...sf,
                                    bottomBanner: { ...bottom, slides: filtered },
                                  });
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
                              const next = [...bottom.slides];
                              next[idx] = { ...next[idx], caption: e.target.value };
                              updateBottom({ slides: next });
                            }}
                            className="w-full bg-white border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
                          />
                        </div>

                        <ImageField
                          label="Fotografia do Banner Inferior"
                          recommendedSize="900 × 1050 px (vertical 4:5 · mín. 700 × 820 px)"
                          value={slide.image}
                          allowEmpty
                          uploadFolder="banners"
                          onChange={(url) => {
                            const next = [...bottom.slides];
                            next[idx] = { ...next[idx], image: url };
                            const nextSf: StorefrontConfig = {
                              ...sf,
                              bottomBanner: { ...bottom, slides: next },
                            };
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
                        <span>Banner inferior guardado permanentemente</span>
                      </span>
                    )}
                    {saveError && <span className="text-xs text-red-700">{saveError}</span>}
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleSaveAll()}
                      className="px-5 py-2.5 bg-[#1C1C1E] text-white text-xs font-medium rounded-full hover:bg-[#323235] disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {saving ? 'A guardar...' : 'Guardar Banner Inferior'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* SECTION 2.5: DESTAQUES (ATÉ 4 EM CARROSSEL 2s) */}
      {section === 'destaques' && (() => {
        const highlights = (sf.highlights || []).slice(0, MAX_HIGHLIGHTS);
        const canAddMore = highlights.length < MAX_HIGHLIGHTS;

        const addHighlight = () => {
          if (highlights.length >= MAX_HIGHLIGHTS) return;
          const nonSaleCats = (sf.categoryStripItems || [])
            .filter((c) => !c.isSale && c.category?.trim())
            .map((c) => c.category.trim());
          const nextItem: HighlightCardConfig = {
            id: `hl-${Date.now()}`,
            badge: 'Destaque',
            title: 'Novo Destaque da Semana',
            subtitle: 'Seleção exclusiva disponível agora na loja.',
            ctaText: 'Ver Categoria',
            image: '',
            targetCategory: nonSaleCats[0] || dynamicCategoryOptions[1] || 'Todos',
            productId: '',
          };
          updateSfDraft({ ...sf, highlights: [...highlights, nextItem].slice(0, MAX_HIGHLIGHTS) });
        };

        const updateHighlightAt = (idx: number, patch: Partial<HighlightCardConfig>) => {
          const next = [...highlights];
          next[idx] = { ...next[idx], ...patch };
          updateSfDraft({ ...sf, highlights: next.slice(0, MAX_HIGHLIGHTS) });
        };

        const moveHighlight = (idx: number, dir: -1 | 1) => {
          const targetIdx = idx + dir;
          if (targetIdx < 0 || targetIdx >= highlights.length) return;
          const next = [...highlights];
          const [moved] = next.splice(idx, 1);
          next.splice(targetIdx, 0, moved);
          updateSfDraft({ ...sf, highlights: next });
        };

        const removeHighlightAt = (idx: number) => {
          const filtered = highlights.filter((_, i) => i !== idx);
          void persistStorefrontDraft({ ...sf, highlights: filtered });
        };

        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Cartões de Destaque (Criar & Editar até 4) */}
            <div className="lg:col-span-7 bg-white rounded-[24px] p-6 border border-black/5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-[#1C1C1E]">
                    Destaques da Vitrine ({highlights.length}/{MAX_HIGHLIGHTS})
                  </h3>
                  <p className="text-[11px] text-[#72726E] mt-0.5">
                    Coloque até 4 destaques. Na loja aparecem em formato circular com rolagem contínua por baixo de &ldquo;As Nossas Escolhas Favoritas&rdquo; e cada destaque direciona diretamente para uma categoria.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!canAddMore}
                  onClick={addHighlight}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#1C1C1E] text-white text-xs font-medium hover:bg-[#323235] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{canAddMore ? 'Criar Destaque' : 'Máximo 4/4'}</span>
                </button>
              </div>

              {highlights.length === 0 ? (
                <div className="rounded-2xl bg-[#F6F6F4] p-8 text-center space-y-3 border border-black/5">
                  <Star className="w-6 h-6 text-[#8A8A85] mx-auto" />
                  <p className="text-xs font-medium text-[#1C1C1E]">
                    Ainda não criou nenhum cartão de destaque personalizado.
                  </p>
                  <button
                    type="button"
                    onClick={addHighlight}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1C1C1E] text-white text-xs font-medium hover:bg-[#323235] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Criar Primeiro Destaque</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {highlights.map((hl, idx) => (
                    <div key={hl.id} className="p-4 rounded-2xl bg-[#F6F6F4] space-y-3 border border-black/6">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-semibold text-[#1C1C1E]">
                          Destaque #{String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="flex items-center gap-2">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => moveHighlight(idx, -1)}
                              aria-label="Mover destaque para cima"
                              className="p-1.5 rounded-lg bg-white border border-black/10 text-[#1C1C1E] hover:bg-black/5 cursor-pointer"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                          )}
                          {idx < highlights.length - 1 && (
                            <button
                              type="button"
                              onClick={() => moveHighlight(idx, 1)}
                              aria-label="Mover destaque para baixo"
                              className="p-1.5 rounded-lg bg-white border border-black/10 text-[#1C1C1E] hover:bg-black/5 cursor-pointer"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeHighlightAt(idx)}
                            className="inline-flex items-center gap-1 text-[11px] text-red-700 hover:underline cursor-pointer ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-[#555552] mb-1">
                            Etiqueta / Selo
                          </label>
                          <input
                            type="text"
                            value={hl.badge}
                            onChange={(e) => updateHighlightAt(idx, { badge: e.target.value })}
                            placeholder="Ex: Edição Limitada"
                            className="w-full bg-white border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-[#555552] mb-1">
                            Título do Destaque
                          </label>
                          <input
                            type="text"
                            value={hl.title}
                            onChange={(e) => updateHighlightAt(idx, { title: e.target.value })}
                            placeholder="Ex: Novas Calças Alfaiataria"
                            className="w-full bg-white border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-medium text-[#555552] mb-1">
                            Descrição & Detalhes (aparece na borda inferior escura)
                          </label>
                          <input
                            type="text"
                            value={hl.subtitle}
                            onChange={(e) => updateHighlightAt(idx, { subtitle: e.target.value })}
                            placeholder="Ex: Corte fluido em linho premium..."
                            className="w-full bg-white border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-[#555552] mb-1">
                            Texto do Botão
                          </label>
                          <input
                            type="text"
                            value={hl.ctaText}
                            onChange={(e) => updateHighlightAt(idx, { ctaText: e.target.value })}
                            placeholder="Ex: Ver Peça"
                            className="w-full bg-white border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
                          />
                        </div>

                        <div className="sm:col-span-2 pt-1">
                          <label className="block text-[11px] font-medium text-[#555552] mb-1">
                            Categoria de Destino (ao clicar no destaque na loja, direciona para esta categoria)
                          </label>
                          <select
                            value={hl.targetCategory || 'Todos'}
                            onChange={(e) =>
                              updateHighlightAt(idx, {
                                targetCategory: e.target.value as ProductCategory | 'Todos',
                                productId: '',
                              })
                            }
                            className="w-full bg-white border border-black/15 rounded-xl px-3 py-2 text-xs font-medium text-[#1C1C1E] focus:outline-none focus:border-[#1C1C1E]"
                          >
                            {dynamicCategoryOptions.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat === 'Todos' ? 'Todos os Produtos' : cat}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <ImageField
                        label="Fotografia Completa do Destaque"
                        recommendedSize="1200 × 900 px"
                        value={hl.image}
                        allowEmpty
                        uploadFolder="banners"
                        onChange={(url) => updateHighlightAt(idx, { image: url })}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-black/6 flex flex-wrap items-center justify-end gap-3">
                {savedNotice && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                    <Check className="w-4 h-4" />
                    <span>Destaques guardados na base de dados</span>
                  </span>
                )}
                {saveError && <span className="text-xs text-red-700">{saveError}</span>}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveAll()}
                  className="px-5 py-2.5 bg-[#1C1C1E] text-white text-xs font-medium rounded-full hover:bg-[#323235] disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
                >
                  {saving ? 'A guardar...' : 'Guardar Destaques'}
                </button>
              </div>
            </div>

            {/* Título & Seleção Rápida de Produtos em Destaque */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-white rounded-[24px] p-6 border border-black/5 space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-[#1C1C1E]">
                    Secção & Produtos em Destaque
                  </h3>
                  <p className="text-[11px] text-[#72726E] mt-0.5">
                    Personalize o título do carrossel de produtos e escolha quais peças aparecem primeiro em &ldquo;As Nossas Escolhas Favoritas&rdquo;.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#555552] mb-1">
                    Título do Carrossel de Produtos
                  </label>
                  <input
                    type="text"
                    value={sf.catalogTitle}
                    onChange={(e) => updateSfDraft({ ...sf, catalogTitle: e.target.value })}
                    placeholder="Ex: As Nossas Escolhas Favoritas"
                    className="w-full border border-black/15 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
                  />
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {products.length === 0 ? (
                    <p className="text-xs text-[#72726E]">Sem produtos no catálogo.</p>
                  ) : (
                    products.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#F6F6F4]"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#1C1C1E] truncate">{p.name}</p>
                          <p className="text-[11px] text-[#72726E] font-mono">
                            {formatMoney(p.price, settings.currencySymbol)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateProduct(p.id, { featured: !p.featured })}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
                            p.featured
                              ? 'bg-[#1C1C1E] text-white'
                              : 'bg-white text-[#555552] border border-black/10 hover:border-[#1C1C1E]'
                          }`}
                        >
                          <Star className={`w-3 h-3 ${p.featured ? 'fill-white' : ''}`} />
                          <span>{p.featured ? 'Em Destaque' : 'Destacar'}</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* SECTION 2.8: CATEGORIAS */}
      {section === 'categorias' && (() => {
        const categories = sf.categoryStripItems || [];

        const trackRename = (oldCat: string, newCat: string) => {
          const cleanOld = oldCat.trim();
          const cleanNew = newCat.trim();
          if (!cleanOld || !cleanNew || cleanOld === cleanNew) return;
          setCategoryRenames((prev) => {
            const next = { ...prev };
            const existingOrigin = Object.entries(next).find(([, mapped]) => mapped === cleanOld)?.[0];
            if (existingOrigin) {
              next[existingOrigin] = cleanNew;
            } else {
              next[cleanOld] = cleanNew;
            }
            return next;
          });
        };

        const addCategory = () => {
          const baseName = `Nova Categoria ${categories.length + 1}`;
          const nextItem: CategoryStripItemConfig = {
            label: baseName,
            category: baseName,
            image: '',
            isSale: false,
          };
          updateSfDraft({
            ...sf,
            categoryStripItems: [...categories, nextItem],
          });
        };

        const updateCategoryName = (idx: number, nextName: string) => {
          const prevItem = categories[idx];
          if (!prevItem) return;
          const oldCat = prevItem.category;
          const cleanNext = nextName;
          const nextStrip = [...categories];
          nextStrip[idx] = {
            ...prevItem,
            label: cleanNext,
            category: cleanNext.trim() || prevItem.category,
          };

          const targetName = cleanNext.trim();
          let nextEditorial = sf.editorialCards;
          let nextPromo = sf.promoBanners;
          let nextHighlights = sf.highlights;
          let nextBottom = sf.bottomBanner;

          if (oldCat && targetName && oldCat !== targetName) {
            trackRename(oldCat, targetName);
            nextEditorial = sf.editorialCards.map((c) =>
              c.category === oldCat ? { ...c, category: targetName } : c
            );
            nextPromo = sf.promoBanners.map((b) =>
              b.targetCategory === oldCat ? { ...b, targetCategory: targetName } : b
            );
            nextHighlights = (sf.highlights || []).map((h) =>
              h.targetCategory === oldCat ? { ...h, targetCategory: targetName } : h
            );
            if (sf.bottomBanner && sf.bottomBanner.targetCategory === oldCat) {
              nextBottom = { ...sf.bottomBanner, targetCategory: targetName };
            }
          }

          updateSfDraft({
            ...sf,
            categoryStripItems: nextStrip,
            editorialCards: nextEditorial,
            promoBanners: nextPromo,
            highlights: nextHighlights,
            bottomBanner: nextBottom,
          });
        };

        const updateCategoryFields = (idx: number, patch: Partial<CategoryStripItemConfig>) => {
          const next = [...categories];
          next[idx] = { ...next[idx], ...patch };
          updateSfDraft({ ...sf, categoryStripItems: next });
        };

        const moveCategory = (idx: number, dir: -1 | 1) => {
          const targetIdx = idx + dir;
          if (targetIdx < 0 || targetIdx >= categories.length) return;
          const next = [...categories];
          const [moved] = next.splice(idx, 1);
          next.splice(targetIdx, 0, moved);
          updateSfDraft({ ...sf, categoryStripItems: next });
        };

        const removeCategory = (idx: number) => {
          if (categories.length <= 1) return;
          const removedCat = categories[idx];
          const filtered = categories.filter((_, i) => i !== idx);
          const fallbackCategory =
            filtered.find((c) => !c.isSale && c.category?.trim())?.category.trim() ||
            filtered[0]?.category.trim() ||
            'Mulher';

          const removedName = removedCat?.category?.trim();
          const nextRenames = { ...categoryRenames };
          let nextEditorial = sf.editorialCards;
          let nextPromo = sf.promoBanners;
          let nextHighlights = sf.highlights;
          let nextBottom = sf.bottomBanner;

          if (removedName && fallbackCategory && removedName !== fallbackCategory) {
            nextRenames[removedName] = fallbackCategory;
            nextEditorial = sf.editorialCards.map((c) =>
              c.category === removedName ? { ...c, category: fallbackCategory } : c
            );
            nextPromo = sf.promoBanners.map((b) =>
              b.targetCategory === removedName ? { ...b, targetCategory: fallbackCategory } : b
            );
            nextHighlights = (sf.highlights || []).map((h) =>
              h.targetCategory === removedName ? { ...h, targetCategory: fallbackCategory } : h
            );
            if (sf.bottomBanner && sf.bottomBanner.targetCategory === removedName) {
              nextBottom = { ...sf.bottomBanner, targetCategory: fallbackCategory };
            }
          }

          void persistStorefrontDraft(
            {
              ...sf,
              categoryStripItems: filtered,
              editorialCards: nextEditorial,
              promoBanners: nextPromo,
              highlights: nextHighlights,
              bottomBanner: nextBottom,
            },
            nextRenames
          );
        };

        const copyCategoryLink = async (categoryName: string, key: string) => {
          const shareUrl = buildCategoryUrl(categoryName);
          try {
            await navigator.clipboard.writeText(shareUrl);
          } catch {
            const textarea = document.createElement('textarea');
            textarea.value = shareUrl;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            try {
              document.execCommand('copy');
            } finally {
              document.body.removeChild(textarea);
            }
          }
          setCopiedCategoryKey(key);
          window.setTimeout(() => {
            setCopiedCategoryKey((curr) => (curr === key ? null : curr));
          }, 2500);
        };

        const openCategoryInStore = (categoryName: string) => {
          setSearchQuery('');
          setSelectedCategory(categoryName);
          if (typeof window !== 'undefined') {
            window.history.replaceState(
              null,
              '',
              `${window.location.pathname}?categoria=${encodeURIComponent(categoryName)}#catalog-grid`
            );
          }
          setActiveAppView('storefront');
          window.setTimeout(() => {
            const el =
              document.getElementById('catalog-grid') || document.getElementById('catalog');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 120);
        };

        return (
          <div className="bg-white rounded-[24px] p-6 border border-black/5 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-[#1C1C1E]">
                  Gerir Categorias da Loja ({categories.length})
                </h3>
                <p className="text-[11px] text-[#72726E] mt-0.5">
                  Edite nomes, imagens, ordem, copie o link direto de cada categoria ou crie novas categorias. Todos os produtos pertencem a uma categoria ativa.
                </p>
              </div>
              <button
                type="button"
                onClick={addCategory}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1C1C1E] text-white text-xs font-medium hover:bg-[#323235] cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Categoria</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((catItem, idx) => {
                const matchingCount = products.filter(
                  (p) => p.category === catItem.category
                ).length;
                const copyKey = `${idx}-${catItem.category}`;
                const isCopied = copiedCategoryKey === copyKey;
                const shareUrl = buildCategoryUrl(catItem.category);

                return (
                  <div
                    key={`cat-edit-${idx}`}
                    className="p-4 rounded-2xl bg-[#F6F6F4] border border-black/6 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-[#1C1C1E]">
                          #{String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-white text-[10px] font-medium text-[#555552] border border-black/8">
                          {matchingCount} {matchingCount === 1 ? 'produto' : 'produtos'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => moveCategory(idx, -1)}
                            aria-label="Mover categoria para cima"
                            className="p-1.5 rounded-lg bg-white border border-black/10 text-[#1C1C1E] hover:bg-black/5 cursor-pointer"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                        )}
                        {idx < categories.length - 1 && (
                          <button
                            type="button"
                            onClick={() => moveCategory(idx, 1)}
                            aria-label="Mover categoria para baixo"
                            className="p-1.5 rounded-lg bg-white border border-black/10 text-[#1C1C1E] hover:bg-black/5 cursor-pointer"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        )}
                        {categories.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCategory(idx)}
                            aria-label={`Eliminar categoria ${catItem.label}`}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-700 cursor-pointer ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-[#555552] mb-1">
                        Nome da Categoria
                      </label>
                      <input
                        type="text"
                        value={catItem.label}
                        onChange={(e) => updateCategoryName(idx, e.target.value)}
                        placeholder="Ex: Vestidos, Calças, Acessórios..."
                        className="w-full bg-white border border-black/15 rounded-xl px-3 py-2 text-xs font-medium text-[#1C1C1E] focus:outline-none focus:border-[#1C1C1E]"
                      />
                    </div>

                    {/* Link direto da categoria */}
                    <div className="rounded-xl bg-white border border-black/8 px-3 py-2 flex items-center justify-between gap-2">
                      <span
                        title={shareUrl}
                        className="text-[11px] font-mono text-[#555552] truncate min-w-0 flex-1"
                      >
                        ?categoria={encodeURIComponent(catItem.category)}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => copyCategoryLink(catItem.category, copyKey)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                            isCopied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#1C1C1E] text-white hover:bg-[#323235]'
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copiar Link</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => openCategoryInStore(catItem.category)}
                          title={`Abrir categoria ${catItem.label} na loja`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F3F3F0] hover:bg-[#E5E4DF] text-[#1C1C1E] text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Abrir</span>
                        </button>
                      </div>
                    </div>

                    <label className="inline-flex items-center gap-2 text-xs text-[#1C1C1E] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(catItem.isSale)}
                        onChange={(e) => updateCategoryFields(idx, { isSale: e.target.checked })}
                        className="rounded"
                      />
                      <span>Categoria promocional (mostra etiqueta escura Saldos e filtra promoções)</span>
                    </label>

                    {!catItem.isSale && (
                      <ImageField
                        label="Imagem Circular da Categoria (opcional)"
                        recommendedSize="400 × 400 px"
                        value={catItem.image || ''}
                        allowEmpty
                        compact
                        uploadFolder="banners"
                        onChange={(url) => updateCategoryFields(idx, { image: url })}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-black/6 flex flex-wrap items-center justify-end gap-3">
              {savedNotice && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <Check className="w-4 h-4" />
                  <span>Categorias guardadas na base de dados</span>
                </span>
              )}
              {saveError && <span className="text-xs text-red-700">{saveError}</span>}
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSaveAll()}
                className="px-5 py-2.5 bg-[#1C1C1E] text-white text-xs font-medium rounded-full hover:bg-[#323235] disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
              >
                {saving ? 'A guardar...' : 'Guardar Categorias'}
              </button>
            </div>
          </div>
        );
      })()}

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
                  onChange={(e) => updateSfDraft({ ...sf, catalogTitle: e.target.value })}
                  placeholder="Ex: Novos Artigos Populares"
                  className="w-full border border-black/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#555552] mb-1">
                    Código Promocional Ativo no Saco
                  </label>
                  <input
                    type="text"
                    value={sf.newsletter.promoCode}
                    onChange={(e) =>
                      updateSfDraft({
                        ...sf,
                        newsletter: { ...sf.newsletter, promoCode: e.target.value.toUpperCase() },
                      })
                    }
                    placeholder="Ex: LUNORA10"
                    className="w-full font-mono uppercase border border-black/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#555552] mb-1">
                    Desconto do Cupão (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={sf.promoDiscountPercent ?? 10}
                    onChange={(e) =>
                      updateSfDraft({
                        ...sf,
                        promoDiscountPercent: Math.max(
                          0,
                          Math.min(100, Number(e.target.value) || 0)
                        ),
                      })
                    }
                    className="w-full font-mono tabular-nums border border-black/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
                  />
                </div>
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
                  updateSfDraft({ ...sf, footer: { ...sf.footer, tagline: e.target.value } })
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
                    updateSfDraft({
                      ...sf,
                      footer: { ...sf.footer, newsletterTitle: e.target.value },
                    })
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
                    updateSfDraft({
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
                    updateSfDraft({ ...sf, footer: { ...sf.footer, locationText: e.target.value } })
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
                    updateSfDraft({
                      ...sf,
                      footer: { ...sf.footer, copyrightText: e.target.value },
                    })
                  }
                  className="w-full border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-black/6 flex flex-wrap items-center justify-end gap-3">
              {savedNotice && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <Check className="w-4 h-4" />
                  <span>Guardado permanentemente na base de dados</span>
                </span>
              )}
              {saveError && <span className="text-xs text-red-700">{saveError}</span>}
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSaveAll()}
                className="px-5 py-2.5 bg-[#1C1C1E] text-white text-xs font-medium rounded-full hover:bg-[#323235] disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
              >
                {saving ? 'A guardar...' : 'Guardar Catálogo & Rodapé'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* SECTION 5: POPUPS & NOTIFICAÇÕES */}
      {section === 'popups' && (
        <div className="space-y-5">
          <div className="bg-white rounded-[24px] p-6 border border-black/5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-[#1C1C1E]">
                Popups & Notificações da Loja
              </h3>
              <p className="text-xs text-[#72726E] mt-1">
                Ative banners popup na loja e configure a notificação em tempo real enviada por email quando um cliente faz um pedido.
              </p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveAll()}
              className="px-5 py-2.5 bg-[#1C1C1E] text-white text-xs font-medium rounded-full hover:bg-[#323235] disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
            >
              {saving ? 'A guardar...' : 'Guardar Popups & Notificações'}
            </button>
          </div>

          {/* REAL-TIME ORDER EMAIL NOTIFICATIONS CARD */}
          <section className="bg-white rounded-[24px] p-6 border border-black/5 space-y-4">
            {(() => {
              const orderNotifCfg = {
                enabled: true,
                soundEnabled: true,
                recipientEmail: 'pintozacarias806@gmail.com',
                ...(sf.orderNotification || {}),
              };
              const updateOrderNotif = (patch: Partial<typeof orderNotifCfg>) => {
                updateSfDraft({
                  ...sf,
                  orderNotification: {
                    ...orderNotifCfg,
                    ...patch,
                  },
                });
              };

              const handleSendTestEmail = async () => {
                if (!adminToken) return;
                setTestingEmail(true);
                setTestEmailFeedback(null);
                if (orderNotifCfg.soundEnabled !== false) {
                  void playOrderNotificationSound();
                }
                try {
                  const res = await fetch('/api/admin/notifications/test', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${adminToken}`,
                    },
                    body: JSON.stringify({
                      recipientEmail: orderNotifCfg.recipientEmail,
                    }),
                  });
                  const data = (await res.json()) as {
                    notification?: OrderNotificationRecord;
                    transport?: { configured: boolean; provider: 'resend' | 'smtp' | 'none'; defaultRecipient: string };
                    error?: string;
                  };
                  if (data.transport) setEmailTransportInfo(data.transport);
                  if (data.notification) {
                    const notif = data.notification;
                    setOrderNotifications((prev) => [
                      notif,
                      ...prev.filter((n) => n.id !== notif.id),
                    ]);
                    if (notif.emailStatus === 'sent') {
                      setTestEmailFeedback({
                        type: 'ok',
                        msg: `Email de teste "${notif.title}" enviado com sucesso para ${notif.recipientEmail}.`,
                      });
                    } else {
                      setTestEmailFeedback({
                        type: 'warn',
                        msg:
                          notif.errorMessage ||
                          'Notificação registada em tempo real no painel, mas o envio SMTP/Resend aguarda configuração no servidor.',
                      });
                    }
                  } else if (!res.ok) {
                    setTestEmailFeedback({
                      type: 'warn',
                      msg: data.error || 'Não foi possível enviar o teste.',
                    });
                  }
                } catch {
                  setTestEmailFeedback({
                    type: 'warn',
                    msg: 'Erro de ligação ao testar envio de notificação.',
                  });
                } finally {
                  setTestingEmail(false);
                }
              };

              return (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#1C1C1E] text-white flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[#1C1C1E]">
                          Notificação de Pedido por Email em Tempo Real & Alerta Sonoro
                        </h4>
                        <p className="text-[11px] text-[#72726E] mt-0.5 leading-relaxed">
                          Sempre que o cliente concluir um pedido, é enviada a notificação prioritária &ldquo;Pedido de &#123;nome do produto, quantidade&#125;&rdquo; com descrições para o email abaixo e toca um som de alerta no painel.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          updateOrderNotif({
                            soundEnabled: orderNotifCfg.soundEnabled === false,
                          })
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                          orderNotifCfg.soundEnabled !== false
                            ? 'bg-[#1C1C1E] text-white'
                            : 'bg-[#F5F4F0] text-[#555552] hover:text-[#1C1C1E]'
                        }`}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>
                          {orderNotifCfg.soundEnabled !== false ? 'Som Ligado' : 'Som Desligado'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => updateOrderNotif({ enabled: !orderNotifCfg.enabled })}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                          orderNotifCfg.enabled
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#F5F4F0] text-[#555552] hover:text-[#1C1C1E]'
                        }`}
                      >
                        {orderNotifCfg.enabled ? 'Email Ligado' : 'Email Desligado'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-5">
                      <label className="block text-xs font-medium text-[#555552] mb-1">
                        Email que Recebe as Notificações de Pedido
                      </label>
                      <input
                        type="email"
                        value={orderNotifCfg.recipientEmail}
                        onChange={(e) => updateOrderNotif({ recipientEmail: e.target.value })}
                        placeholder="pintozacarias806@gmail.com"
                        className="w-full border border-black/15 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1C1C1E]"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <div className="px-3.5 py-2.5 rounded-xl bg-[#F5F4F0] border border-black/5 text-xs">
                        <span className="text-[#72726E]">Estado do envio: </span>
                        <span
                          className={`font-semibold ${
                            emailTransportInfo?.configured ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {emailTransportInfo?.configured
                            ? emailTransportInfo.provider === 'resend'
                              ? 'Resend Ativo'
                              : 'SMTP Gmail Ativo'
                            : 'Aguardar SMTP / Resend'}
                        </span>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <button
                        type="button"
                        onClick={() => void playOrderNotificationSound()}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#F5F4F0] hover:bg-[#EAE8E1] text-[#1C1C1E] text-xs font-medium cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Testar Som</span>
                      </button>
                    </div>

                    <div className="md:col-span-2">
                      <button
                        type="button"
                        disabled={testingEmail}
                        onClick={handleSendTestEmail}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#1C1C1E] text-white text-xs font-medium hover:bg-[#323235] disabled:opacity-60 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{testingEmail ? 'A enviar...' : 'Testar Email'}</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#72726E] bg-[#F5F4F0] rounded-xl px-3.5 py-2.5">
                    {!emailTransportInfo?.configured
                      ? 'Para entregar automaticamente na caixa Gmail, adicione SMTP_USER e SMTP_PASS (Senha de Aplicação Gmail) ou RESEND_API_KEY nas Secrets do servidor. O som de chegada de email no telemóvel/PC é controlado pela app Gmail (toque/notificações).'
                      : 'Os emails são enviados com prioridade alta para o Gmail. O som do email ao cair na caixa de entrada depende das definições de som de notificação da sua aplicação Gmail; com este painel aberto também tocará um alerta sonoro imediato.'}
                  </p>

                  {testEmailFeedback && (
                    <div
                      className={`rounded-xl px-3.5 py-2.5 text-xs ${
                        testEmailFeedback.type === 'ok'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-900 border border-amber-200'
                      }`}
                    >
                      {testEmailFeedback.msg}
                    </div>
                  )}

                  {orderNotifications.length > 0 && (
                    <div className="pt-2 border-t border-black/6 space-y-2">
                      <p className="text-xs font-semibold text-[#1C1C1E]">
                        Últimas Notificações Geradas
                      </p>
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {orderNotifications.slice(0, 6).map((notif) => (
                          <div
                            key={notif.id}
                            className="p-3 rounded-xl bg-[#F5F4F0] border border-black/5 space-y-1.5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-[#1C1C1E]">
                                {notif.title}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  notif.emailStatus === 'sent'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {notif.emailStatus === 'sent'
                                  ? `Enviado → ${notif.recipientEmail}`
                                  : `Registo em tempo real → ${notif.recipientEmail}`}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#555552]">
                              Cliente: {notif.customerName} · Encomenda #{notif.orderId} ·{' '}
                              {formatMoney(notif.total, notif.currencySymbol)}
                            </p>
                            {notif.items.map((item, idx) => (
                              <p
                                key={`${notif.id}-item-${idx}`}
                                className="text-[11px] text-[#333330] bg-white rounded-lg px-2.5 py-1.5 border border-black/5"
                              >
                                <span className="font-semibold">
                                  {item.name} ({item.quantity} un.):
                                </span>{' '}
                                {item.description}
                              </p>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </section>

          {/* APPROVED SALE WEBHOOK NOTIFICATIONS CARD */}
          <section className="bg-white rounded-[24px] p-6 border border-black/5 space-y-4">
            {(() => {
              const webhookCfg = sf.saleWebhook || {
                enabled: false,
                url: '',
                secret: '',
                hasSecret: false,
              };
              const updateWebhook = (patch: Partial<typeof webhookCfg>) => {
                updateSfDraft({
                  ...sf,
                  saleWebhook: {
                    ...webhookCfg,
                    ...patch,
                  },
                });
              };

              const handleSendTestWebhook = async () => {
                if (!adminToken) return;
                setTestingWebhook(true);
                setTestWebhookFeedback(null);
                try {
                  const res = await fetch('/api/admin/webhooks/test', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${adminToken}`,
                    },
                    body: JSON.stringify({
                      url: webhookCfg.url,
                      secret: webhookCfg.secret,
                    }),
                  });
                  const data = (await res.json()) as {
                    delivery?: SaleWebhookDeliveryRecord;
                    error?: string;
                  };
                  if (data.delivery) {
                    const deliv = data.delivery;
                    setWebhookDeliveries((prev) => [
                      deliv,
                      ...prev.filter((w) => w.id !== deliv.id),
                    ]);
                    if (deliv.status === 'sent') {
                      setTestWebhookFeedback({
                        type: 'ok',
                        msg: `Webhook de teste "${deliv.title}" entregue com sucesso (HTTP ${deliv.httpStatus || 200}) para ${deliv.targetHost}.`,
                      });
                    } else {
                      setTestWebhookFeedback({
                        type: 'warn',
                        msg:
                          deliv.errorMessage ||
                          'Não foi possível entregar o webhook. Verifique o URL de destino.',
                      });
                    }
                  } else if (!res.ok) {
                    setTestWebhookFeedback({
                      type: 'warn',
                      msg: data.error || 'Não foi possível enviar o webhook de teste.',
                    });
                  }
                } catch {
                  setTestWebhookFeedback({
                    type: 'warn',
                    msg: 'Erro de ligação ao testar o webhook.',
                  });
                } finally {
                  setTestingWebhook(false);
                }
              };

              return (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#1C1C1E] text-white flex items-center justify-center shrink-0">
                        <Webhook className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[#1C1C1E]">
                          Notificação de Venda por Webhook (Após Aprovação do Pedido)
                        </h4>
                        <p className="text-[11px] text-[#72726E] mt-0.5 leading-relaxed">
                          Sempre que aprovar um pedido na aba Encomendas (estado <strong>Aprovado / Entregue</strong>), é enviado um pedido <code className="font-mono bg-[#F5F4F0] px-1 rounded">POST JSON</code> em tempo real para o seu Webhook (Make, n8n, Zapier, Discord, Slack ou API própria).
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => updateWebhook({ enabled: !webhookCfg.enabled })}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                        webhookCfg.enabled
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#F5F4F0] text-[#555552] hover:text-[#1C1C1E]'
                      }`}
                    >
                      {webhookCfg.enabled ? 'Ligado' : 'Desligado'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-6">
                      <label className="block text-xs font-medium text-[#555552] mb-1">
                        URL do Webhook (Endpoint HTTPS)
                      </label>
                      <input
                        type="url"
                        value={webhookCfg.url}
                        onChange={(e) => updateWebhook({ url: e.target.value })}
                        placeholder="https://hook.eu2.make.com/... ou https://discord.com/api/webhooks/..."
                        className="w-full border border-black/15 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:border-[#1C1C1E]"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-[#555552]">
                          Segredo HMAC (opcional)
                        </label>
                        {webhookCfg.hasSecret && !webhookCfg.clearSecret && (
                          <button
                            type="button"
                            onClick={() =>
                              updateWebhook({ secret: '', clearSecret: true, hasSecret: false })
                            }
                            className="text-[10px] text-red-700 hover:underline cursor-pointer"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                      <input
                        type="password"
                        value={webhookCfg.secret || ''}
                        onChange={(e) =>
                          updateWebhook({
                            secret: e.target.value,
                            clearSecret: false,
                          })
                        }
                        placeholder={
                          webhookCfg.hasSecret && !webhookCfg.clearSecret
                            ? 'Segredo guardado (escreva para alterar)'
                            : 'Opcional: X-Lunora-Signature'
                        }
                        className="w-full border border-black/15 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:border-[#1C1C1E]"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <button
                        type="button"
                        disabled={testingWebhook}
                        onClick={handleSendTestWebhook}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1C1C1E] text-white text-xs font-medium hover:bg-[#323235] disabled:opacity-60 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{testingWebhook ? 'A enviar...' : 'Testar Webhook'}</span>
                      </button>
                    </div>
                  </div>

                  {webhookEnvConfigured && !webhookCfg.url.trim() && (
                    <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2">
                      A variável de servidor <span className="font-mono font-semibold">ORDER_WEBHOOK_URL</span> está configurada e será usada automaticamente quando o URL acima estiver vazio.
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setShowWebhookGuide((v) => !v)}
                      className="text-xs font-medium text-[#1C1C1E] underline hover:opacity-80 cursor-pointer"
                    >
                      {showWebhookGuide
                        ? 'Ocultar guia de integração & exemplo JSON'
                        : 'Ver como ligar (Make, n8n, Zapier, Discord) & exemplo JSON'}
                    </button>
                    <span className="text-[11px] text-[#72726E]">
                      Lembre-se de clicar em &ldquo;Guardar Popups &amp; Notificações&rdquo; após alterar o URL.
                    </span>
                  </div>

                  {showWebhookGuide && (
                    <div className="rounded-2xl bg-[#F5F4F0] border border-black/8 p-4 space-y-2.5 text-xs text-[#333330]">
                      <p className="font-semibold text-[#1C1C1E]">
                        Como ativar passo a passo:
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
                        <li>
                          Crie um Webhook no <strong>Make</strong>, <strong>n8n</strong>, <strong>Zapier</strong>, <strong>Discord</strong> (Definições do Canal → Integrações → Webhooks) ou na sua API.
                        </li>
                        <li>
                          Cole o URL <code className="font-mono bg-white px-1 rounded">https://...</code> acima, ligue o botão para <strong>Ligado</strong> e clique em <strong>Guardar Popups &amp; Notificações</strong>.
                        </li>
                        <li>
                          Use <strong>Testar Webhook</strong> para validar a ligação imediatamente. Depois disso, sempre que clicar em <strong>Aprovar (Entregue)</strong> numa encomenda, o webhook é disparado em tempo real.
                        </li>
                      </ol>
                      <pre className="bg-[#1C1C1E] text-white/90 rounded-xl p-3 text-[11px] font-mono overflow-x-auto leading-relaxed">
{`{
  "event": "sale.approved",
  "title": "Venda aprovada: Pedido de Vestido Lunora, 2",
  "store": { "name": "${storeName || 'Lunora Fashion'}", "currency": "${currencySymbol || 'Kz'}" },
  "order": {
    "id": "LUN-2049",
    "status": "Entregue",
    "total": 64000,
    "paymentMethod": "Multicaixa Express",
    "customer": { "name": "Nome do Cliente", "phone": "+244 ...", "city": "Luanda" },
    "items": [{ "name": "Vestido Lunora", "quantity": 2, "unitPrice": 32000, "description": "..." }]
  }
}`}
                      </pre>
                    </div>
                  )}

                  {testWebhookFeedback && (
                    <div
                      className={`rounded-xl px-3.5 py-2.5 text-xs ${
                        testWebhookFeedback.type === 'ok'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-900 border border-amber-200'
                      }`}
                    >
                      {testWebhookFeedback.msg}
                    </div>
                  )}

                  {webhookDeliveries.length > 0 && (
                    <div className="pt-2 border-t border-black/6 space-y-2">
                      <p className="text-xs font-semibold text-[#1C1C1E]">
                        Últimos Envios de Webhook
                      </p>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {webhookDeliveries.slice(0, 8).map((wh) => (
                          <div
                            key={wh.id}
                            className="p-3 rounded-xl bg-[#F5F4F0] border border-black/5 space-y-1"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-[#1C1C1E]">
                                {wh.title}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  wh.status === 'sent'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {wh.status === 'sent'
                                  ? `HTTP ${wh.httpStatus || 200} → ${wh.targetHost}`
                                  : wh.errorMessage || `Falha (${wh.targetHost})`}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#555552]">
                              Encomenda #{wh.orderId} · {wh.customerName} ·{' '}
                              {formatMoney(wh.total, wh.currencySymbol)}
                              {wh.isTest ? ' · Teste' : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            {(
              [
                {
                  key: 'entry' as const,
                  field: 'entryPopup' as const,
                  heading: 'Popup de Entrada na Loja',
                  description:
                    'Aparece automaticamente apenas para quem entra na loja (não aparece na Gestão).',
                  fallback: DEFAULT_STOREFRONT_CONFIG.entryPopup!,
                },
                {
                  key: 'postCheckout' as const,
                  field: 'postCheckoutPopup' as const,
                  heading: 'Popup Pós-Fatura (Após Confirmar Encomenda)',
                  description:
                    'Aparece automaticamente depois da fatura quando o cliente preenche o check-out e clica em "Confirmar Encomenda".',
                  fallback: DEFAULT_STOREFRONT_CONFIG.postCheckoutPopup!,
                },
              ] as const
            ).map((card) => {
              const current: StorePopupConfig = {
                ...card.fallback,
                ...(sf[card.field] || {}),
              };
              const updatePopup = (patch: Partial<StorePopupConfig>) => {
                updateSfDraft({
                  ...sf,
                  [card.field]: {
                    ...current,
                    ...patch,
                  },
                });
              };
              const selectedProduct = current.productId
                ? products.find((p) => p.id === current.productId)
                : undefined;
              const generatedProductUrl = selectedProduct
                ? buildProductUrl(selectedProduct.id)
                : '';

              return (
                <section
                  key={card.key}
                  className="bg-white rounded-[24px] p-6 border border-black/5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-[#1C1C1E]">{card.heading}</h4>
                      <p className="text-[11px] text-[#72726E] mt-0.5 leading-relaxed">
                        {card.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updatePopup({ enabled: !current.enabled })}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                        current.enabled
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#F5F4F0] text-[#555552] hover:text-[#1C1C1E]'
                      }`}
                    >
                      {current.enabled ? 'Ligado' : 'Desligado'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#555552] mb-1">
                        Selo / Etiqueta
                      </label>
                      <input
                        type="text"
                        value={current.badge}
                        onChange={(e) => updatePopup({ badge: e.target.value })}
                        placeholder="Ex: Novidade ou Oferta Especial"
                        className="w-full border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#555552] mb-1">
                        Texto do Botão
                      </label>
                      <input
                        type="text"
                        value={current.ctaText}
                        onChange={(e) => updatePopup({ ctaText: e.target.value })}
                        placeholder="Ex: Ver Produto"
                        className="w-full border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#555552] mb-1">
                      Título do Popup
                    </label>
                    <input
                      type="text"
                      value={current.title}
                      onChange={(e) => updatePopup({ title: e.target.value })}
                      placeholder="Título principal do banner popup"
                      className="w-full border border-black/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#555552] mb-1">
                      Descrição / Mensagem
                    </label>
                    <textarea
                      rows={2}
                      value={current.subtitle}
                      onChange={(e) => updatePopup({ subtitle: e.target.value })}
                      placeholder="Texto curto que aparece no popup"
                      className="w-full border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
                    />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#F5F4F0] border border-black/5 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-[#1C1C1E] mb-1">
                        Produto Ligado ao Botão
                      </label>
                      <select
                        value={current.productId || ''}
                        onChange={(e) => {
                          const nextProdId = e.target.value;
                          updatePopup({
                            productId: nextProdId,
                            buttonUrl: nextProdId ? buildProductUrl(nextProdId) : current.buttonUrl,
                          });
                        }}
                        className="w-full bg-white border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
                      >
                        <option value="">Sem produto selecionado (usar link manual ou catálogo)</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {p.category} ({formatMoney(p.price, currencySymbol)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <label className="block text-xs font-medium text-[#555552]">
                          Link do Produto / Destino no Botão (URL)
                        </label>
                        {generatedProductUrl && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(generatedProductUrl);
                                setCopiedPopupLinkKey(card.key);
                                setTimeout(() => setCopiedPopupLinkKey(null), 2000);
                              } catch {
                                // Ignore clipboard error
                              }
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1C1C1E] hover:underline cursor-pointer"
                          >
                            {copiedPopupLinkKey === card.key ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Link copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copiar Link do Produto</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={current.buttonUrl || ''}
                        onChange={(e) => {
                          const nextUrl = e.target.value;
                          updatePopup({
                            buttonUrl: nextUrl,
                            productId:
                              nextUrl.trim() && !nextUrl.includes('produto=')
                                ? ''
                                : current.productId,
                          });
                        }}
                        placeholder="https://.../?produto=... ou link de categoria/produto"
                        className="w-full bg-white border border-black/15 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#1C1C1E]"
                      />
                    </div>
                  </div>

                  {(() => {
                    const popupImages: string[] =
                      Array.isArray(current.images) && current.images.length > 0
                        ? current.images
                        : current.image
                        ? [current.image]
                        : [];
                    const filledCount = popupImages.filter((s) => s.trim()).length;

                    const applyPopupImages = (nextList: string[]) => {
                      const trimmedFirst = nextList.map((s) => s.trim()).find(Boolean) || '';
                      updatePopup({
                        images: nextList.slice(0, 20),
                        image: trimmedFirst,
                      });
                    };

                    const handleBatchUpload = async (
                      e: React.ChangeEvent<HTMLInputElement>
                    ) => {
                      const files = Array.from(e.target.files || []);
                      e.target.value = '';
                      if (files.length === 0) return;
                      const remainingSlots = Math.max(0, 20 - popupImages.filter((s) => s.trim()).length);
                      if (remainingSlots <= 0) return;
                      const targetFiles = files.slice(0, remainingSlots);
                      if (targetFiles.length === 0) return;

                      setUploadingPopupBatchKey(card.key);
                      try {
                        const uploadedUrls = await Promise.all(
                          targetFiles.map(async (file) => {
                            const dataUrl = await compressImageFileToDataUrl(file);
                            let finalUrl = dataUrl;
                            if (adminToken) {
                              try {
                                const res = await fetch('/api/admin/upload-image', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${adminToken}`,
                                  },
                                  body: JSON.stringify({ dataUrl, folder: 'banners' }),
                                });
                                if (res.ok) {
                                  const payload = await res.json().catch(() => null);
                                  if (payload?.url && typeof payload.url === 'string') {
                                    finalUrl = payload.url;
                                  }
                                }
                              } catch {
                                // Keep compressed data URL fallback
                              }
                            }
                            return finalUrl;
                          })
                        );
                        const existingFilled = popupImages.filter((s) => s.trim());
                        applyPopupImages([...existingFilled, ...uploadedUrls].slice(0, 20));
                      } finally {
                        setUploadingPopupBatchKey(null);
                      }
                    };

                    return (
                      <div className="p-3.5 rounded-2xl bg-[#F5F4F0] border border-black/5 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-[#1C1C1E]">
                              Imagens do Banner Popup ({filledCount})
                            </p>
                            <p className="text-[11px] text-[#72726E]">
                              Coloque 7 ou mais imagens (até 20). Mudam automaticamente a cada 2 segundos.
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1C1C1E] text-white text-[11px] font-medium hover:bg-[#323235] cursor-pointer whitespace-nowrap">
                              <ImagePlus className="w-3.5 h-3.5" />
                              <span>
                                {uploadingPopupBatchKey === card.key
                                  ? 'A carregar...'
                                  : 'Carregar Várias Fotos'}
                              </span>
                              <input
                                type="file"
                                multiple
                                accept="image/png,image/jpeg,image/webp"
                                onChange={handleBatchUpload}
                                className="hidden"
                              />
                            </label>
                            {popupImages.length < 20 && (
                              <button
                                type="button"
                                onClick={() => applyPopupImages([...popupImages, ''])}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-black/15 text-[11px] font-medium text-[#1C1C1E] hover:bg-black/5 cursor-pointer whitespace-nowrap"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Adicionar Espaço</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {popupImages.length === 0 ? (
                          <div className="rounded-xl bg-white border border-dashed border-black/15 p-4 text-center space-y-2">
                            <p className="text-xs text-[#72726E]">
                              Nenhuma imagem adicionada ainda neste popup.
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                applyPopupImages(['', '', '', '', '', '', ''])
                              }
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1C1C1E] text-white text-xs font-medium hover:bg-[#323235] cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Preparar 7 Espaços de Imagem</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                            {popupImages.map((imgUrl, idx) => (
                              <div
                                key={`${card.key}-img-${idx}`}
                                className="bg-white rounded-xl border border-black/8 p-3 space-y-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-semibold text-[#1C1C1E]">
                                    Imagem {idx + 1}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={() => {
                                        const next = [...popupImages];
                                        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                        applyPopupImages(next);
                                      }}
                                      aria-label={`Mover imagem ${idx + 1} para cima`}
                                      className="p-1 rounded-lg hover:bg-black/5 disabled:opacity-30 cursor-pointer"
                                    >
                                      <ArrowUp className="w-3.5 h-3.5 text-[#555552]" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={idx === popupImages.length - 1}
                                      onClick={() => {
                                        const next = [...popupImages];
                                        [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                                        applyPopupImages(next);
                                      }}
                                      aria-label={`Mover imagem ${idx + 1} para baixo`}
                                      className="p-1 rounded-lg hover:bg-black/5 disabled:opacity-30 cursor-pointer"
                                    >
                                      <ArrowDown className="w-3.5 h-3.5 text-[#555552]" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const next = popupImages.filter((_, i) => i !== idx);
                                        applyPopupImages(next);
                                      }}
                                      aria-label={`Remover imagem ${idx + 1}`}
                                      className="p-1 rounded-lg text-[#72726E] hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <ImageField
                                  compact
                                  recommendedSize="800 × 600 px"
                                  value={imgUrl}
                                  onChange={(nextUrl) => {
                                    const next = [...popupImages];
                                    next[idx] = nextUrl;
                                    applyPopupImages(next);
                                  }}
                                  allowEmpty
                                  uploadFolder="banners"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </section>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

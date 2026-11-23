import React from 'react';
import { useStore } from '../../context/StoreContext';

const WHATSAPP_NUMBER_INTL = '244934561558';
const WHATSAPP_DISPLAY = '934 561 558';

export const WhatsAppSupportButton: React.FC = () => {
  const { settings } = useStore();
  const storeName = settings.storeName?.trim() || 'Loja Online';
  const defaultMessage = encodeURIComponent(
    `Olá! Gostaria de falar com o suporte da ${storeName}.`
  );
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER_INTL}?text=${defaultMessage}`;

  return (
    <a
      href={whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Suporte via WhatsApp (${WHATSAPP_DISPLAY})`}
      title={`Falar no WhatsApp: ${WHATSAPP_DISPLAY}`}
      className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-30 print:hidden group inline-flex items-center gap-2.5 h-12 w-12 sm:w-auto sm:px-4 rounded-full bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-[0_10px_28px_-6px_rgba(37,211,102,0.55)] hover:shadow-[0_14px_34px_-6px_rgba(37,211,102,0.7)] transition-all duration-200 hover:-translate-y-0.5 justify-center"
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        className="w-6 h-6 shrink-0"
      >
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.82 14.01c-.25.7-1.44 1.33-2 1.42-.52.08-1.18.11-1.91-.12-.44-.14-1.01-.33-1.73-.64-3.04-1.31-5.02-4.38-5.17-4.58-.15-.2-1.23-1.64-1.23-3.13 0-1.49.78-2.22 1.06-2.52.28-.3.61-.38.81-.38.2 0 .4 0 .58.01.19.01.44-.07.69.52.25.6.86 2.09.94 2.24.08.15.13.33.03.53-.1.2-.15.33-.3.5-.15.17-.32.39-.45.52-.15.15-.31.31-.13.61.18.3.78 1.29 1.68 2.09 1.15 1.03 2.13 1.35 2.43 1.5.3.15.48.13.66-.08.18-.2.75-.88.95-1.18.2-.3.4-.25.68-.15.28.1 1.77.83 2.07.99.3.15.5.23.58.35.08.12.08.73-.17 1.43z" />
      </svg>
      <span className="hidden sm:inline text-xs font-semibold tracking-wide whitespace-nowrap">
        Suporte WhatsApp
      </span>
    </a>
  );
};

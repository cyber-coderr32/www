import React, { useEffect } from 'react';

export const PWAInstallPrompt: React.FC = () => {
  useEffect(() => {
    const handleBeforeInstallPrompt = () => {
      // Não bloquear o evento: o navegador deve mostrar a sugestão nativa.
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // A instalação é apresentada pelo próprio navegador, sem botão ou modal customizado.
  return null;
};

export default PWAInstallPrompt;

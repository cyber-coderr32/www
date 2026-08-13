let lastCallTime = 0;
const MIN_INTERVAL = 20000; // 20 seconds throttling to avoid spamming the server

const LOCAL_PHRASES: Record<string, string[]> = {
  'BETTING': [
    "Façam as vossas apostas no estádio!",
    "O jogo vai começar!",
    "Preparem os vossos bilhetes!",
    "Boa sorte a todos os apostadores!"
  ],
  'FLYING': [
    "As odds estão a subir!",
    "O multiplicador não para de crescer!",
    "Estamos na zona de lucro!",
    "Grande jogada em curso!"
  ],
  'CRASHED': [
    "Final do jogo! Fiquem atentos ao próximo.",
    "Que partida emocionante! Prontos para a próxima?",
    "A sorte favorece os audazes!",
    "Tentem novamente, o prémio está perto!"
  ]
};

export const getGameCommentary = async (status: string, multiplier?: number): Promise<string> => {
  const phrases = LOCAL_PHRASES[status] || ["Boa sorte!"];
  const randomLocal = phrases[Math.floor(Math.random() * phrases.length)];

  const now = Date.now();
  if (now - lastCallTime < MIN_INTERVAL) {
    return randomLocal;
  }

  try {
    lastCallTime = now;
    const response = await fetch("/api/gemini/commentary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status, multiplier })
    });

    if (response.ok) {
      const data = await response.json();
      return data?.text || randomLocal;
    }
    return randomLocal;
  } catch (error) {
    console.warn("API Status Warning: Fallback to local phrases due to network or server status.");
    return randomLocal;
  }
};

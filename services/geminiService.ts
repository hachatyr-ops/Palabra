
import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const LOCAL_DICTIONARY = [
  { es: "Abeja", ru: "Пчела" }, { es: "Abrazo", ru: "Объятие" }, { es: "Abuela", ru: "Бабушка" }, { es: "Abuelo", ru: "Дедушка" }, { es: "Agua", ru: "Вода" },
  { es: "Aire", ru: "Воздух" }, { es: "Alegría", ru: "Радость" }, { es: "Alma", ru: "Душа" }, { es: "Amigo", ru: "Друг" }, { es: "Amor", ru: "Любовь" },
  { es: "Árbol", ru: "Дерево" }, { es: "Arena", ru: "Песок" }, { es: "Arte", ru: "Искусство" }, { es: "Azúcar", ru: "Сахар" }, { es: "Azul", ru: "Синий" },
  { es: "Baile", ru: "Танец" }, { es: "Barco", ru: "Корабль" }, { es: "Beso", ru: "Поцелуй" }, { es: "Bicicleta", ru: "Велосипед" }, { es: "Blanco", ru: "Белый" },
  { es: "Boca", ru: "Рот" }, { es: "Bosque", ru: "Лес" }, { es: "Buen", ru: "Хороший" }, { es: "Buscar", ru: "Искать" },
  { es: "Caballo", ru: "Лошадь" }, { es: "Cabeza", ru: "Голова" }, { es: "Cielo", ru: "Небо" }, { es: "Ciudad", ru: "Город" }, { es: "Coche", ru: "Машина" },
  { es: "Comer", ru: "Есть" }, { es: "Corazón", ru: "Сердце" }, { es: "Cuerpo", ru: "Тело" }, { es: "Dedo", ru: "Палец" }, { es: "Deseo", ru: "Желание" },
  { es: "Día", ru: "День" }, { es: "Dinero", ru: "Деньги" }, { es: "Dulce", ru: "Сладкий" }, { es: "Escuela", ru: "Школа" }, { es: "Estrella", ru: "Звезда" },
  { es: "Felicidad", ru: "Счастье" }, { es: "Flor", ru: "Цветок" }, { es: "Fuego", ru: "Огонь" }, { es: "Gato", ru: "Кот" }, { es: "Gracias", ru: "Спасибо" },
  { es: "Hablar", ru: "Говорить" }, { es: "Hacer", ru: "Делать" }, { es: "Hermano", ru: "Брат" }, { es: "Hijo", ru: "Сын" }, { es: "Hola", ru: "Привет" },
  { es: "Hombre", ru: "Мужчина" }, { es: "Idea", ru: "Идея" }, { es: "Isla", ru: "Остров" }, { es: "Juego", ru: "Игра" }, { es: "Libro", ru: "Книга" },
  { es: "Luz", ru: "Свет" }, { es: "Madre", ru: "Мать" }, { es: "Mano", ru: "Рука" }, { es: "Mar", ru: "Море" }, { es: "Mundo", ru: "Мир" },
  { es: "Noche", ru: "Ночь" }, { es: "Nombre", ru: "Имя" }, { es: "Nuevo", ru: "Новый" }, { es: "Ojo", ru: "Глаз" }, { es: "Padre", ru: "Отец" },
  { es: "Pan", ru: "Хлеб" }, { es: "Paz", ru: "Мир" }, { es: "Perro", ru: "Собака" }, { es: "Persona", ru: "Человек" }, { es: "Playa", ru: "Пляж" },
  { es: "Puerta", ru: "Дверь" }, { es: "Querer", ru: "Хотеть" }, { es: "Sol", ru: "Солнце" }, { es: "Tiempo", ru: "Время" }, { es: "Vida", ru: "Жизнь" }
];

async function safeAiCall<T>(fn: () => Promise<T>, fallbackValue: T): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    console.error("AI Service Error:", error);
    return fallbackValue;
  }
}

export const getMnemonicHint = async (word: string, translation: string, lang: 'en' | 'ru'): Promise<string> => {
  return safeAiCall(async () => {
    // Force target language to Russian regardless of 'lang' parameter
    const targetLang = 'Russian';
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Help me remember the Spanish word "${word}" (which means "${translation}"). Give me a 1-sentence mnemonic hint in ${targetLang}. DO NOT use Spanish in the explanation.`,
      config: {
        systemInstruction: `You are a professional Spanish teacher. You explain mnemonics ONLY in ${targetLang}.`
      }
    });
    return response.text?.trim() || "";
  }, "");
};

export const translateWord = async (word: string, targetLang: 'en' | 'ru'): Promise<string> => {
  return safeAiCall(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate "${word}" from Spanish to ${targetLang === 'ru' ? 'Russian' : 'English'}. Return ONLY the translation.`,
    });
    return response.text?.trim() || "";
  }, "");
};

export const getSpanishTTS = async (text: string): Promise<string> => {
  return safeAiCall(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Pronounce: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
  }, "");
};

export const getRandomWord = async (lang: 'en' | 'ru', startsWith?: string): Promise<{ spanish: string; russian: string }> => {
  let pool = LOCAL_DICTIONARY;
  if (startsWith && startsWith !== 'All') {
    pool = LOCAL_DICTIONARY.filter(w => w.es.toUpperCase().startsWith(startsWith.toUpperCase()));
  }
  if (pool.length === 0) pool = LOCAL_DICTIONARY;
  const randomIdx = Math.floor(Math.random() * pool.length);
  return { spanish: pool[randomIdx].es, russian: pool[randomIdx].ru };
};

// Added transcribeAudio to fix error in VoiceButton.tsx
export const transcribeAudio = async (base64Data: string, mimeType: string, lang: 'en' | 'ru'): Promise<string> => {
  return safeAiCall(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: `Transcribe the following Spanish audio. Return ONLY the transcription text.`,
          },
        ],
      },
    });
    return response.text?.trim() || "";
  }, "");
};

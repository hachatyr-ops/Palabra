
import { GoogleGenAI, Modality, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const LOCAL_DICTIONARY = [
  { es: "Abeja", ru: "Пчела" }, { es: "Abrazo", ru: "Объятие" }, { es: "Abuela", ru: "Бабушка" }, { es: "Abuelo", ru: "Дедушка" }, { es: "Agua", ru: "Вода" },
  { es: "Aire", ru: "Воздух" }, { es: "Alegría", ru: "Радость" }, { es: "Alma", ru: "Душа" }, { es: "Amigo", ru: "Друг" }, { es: "Amor", ru: "Любовь" },
  { es: "Árbol", ru: "Дерево" }, { es: "Arena", ru: "Песок" }, { es: "Arte", ru: "Искусство" }, { es: "Azúcar", ru: "Сахар" }, { es: "Azul", ru: "Синий" },
  { es: "Baile", ru: "Танец" }, { es: "Barco", ru: "Корабль" }, { es: "Beso", ru: "Поцелуй" }, { es: "Bicicleta", ru: "Велосипед" }, { es: "Blanco", ru: "Белый" },
  { es: "Boca", ru: "Рот" }, { es: "Bosque", ru: "Лес" }, { es: "Buen", ru: "Хороший" }, { es: "Buscar", ru: "Искать" },
  { es: "Caballo", ru: "Лошадь" }, { es: "Cabeza", ru: "Голова" }, { es: "Cielo", ru: "Небо" }, { es: "Ciudad", ru: "Город" }, 
  { es: "Auto", ru: "Машина (Аргентина)" }, { es: "Coche", ru: "Машина" },
  { es: "Comer", ru: "Есть" }, { es: "Corazón", ru: "Сердце" }, { es: "Cuerpo", ru: "Тело" }, { es: "Dedo", ru: "Палец" }, { es: "Deseo", ru: "Желание" },
  { es: "Día", ru: "День" }, { es: "Dinero", ru: "Деньги" }, { es: "Dulce", ru: "Сладкий" }, { es: "Escuela", ru: "Школа" }, { es: "Estrella", ru: "Звезда" },
  { es: "Felicidad", ru: "Счастье" }, { es: "Flor", ru: "Цветок" }, { es: "Fuego", ru: "Огонь" }, { es: "Gato", ru: "Кот" }, { es: "Gracias", ru: "Спасибо" },
  { es: "Hablar", ru: "Говорить" }, { es: "Hacer", ru: "Делать" }, { es: "Hermano", ru: "Брат" }, { es: "Hijo", ru: "Сын" }, { es: "Hola", ru: "Привет" },
  { es: "Hombre", ru: "Мужчина" }, { es: "Idea", ru: "Идея" }, { es: "Isla", ru: "Остров" }, { es: "Juego", ru: "Игра" }, { es: "Libro", ru: "Книга" },
  { es: "Luz", ru: "Свет" }, { es: "Madre", ru: "Мать" }, { es: "Mano", ru: "Рука" }, { es: "Mar", ru: "Море" }, { es: "Mundo", ru: "Мир" },
  { es: "Noche", ru: "Ночь" }, { es: "Nombre", ru: "Имя" }, { es: "Nuevo", ru: "Новый" }, { es: "Ojo", ru: "Глаз" }, { es: "Padre", ru: "Отец" },
  { es: "Pan", ru: "Хлеб" }, { es: "Paz", ru: "Мир" }, { es: "Perro", ru: "Собака" }, { es: "Persona", ru: "Человек" }, { es: "Playa", ru: "Пляж" },
  { es: "Puerta", ru: "Дверь" }, { es: "Querer", ru: "Хотеть" }, { es: "Sol", ru: "Солнце" }, { es: "Tiempo", ru: "Время" }, { es: "Vida", ru: "Жизнь" },
  // Argentinian variations
  { es: "Frutilla", ru: "Клубника (Аргентина)" }, { es: "Fresa", ru: "Клубника" },
  { es: "Computadora", ru: "Компьютер (Аргентина)" }, { es: "Ordenador", ru: "Компьютер" },
  { es: "Celular", ru: "Мобильный телефон (Аргентина)" }, { es: "Móvil", ru: "Мобильный телефон" },
  { es: "Ananá", ru: "Ананас (Аргентина)" }, { es: "Piña", ru: "Ананас" },
  { es: "Colectivo", ru: "Автобус (Аргентина)" }, { es: "Autobús", ru: "Автобус" },
  { es: "Subte", ru: "Метро (Аргентина)" }, { es: "Metro", ru: "Метро" },
  { es: "Pollera", ru: "Юбка (Аргентина)" }, { es: "Falda", ru: "Юбка" },
  { es: "Saco", ru: "Пиджак/Куртка (Аргентина)" }, { es: "Chaqueta", ru: "Куртка" },
  { es: "Laburo", ru: "Работа (Аргентина, сленг)" }, { es: "Trabajo", ru: "Работа" },
  { es: "Pibe", ru: "Парень/Мальчик (Аргентина)" }, { es: "Chico", ru: "Мальчик" },
  { es: "Mina", ru: "Девушка (Аргентина, сленг)" }, { es: "Chica", ru: "Девушка" },
  { es: "Guita", ru: "Деньги (Аргентина, сленг)" }, { es: "Dinero", ru: "Деньги" },
  { es: "Morfar", ru: "Есть/Кушать (Аргентина, сленг)" }, { es: "Comer", ru: "Есть" },
  { es: "Bondi", ru: "Автобус (Аргентина, сленг)" },
  { es: "Che", ru: "Эй/Друг (Аргентинское обращение)" },
  { es: "Bárbaro", ru: "Отлично/Круто (Аргентина)" },
  { es: "Copado", ru: "Крутой/Классный (Аргентина)" },
  { es: "Facturas", ru: "Выпечка (Аргентина)" },
  { es: "Pileta", ru: "Бассейн (Аргентина)" }, { es: "Piscina", ru: "Бассейн" },
  { es: "Choclo", ru: "Кукуруза (Аргентина)" }, { es: "Maíz", ru: "Кукуруза" },
  { es: "Zapallo", ru: "Тыква (Аргентина)" }, { es: "Calabaza", ru: "Тыква" },
  { es: "Durazno", ru: "Персик (Аргентина)" }, { es: "Melocotón", ru: "Персик" },
  { es: "Arvejas", ru: "Горошек (Аргентина)" }, { es: "Guisantes", ru: "Горошек" },
  { es: "Porotos", ru: "Фасоль (Аргентина)" }, { es: "Judías", ru: "Фасоль" },
  { es: "Maní", ru: "Арахис (Аргентина)" }, { es: "Cacahuete", ru: "Арахис" },
  { es: "Manteca", ru: "Сливочное масло (Аргентина)" }, { es: "Mantequilla", ru: "Сливочное масло" },
  { es: "Remera", ru: "Футболка (Аргентина)" }, { es: "Camiseta", ru: "Футболка" },
  { es: "Zapatillas", ru: "Кроссовки (Аргентина)" }, { es: "Deportivas", ru: "Кроссовки" },
  { es: "Campera", ru: "Куртка (Аргентина)" }, { es: "Chaqueta", ru: "Куртка" },
  { es: "Buzo", ru: "Толстовка (Аргентина)" }, { es: "Sudadera", ru: "Толстовка" },
  { es: "Malla", ru: "Купальник (Аргентина)" }, { es: "Bañador", ru: "Купальник" },
  { es: "Valija", ru: "Чемодан (Аргентина)" }, { es: "Maleta", ru: "Чемодан" },
  { es: "Vereda", ru: "Тротуар (Аргентина)" }, { es: "Acera", ru: "Тротуар" },
  { es: "Cuadra", ru: "Квартал (Аргентина)" }, { es: "Manzana", ru: "Квартал/Яблоко" },
  { es: "Manejar", ru: "Водить машину (Аргентина)" }, { es: "Conducir", ru: "Водить машину" },
  { es: "Estacionar", ru: "Парковаться (Аргентина)" }, { es: "Aparcar", ru: "Парковаться" },
  { es: "Alquilar", ru: "Арендовать (Аргентина)" }, { es: "Arrendar", ru: "Арендовать" },
  { es: "Extrañar", ru: "Скучать (Аргентина)" }, { es: "Echar de menos", ru: "Скучать" },
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
      contents: `Help me remember the Spanish word "${word}" (which means "${translation}"). 
      Give me a 1-sentence mnemonic hint in ${targetLang}. 
      Note: The user is learning Argentinian Spanish (Rioplatense), so prioritize Argentinian nuances if applicable.
      DO NOT use Spanish in the explanation.`,
      config: {
        systemInstruction: `You are a professional Spanish teacher specializing in Argentinian Spanish (Rioplatense). You explain mnemonics ONLY in ${targetLang}.`
      }
    });
    return response.text?.trim() || "";
  }, "");
};

export const translateWord = async (word: string, targetLang: 'en' | 'ru'): Promise<string> => {
  return safeAiCall(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate "${word}" between Spanish and ${targetLang === 'ru' ? 'Russian' : 'English'}.
      If the input is Spanish, translate it to ${targetLang === 'ru' ? 'Russian' : 'English'}.
      If the input is Russian or English, translate it to Spanish.
      IMPORTANT: Use Argentinian Spanish (Rioplatense) variations where appropriate (e.g., "auto" instead of "coche", "computadora" instead of "ordenador").
      Return ONLY the translation.`,
      config: {
        systemInstruction: `You are a professional translator specializing in Argentinian Spanish (Rioplatense) and Russian/English.`
      }
    });
    return response.text?.trim() || "";
  }, "");
};

export const getSpanishTTS = async (text: string): Promise<string> => {
  return "";
};

export const parseVocabularyFromText = async (text: string): Promise<{ es: string; ru: string; index?: number }[]> => {
  return safeAiCall(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract Spanish words and their Russian translations from the following text. 
      The text might be a list, a table, or just sentences. 
      
      Format Note: 
      - The user often uses a format like: "1. Spanish - Russian" (number, dot, Spanish, separator like dash/minus, Russian).
      - Lines starting with "#" are comments and should be ignored.
      - The user is learning Argentinian Spanish (Rioplatense), so if you encounter regional variations, map them correctly.
      
      Return a JSON array of objects with "es" (Spanish), "ru" (Russian), and optional "index" (number) keys.
      
      Text:
      ${text}`,
      config: {
        systemInstruction: `You are a professional linguist specializing in Argentinian Spanish (Rioplatense) and Russian.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              es: { type: Type.STRING },
              ru: { type: Type.STRING },
              index: { type: Type.NUMBER }
            },
            required: ["es", "ru"]
          }
        }
      }
    });
    
    try {
      return JSON.parse(response.text || "[]");
    } catch {
      return [];
    }
  }, []);
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

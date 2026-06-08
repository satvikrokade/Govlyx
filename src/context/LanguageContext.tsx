import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

// ─── Language map ──────────────────────────────────────────────────────────────
export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English",           nativeLabel: "English" },
  { code: "hi", label: "Hindi",             nativeLabel: "हिंदी" },
  { code: "mr", label: "Marathi",           nativeLabel: "मराठी" },
  { code: "te", label: "Telugu",            nativeLabel: "తెలుగు" },
  { code: "ta", label: "Tamil",             nativeLabel: "தமிழ்" },
  { code: "bn", label: "Bengali",           nativeLabel: "বাংলা" },
  { code: "gu", label: "Gujarati",          nativeLabel: "ગુજરાતી" },
  { code: "kn", label: "Kannada",           nativeLabel: "ಕನ್ನಡ" },
  { code: "ml", label: "Malayalam",         nativeLabel: "മലയാളം" },
  { code: "pa", label: "Punjabi",           nativeLabel: "ਪੰਜਾਬੀ" },
  { code: "ur", label: "Urdu",              nativeLabel: "اردو" },
] as const;

export type LangCode = typeof SUPPORTED_LANGUAGES[number]["code"];

const STORAGE_KEY = "govlyx_ui_language";

// ─── Translate helper (Google unofficial endpoint) ────────────────────────────
async function googleTranslateBatch(
  texts: string[],
  targetLang: string
): Promise<string[]> {
  if (targetLang === "en") return texts;
  try {
    const results: string[] = [];
    for (const text of texts) {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      const json = await res.json();
      // Response shape: [[["translatedText","sourceText",...],...],...]
      const translated = (json[0] as [string, string][])
        .map((seg) => seg[0])
        .join("");
      results.push(translated || text);
    }
    return results;
  } catch {
    return texts;
  }
}

export async function translateText(
  text: string,
  targetLang: string
): Promise<string> {
  if (!text || targetLang === "en") return text;
  const [result] = await googleTranslateBatch([text], targetLang);
  return result;
}

// ─── DOM-level full-page translation ─────────────────────────────────────────
/**
 * Walks all visible text nodes under document.body and translates them
 * to `targetLang`. Stores original values so we can revert to English.
 */
const originals = new WeakMap<Text, string>();
let currentPageLang = "en";

async function applyPageTranslation(lang: string) {
  if (lang === currentPageLang) return;

  // First: revert to originals if switching
  if (currentPageLang !== "en") {
    revertPageTranslation();
  }

  currentPageLang = lang;
  if (lang === "en") return;

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toLowerCase();
        // Skip scripts, styles, inputs, textareas, code blocks
        if (["script", "style", "noscript", "input", "textarea", "code", "pre"].includes(tag))
          return NodeFilter.FILTER_REJECT;
        const text = (node.textContent ?? "").trim();
        if (!text || text.length < 2) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  const nodes: Text[] = [];
  let current: Node | null;
  while ((current = walker.nextNode())) {
    nodes.push(current as Text);
  }

  // Save originals
  for (const node of nodes) {
    if (!originals.has(node)) {
      originals.set(node, node.textContent ?? "");
    }
  }

  // Batch translate in groups of 20 to avoid very long URLs
  const BATCH = 20;
  for (let i = 0; i < nodes.length; i += BATCH) {
    if (currentPageLang !== lang) break; // aborted
    const batch = nodes.slice(i, i + BATCH);
    const texts = batch.map((n) => originals.get(n) ?? n.textContent ?? "");
    const translated = await googleTranslateBatch(texts, lang);
    for (let j = 0; j < batch.length; j++) {
      if (batch[j].isConnected) {
        batch[j].textContent = translated[j];
      }
    }
  }
}

function revertPageTranslation() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    const orig = originals.get(textNode);
    if (orig !== undefined && textNode.isConnected) {
      textNode.textContent = orig;
    }
  }
  // Soft-clear tracked originals by resetting the sentinel
  // (WeakMap entries are GC'd automatically when nodes detach)
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface LanguageContextValue {
  language: LangCode;
  setLanguage: (lang: LangCode) => void;
  isTranslating: boolean;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: () => {},
  isTranslating: false,
});

export const useLanguage = () => useContext(LanguageContext);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LangCode>(
    () => (localStorage.getItem(STORAGE_KEY) as LangCode) ?? "en"
  );
  const [isTranslating, setIsTranslating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setLanguage = useCallback((lang: LangCode) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (language === "en") {
      currentPageLang = "en";
      revertPageTranslation();
      setIsTranslating(false);
      return;
    }

    // Small debounce so rapid changes don't fire multiple translations
    debounceRef.current = setTimeout(async () => {
      setIsTranslating(true);
      await applyPageTranslation(language);
      setIsTranslating(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isTranslating }}>
      {children}
    </LanguageContext.Provider>
  );
}

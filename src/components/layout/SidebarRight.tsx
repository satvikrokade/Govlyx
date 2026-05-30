import { useState, useEffect } from "react";
import { Newspaper, RefreshCw, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";
import govlyxLogo from "../../assets/govlyx.svg";

const FALLBACK_QUOTES = [
  { q: "If you see a pothole, name it. It makes it harder for the city to ignore it when it has a name.", a: "Civic Duty Tip" },
  { q: "A clean neighborhood is the best way to make your neighbors think you have your life together.", a: "Neighborhood Logic" },
  { q: "CSS is a puzzle where margins fight to the death.", a: "Developer Humor" },
  { q: "Rumor has it, if you report a street light out on Govlyx, a real-life superhero gets their wings.", a: "Urban Legend" },
  { q: "Honest municipal feedback: 'I love construction season,' said absolutely no one, ever.", a: "Civic Sarcasm" },
  { q: "Keep your neighborhood clean. Your dog's reputation is on the line.", a: "Dog Owner Rules" },
  { q: "The road to success is always under construction. Just like Main Street.", a: "Traffic Reality" },
  { q: "Democracy is not a spectator sport. Put on your jersey and get in the game!", a: "Civic Wisdom" }
];

const QuoteWidgetCard = () => {
  const [quote, setQuote] = useState(() => FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)]);
  const [loading, setLoading] = useState(false);

  const fetchQuote = async () => {
    setLoading(true);
    try {
      const res = await fetch("https://zenquotes.io/api/quotes");
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.length);
        setQuote({ q: data[randomIndex].q, a: data[randomIndex].a || "Unknown" });
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      const randomQuote = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
      setQuote(randomQuote);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuote();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-2.5 rounded-2xl border border-[#1D4ED8]/10 bg-gradient-to-br from-[#1D4ED8]/5 via-[#1D4ED8]/10 to-transparent shadow-sm relative overflow-hidden group/quote"
    >
      <div className="absolute top-[-30%] right-[-20%] w-24 h-24 bg-[#1D4ED8]/5 rounded-full blur-xl pointer-events-none" />
      <div className="relative z-10 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-[#1D4ED8]/10 flex items-center justify-center text-[#1D4ED8]">
              <Lightbulb size={12} />
            </div>
            <span className="text-[9px] font-black text-[#1D4ED8] uppercase tracking-[0.15em]">Quote of the Hour</span>
          </div>
          <button
            onClick={fetchQuote}
            disabled={loading}
            className="p-1 rounded hover:bg-base-200 text-base-content/50 hover:text-[#1D4ED8] transition-colors disabled:opacity-50"
            title="Get new quote"
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <p className="text-[11px] font-bold text-base-content/85 italic leading-snug">
          "{quote.q}"
        </p>
        <span className="text-[8px] font-black text-base-content/40 uppercase tracking-wider self-end mt-0.5">
          — {quote.a}
        </span>
      </div>
    </motion.div>
  );
};

type Article = {
  title: string;
  url: string;
  source: { name: string };
};

const FALLBACK_NEWS_POOL: Article[] = [
  {
    title: "India emerges as global hub for startup innovation and AI adoption in 2026",
    source: { name: "Tech Trends" },
    url: "https://newsapi.org"
  },
  {
    title: "Vande Bharat Express expands routes: New high-speed connectivity across states",
    source: { name: "Infra News" },
    url: "https://newsapi.org"
  },
  {
    title: "SpaceX Starlink gets preliminary approval for operations in India",
    source: { name: "Telecom Wire" },
    url: "https://newsapi.org"
  },
  {
    title: "Indian space startup launches record-breaking private satellite constellation",
    source: { name: "Cosmic Chronicle" },
    url: "https://newsapi.org"
  },
  {
    title: "New AI policy framework announced to boost ethics and open-source models",
    source: { name: "Policy Desk" },
    url: "https://newsapi.org"
  },
  {
    title: "UPI transactions touch new milestone, crossing 15 billion monthly volume",
    source: { name: "FinTech World" },
    url: "https://newsapi.org"
  },
  {
    title: "Electric vehicle sales in India grow by 80% year-on-year in major cities",
    source: { name: "Auto Tech" },
    url: "https://newsapi.org"
  },
  {
    title: "ISRO prepares for next-gen lunar exploration mission with international collaboration",
    source: { name: "Space Daily" },
    url: "https://newsapi.org"
  },
  {
    title: "Clean energy grids expand as India adds record solar capacity this quarter",
    source: { name: "Green Tech" },
    url: "https://newsapi.org"
  },
  {
    title: "Developer hiring peaks for Rust and Go developers in Bangalore tech hubs",
    source: { name: "Dev Culture" },
    url: "https://newsapi.org"
  }
];

const getRandomFallbackNews = (): Article[] => {
  const shuffled = [...FALLBACK_NEWS_POOL].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
};

const NewsWidgetCard = () => {
  const [articles, setArticles] = useState<Article[]>(() => getRandomFallbackNews());
  const [loading, setLoading] = useState(false);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const apiKey = "317ca04ba4c6425b99b4402122ec53eb";
      const res = await fetch(`https://newsapi.org/v2/top-headlines?country=in&category=technology&apiKey=${apiKey}`);
      const data = await res.json();
      if (data.status === "ok" && Array.isArray(data.articles) && data.articles.length > 0) {
        const validArticles = data.articles
          .filter((art: any) => art.title && art.title !== "[Removed]")
          .map((art: any) => ({
            title: art.title,
            url: art.url,
            source: { name: art.source?.name || "News" }
          }));
        if (validArticles.length > 0) {
          const shuffled = validArticles.sort(() => 0.5 - Math.random());
          setArticles(shuffled.slice(0, 3));
        } else {
          throw new Error("No valid articles");
        }
      } else {
        throw new Error("Failed to fetch news or bad response status");
      }
    } catch (err) {
      setArticles(getRandomFallbackNews());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-2.5 rounded-2xl border border-base-300 bg-base-100/50 shadow-sm backdrop-blur-md relative overflow-hidden group/news"
    >
      <div className="absolute top-[-30%] right-[-20%] w-24 h-24 bg-base-content/5 rounded-full blur-xl pointer-events-none" />
      <div className="relative z-10 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Newspaper size={12} />
            </div>
            <span className="text-[9px] font-black text-amber-500 uppercase tracking-[0.15em]">Trending News</span>
          </div>
          <button
            onClick={fetchNews}
            disabled={loading}
            className="p-1 rounded-md hover:bg-base-200 text-base-content/50 hover:text-amber-500 transition-colors disabled:opacity-50"
            title="Refresh news"
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          {articles.map((art, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-0.5 p-1.5 px-2 rounded-xl border border-base-200/50 bg-base-200/20 hover:bg-base-200/40 transition-colors"
            >
              <p className="text-[10px] font-semibold text-base-content/85 line-clamp-2 leading-snug">
                {art.title}
              </p>
              <span className="text-[8px] font-bold text-base-content/40 uppercase tracking-wider">
                {art.source.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const SidebarRight = () => {
  return (
    <>
      <aside className="flex min-h-full flex-col gap-3 pb-8">

        {/* Trending News Widget */}
        <NewsWidgetCard />

        {/* Quote of the Hour Widget */}
        <QuoteWidgetCard />

        {/* 3D App Logo Section */}
        <div className="mt-auto mb-16 flex flex-col items-center p-1 pt-2">
          <motion.div
            className="relative flex h-28 w-28 items-center justify-center"
            initial={{ rotateY: 0, rotateX: 0 }}
            animate={{
              rotateY: [0, 15, 0, -15, 0],
              rotateX: [0, 5, 0, -5, 0],
              y: [0, -4, 0]
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{ perspective: 1000, transformStyle: "preserve-3d" }}
          >
            {/* Glow effect */}
            <div className="absolute inset-0 scale-125 rounded-full bg-[#1D4ED8]/10 blur-xl filter" />

            <motion.img
              src={govlyxLogo}
              alt="Govlyx Logo"
              className="z-10 h-28 w-28 drop-shadow-2xl opacity-80"
              whileHover={{ scale: 1.1, rotateY: 180 }}
              transition={{ duration: 0.8 }}
            />
          </motion.div>
          <p className="mt-2 text-center text-[10px] font-black tracking-[0.4em] opacity-40 uppercase">
            Govlyx
          </p>
        </div>

      </aside>

    </>
  );
};

export default SidebarRight;
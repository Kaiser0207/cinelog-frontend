import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const translations = {
  en: {
    // Brand Statement
    footerTitle: "CINEROOM is my creative movie journal 🎬",
    footerDesc: "CINEROOM is a multidisciplinary journal of cinematic ratings, deep-dive reviews, and raw visual thoughts curated by me. I explore, play, and make movie logs fizzzzz with life and personality. I strongly believe that reviewing movies is about more than just giving stars— it's about capturing the soul of storytelling in my signature aesthetic! 🎬✨🍿",
    followIg: "Follow on Instagram",
    curatedBy: "Curated by kaiser_liao. Crafted with passion for movie enthusiasts.",
    disclaimer: "Disclaimer: All reviews, scores, and media are for educational and critique purposes.",
    
    // HomePage
    filterAll: "All",
    newest: "Newest First",
    rating: "Highest Rated",
    title: "Title A → Z",
    addReview: "Add Review",

    // Genres
    All: "All",
    Action: "Action",
    Comedy: "Comedy",
    Drama: "Drama",
    Horror: "Horror",
    "Sci-Fi": "Sci-Fi",
    Thriller: "Thriller",
    Romance: "Romance",
    Animation: "Animation",
    Documentary: "Documentary",

    // DetailPage
    back: "← BACK",
    totalScore: "Total Score",
    entertainment: "🎭 Entertainment",
    cinematic: "🎬 Cinematic",
    synopsis: "Synopsis",
    review: "Review",
    aiRecommendation: "🤖 AI Director's Cut",
    alsoWatch: "Also Watch",
    cast: "CAST",
    soundtrack: "🎵 Soundtrack Pick",
    watchHistory: "Watch History",
    watchHistoryUpper: "🕒 WATCH HISTORY",
    editReview: "✏️ Edit Review",
    shareStory: "📱 Share to Story",
    deleteReview: "🗑️ Delete Review",
    created: "Created:",
    updated: "Updated:",
    confirmDelete: "Delete this review permanently?",
    deleteSuccess: "Review deleted.",
  },
  zh: {
    // Brand Statement
    footerTitle: "CINEROOM 是我的創意影評日誌 🎬",
    footerDesc: "CINEROOM 是一個由我一手策劃的跨學科影評日誌，融合了電影評分、深度分析與最真實的視覺靈感。我在此探索、玩樂，並為每一篇觀影紀錄注入滿滿的生命力與獨特個性。我深信，撰寫影評絕僅僅是打星評分——更重要的是用我最具代表性的視覺美學，完美捕捉電影故事背後的靈魂！🎬✨🍿",
    followIg: "追蹤我的 Instagram",
    curatedBy: "由 kaiser_liao 策劃。為熱愛電影的你傾心打造。",
    disclaimer: "免責聲明：本站所有影評、評分與相關媒體資源僅限於教育與學術評論用途。",
    
    // HomePage
    filterAll: "全部電影",
    newest: "最新發表",
    rating: "評分最高",
    title: "片名 A → Z",
    addReview: "新增影評",

    // Genres
    All: "全部電影",
    Action: "動作",
    Comedy: "喜劇",
    Drama: "劇情",
    Horror: "恐怖",
    "Sci-Fi": "科幻",
    Thriller: "驚悚",
    Romance: "愛情",
    Animation: "動畫",
    Documentary: "紀錄片",

    // DetailPage
    back: "← 返回",
    totalScore: "總體評分",
    entertainment: "🎭 娛樂指標",
    cinematic: "🎬 藝術指標",
    synopsis: "劇情簡介",
    review: "深度影評",
    aiRecommendation: "🤖 AI 導演剪輯版",
    alsoWatch: "推薦延伸觀看",
    cast: "演員陣容",
    soundtrack: "🎵 推薦原聲帶",
    watchHistory: "觀影歷史",
    watchHistoryUpper: "🕒 觀影歷史記錄",
    editReview: "✏️ 編輯影評",
    shareStory: "📱 分享至限動",
    deleteReview: "🗑️ 刪除影評",
    created: "發表於：",
    updated: "更新於：",
    confirmDelete: "確定要永久刪除此篇影評嗎？",
    deleteSuccess: "影評已成功刪除。",
  }
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('cineroom_lang') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('cineroom_lang', lang);
  }, [lang]);

  const toggleLanguage = () => {
    setLang((l) => (l === 'en' ? 'zh' : 'en'));
  };

  const t = (key) => {
    return translations[lang]?.[key] || translations['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

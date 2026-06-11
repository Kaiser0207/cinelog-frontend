import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const translations = {
  en: {
    // Brand Statement
    footerTitle: "CINEROOMS is my creative movie journal 🎬",
    footerSubtitle: "is my creative movie journal 🎬",
    footerDesc: "CINEROOMS is a multidisciplinary journal of cinematic ratings, deep-dive reviews, and raw visual thoughts curated by me. I explore, play, and make movie logs fizzzzz with life and personality. I strongly believe that reviewing movies is about more than just giving stars— it's about capturing the soul of storytelling in my signature aesthetic! 🎬✨🍿",
    followIg: "Follow on Instagram",
    curatedBy: "Curated by kaiser_liao. Crafted with passion for movie enthusiasts.",
    disclaimer: "Disclaimer: All reviews, scores, and media are for educational and critique purposes.",
    
    // HomePage
    filterAll: "All",
    watched: "Recently Watched",
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
    Mystery: "Mystery",
    Documentary: "Documentary",

    // DetailPage
    back: "← BACK",
    totalScore: "Total Score",
    entertainment: "Entertainment",
    cinematic: "Cinematic",
    synopsis: "Synopsis",
    review: "Review",
    aiDirectorsCut: "AI Director's Cut",
    alsoWatch: "Also Watch",
    cast: "CAST",
    directors: "Director",
    writers: "Screenplay",
    recommendations: "Similar Movies",
    soundtrack: "🎵 Soundtrack Pick",
    watchHistory: "Watch History",
    watchHistoryUpper: "🕒 WATCH HISTORY",
    editReview: "✏️ Edit Review",
    shareStory: "📱 Share to Story",
    deleteReview: "🗑️ Delete Review",
    readReview: "Read Review",
    emotion: "Emotion",
    pacing: "Pacing",
    acting: "Acting",
    cinematography: "Cinematography",
    soundtrackLabel: "Soundtrack",
    story: "Story",
    created: "Created:",
    updated: "Updated:",
    confirmDelete: "Delete this review permanently?",
    deleteSuccess: "Review deleted.",
    recentlyWatched: "Recently Watched",
    featured: "Featured",
    setFeatured: "Set as Featured",
    unfeature: "Unfeature",
    featuredSet: "Set as featured cover ✨",
    featuredUnset: "Removed from featured",

    // Mobile specific
    navHome: "Home",
    navSearch: "Search",
    navStats: "Stats",
    statistics: "Statistics",
    totalReviews: "Total Reviews",
    averageScore: "Average Score",
    topGenre: "Top Genre",
    statsDesc: "Keep watching movies to build your cinematic profile.",
    searchPlaceholder: "Search movies...",
    searchAiPlaceholder: "Describe the feeling...",
    searchingFor: "Searching for",
    closeToViewResults: "Close this screen to view results",
    searchTips: "Search Tips",
    standardSearch: "Standard Search",
    standardDesc: "Search by movie title, director, or cast members.",
    aiSearch: "AI Semantic Search",
    aiDesc: 'Search by vibe, mood, or concepts. Example: "a movie about space travel and love"',
    // New Features
    aiTldr: "AI TL;DR",
    aiTldrLoading: "Generating Summary...",
    aiTldrSuccess: "Summary generated!",
    aiTldrError: "Failed to generate summary.",
    aiTldrRetry: "Regenerate Summary",
    watchingTimeline: "Watching Timeline",
    genreBreakdown: "Genre Breakdown",
    thisYear: "This Year",
    noRecords: "No watch records yet",
    allYears: "All",
    watches: "Watches",
    genreScores: "Genre Scores",
    highest: "Highest",
    lowest: "Lowest",

    // Reactions + Suggestion box
    reactLabel: "Your take",
    reactError: "Reaction failed. Try again.",
    suggestBox: "Recommend a Movie",
    inbox: "Suggestion Inbox",
    navSuggest: "Suggest",
    navInbox: "Inbox",
    sentLabel: "Sent",
    suggestTitle: "Recommend a movie to Kaiser",
    suggestSubtitle: "Found something I'd love? Drop it in the box.",
    suggestTitleLabel: "Title",
    suggestTitlePlaceholder: "Pick above, or type a title",
    suggestNote: "Why this one? (optional)",
    suggestNotePlaceholder: "A line on why I should watch it...",
    suggestName: "Your name (optional)",
    suggestNamePlaceholder: "Anonymous",
    suggestSubmit: "Send Recommendation",
    suggestSuccess: "Thanks! Your recommendation was sent.",
    suggestError: "Failed to send. Please try again.",
    suggestEmptyTitle: "Please pick or type a title first.",
    inboxEmpty: "No suggestions yet.",
    inboxAdopt: "Adopt",
    inboxWrite: "Write review",
    inboxDismiss: "Dismiss",
    inboxDelete: "Delete",
    tabNew: "Pending",
    tabAdopted: "Adopted",
    tabDismissed: "Dismissed",

    // PWA install prompt
    installTitle: "Add CineRooms to your Home Screen",
    installDesc: "Get the full-screen, app-like experience.",
    installBtn: "Install App",
    iosInstallHintPre: "Tap",
    iosInstallHintPost: "then “Add to Home Screen”",
    openInSafari: "Tap ··· and choose “Open in Safari” to install.",
    installDismiss: "Maybe later",
  },
  zh: {
    // Brand Statement
    footerTitle: "CINEROOMS\n是我的創意影評日誌 🎬",
    footerSubtitle: "是我的創意影評日誌 🎬",
    footerDesc: "身為一個視覺動物，CINEROOMS 是一個由我一手策劃且製作的影評日誌，融合了電影評分、深度分析與記錄我個人想法。我在此探索、玩樂，並為每一篇觀影紀錄注入滿滿的生命力與獨特個性。我深信，撰寫影評不僅僅是打星評分 —— 更重要的是，我希望能完美捕捉電影故事背後的靈魂與本質，傳播並分享觀影的樂趣🎬✨🍿",
    followIg: "追蹤我的 Instagram",
    curatedBy: "由 kaiser_liao 策劃。為熱愛電影的你傾心打造。",
    disclaimer: "免責聲明：本站所有影評、評分與相關媒體資源僅限於教育與學術評論用途。",
    
    // HomePage
    filterAll: "全部類型",
    watched: "最近觀看",
    newest: "最新發表",
    rating: "評分最高",
    title: "片名 A → Z",
    addReview: "新增影評",

    // Genres
    All: "全部類型",
    Action: "動作",
    Comedy: "喜劇",
    Drama: "劇情",
    Horror: "恐怖",
    "Sci-Fi": "科幻",
    Thriller: "驚悚",
    Romance: "愛情",
    Animation: "動畫",
    Mystery: "懸疑",
    Documentary: "紀錄片",

    // DetailPage
    back: "← 返回",
    totalScore: "總體評分",
    entertainment: "娛樂指標",
    cinematic: "藝術指標",
    synopsis: "劇情簡介",
    review: "深度影評",
    aiDirectorsCut: "AI 導演剪輯版",
    alsoWatch: "推薦延伸觀看",
    cast: "演員陣容",
    directors: "導演",
    writers: "編劇",
    recommendations: "推薦 / 類似電影",
    soundtrack: "🎵 推薦原聲帶",
    watchHistory: "觀影歷史",
    watchHistoryUpper: "🕒 觀影歷史記錄",
    editReview: "✏️ 編輯影評",
    shareStory: "📱 分享至限動",
    deleteReview: "🗑️ 刪除影評",
    readReview: "閱讀影評",
    emotion: "情感共鳴",
    pacing: "節奏與剪輯",
    acting: "演員表現",
    cinematography: "攝影與視覺",
    soundtrackLabel: "配樂與音效",
    story: "故事劇本",
    created: "發表於：",
    updated: "更新於：",
    confirmDelete: "確定要永久刪除此篇影評嗎？",
    deleteSuccess: "影評已成功刪除。",
    recentlyWatched: "最近觀看",
    featured: "精選影評",
    setFeatured: "設為精選",
    unfeature: "取消精選",
    featuredSet: "已設為精選封面 ✨",
    featuredUnset: "已取消精選",

    // Mobile specific
    navHome: "首頁",
    navSearch: "搜尋",
    navStats: "統計",
    statistics: "觀影統計",
    totalReviews: "總觀影數",
    averageScore: "平均給分",
    topGenre: "最愛類型",
    statsDesc: "繼續觀看電影來建立您的個人電影檔案。",
    searchPlaceholder: "搜尋電影...",
    searchAiPlaceholder: "描述你想看的感覺...",
    searchingFor: "正在搜尋",
    closeToViewResults: "關閉此畫面查看結果",
    searchTips: "搜尋提示",
    standardSearch: "一般搜尋",
    standardDesc: "輸入電影名稱、導演或演員名字。",
    aiSearch: "AI 語意搜尋",
    aiDesc: '描述電影氛圍、劇情或概念。例如：「關於太空旅行和愛情的電影」',

    // New Features
    aiTldr: "AI 精華摘要",
    aiTldrLoading: "摘要生成中...",
    aiTldrSuccess: "摘要已生成！",
    aiTldrError: "摘要生成失敗。",
    aiTldrRetry: "重新生成摘要",
    watchingTimeline: "觀影時間線",
    genreBreakdown: "類型佔比",
    thisYear: "本年觀影",
    noRecords: "尚無觀影紀錄",
    allYears: "全部",
    watches: "觀影次數",
    genreScores: "類型評分",
    highest: "最高分",
    lowest: "最低分",

    // Reactions + Suggestion box
    reactLabel: "留個感想",
    reactError: "表情送出失敗，請再試一次。",
    suggestBox: "電影推薦箱",
    inbox: "推薦箱收件匣",
    navSuggest: "推薦箱",
    navInbox: "收件匣",
    sentLabel: "已送出",
    suggestTitle: "推薦一部電影給 Kaiser",
    suggestSubtitle: "看到我可能會喜歡的片？丟進推薦箱吧。",
    suggestTitleLabel: "片名",
    suggestTitlePlaceholder: "從上方挑選，或直接輸入片名",
    suggestNote: "為什麼推薦這部？（可選）",
    suggestNotePlaceholder: "寫一句話告訴我為什麼該看…",
    suggestName: "你的暱稱（可選）",
    suggestNamePlaceholder: "匿名",
    suggestSubmit: "送出推薦",
    suggestSuccess: "感謝！你的推薦已送出。",
    suggestError: "送出失敗，請再試一次。",
    suggestEmptyTitle: "請先挑選或輸入片名。",
    inboxEmpty: "目前還沒有推薦。",
    inboxAdopt: "採納",
    inboxWrite: "寫影評",
    inboxDismiss: "略過",
    inboxDelete: "刪除",
    tabNew: "待處理",
    tabAdopted: "已採納",
    tabDismissed: "已略過",

    // PWA install prompt
    installTitle: "將 CineRooms 加入主畫面",
    installDesc: "獲得全螢幕的沉浸式 App 體驗。",
    installBtn: "安裝 App",
    iosInstallHintPre: "點下方",
    iosInstallHintPost: "再選「加入主畫面」",
    openInSafari: "點右上角 ···，選「用 Safari 開啟」即可安裝。",
    installDismiss: "稍後再說",
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

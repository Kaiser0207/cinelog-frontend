import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useLanguage } from './LanguageContext';
import { applyPageMetadata } from '../utils/seo';

const ROUTES = {
  '/': {
    en: ['CineRooms — A Personal Movie Review Journal', 'A visual movie journal for ratings, long-form reviews and the stories films leave behind.'],
    zh: ['CineRooms — 個人影評與觀影日誌', '以視覺、評分與深度文字，收藏每部電影留下的感受。'],
  },
  '/stats': {
    en: ['Viewing Statistics | CineRooms', 'Explore CineRooms viewing history, scores and genre trends.'],
    zh: ['觀影統計 | CineRooms', '查看 CineRooms 的觀影歷史、評分與類型趨勢。'],
  },
  '/suggestions': {
    en: ['Recommend a Movie | CineRooms', 'Send Kaiser a movie or series recommendation.'],
    zh: ['電影推薦箱 | CineRooms', '推薦一部你喜歡的電影或影集給 Kaiser。'],
  },
};

export function usePageMetadata(metadata) {
  const { title, description, path, image, type, robots } = metadata;
  useEffect(() => {
    applyPageMetadata({ title, description, path, image, type, robots });
  }, [title, description, path, image, type, robots]);
}

export default function RouteMetadata() {
  const { pathname } = useLocation();
  const { lang } = useLanguage();

  useEffect(() => {
    const route = ROUTES[pathname];
    if (route) {
      const [title, description] = route[lang] || route.en;
      applyPageMetadata({ title, description, path: pathname });
      return;
    }
    if (pathname.startsWith('/review/')) {
      applyPageMetadata({
        title: lang === 'zh' ? '影評 | CineRooms' : 'Movie Review | CineRooms',
        description: lang === 'zh' ? '閱讀 CineRooms 的電影評分與深度影評。' : 'Read a CineRooms rating and in-depth movie review.',
        path: pathname,
        type: 'article',
      });
      return;
    }
    applyPageMetadata({
      title: lang === 'zh' ? '找不到頁面 | CineRooms' : 'Page Not Found | CineRooms',
      description: lang === 'zh' ? '這個 CineRooms 頁面不存在。' : 'This CineRooms page does not exist.',
      path: pathname,
      robots: 'noindex,nofollow',
    });
  }, [lang, pathname]);

  return null;
}

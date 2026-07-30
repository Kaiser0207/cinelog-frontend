# CineRooms Mobile Experience Restoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 恢復 `3bd8fb2` 已驗證的手機選單與書櫃／疊卡行為，並以單排篩選、單欄搜尋及較緊湊的 Hero 讓手機內容更早出現。

**Architecture:** 保留現有 `HomePage` 的資料狀態與 `ReviewFeed` 的請求流程，只把可獨立理解的手機篩選面板與搜尋列拆成元件。選單回復同步 GSAP 載入並加入直接顯示備援；首頁檢視偏好與篩選標籤使用小型純函式，以既有 `node:test` 驗證。

**Tech Stack:** React 19、React Router 8、Framer Motion 12、GSAP 3、Tailwind CSS 4、Vite 6、Node `node:test`。

## Global Constraints

- 行為基準固定為 Git commit `3bd8fb2`；不得整版回滾 `10fcbf3`。
- 手機首頁只提供 `shelf` 與 `deck`；桌面搜尋仍可沿用現有 `CompactGrid`。
- 手機驗證寬度為 360、390、430px；桌面回歸寬度為 768、1024、1440px。
- 手機主標題較目前縮小約 12%；標語到篩選摘要保留約 30px。
- 手機只有一排兩顆篩選摘要；桌面保留兩排完整膠囊。
- 手機搜尋結果為單欄；不新增 React 或瀏覽器測試框架。
- 點擊區域至少 44×44px，支援安全區、Escape、焦點循環與 `prefers-reduced-motion`。
- 管理員手機新增入口放進側邊選單；桌面浮動新增按鈕保留。
- 不改後端 API、資料模型、JWT 驗證或 Render 服務。
- 每個程式提交使用中文訊息；最終推送 `master` 並驗證 Vercel 正式部署。

---

### Task 1: 恢復首頁的書櫃／疊卡檢視偏好

**Files:**
- Create: `src/utils/homeViewMode.js`
- Create: `tests/homeViewMode.test.js`
- Modify: `src/pages/HomePage.jsx:36-43, 359-409`

**Interfaces:**
- Produces: `normalizeHomeViewMode(value: unknown): 'shelf' | 'deck'`
- Consumes: `localStorage.getItem('cinelog_view_mode')`

- [ ] **Step 1: 寫出會失敗的檢視模式測試**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHomeViewMode } from '../src/utils/homeViewMode.js';

test('home view keeps only shelf and deck preferences', () => {
  assert.equal(normalizeHomeViewMode('shelf'), 'shelf');
  assert.equal(normalizeHomeViewMode('deck'), 'deck');
});

test('legacy and unknown home views return to the shelf', () => {
  for (const value of ['compact', 'grid', 'list', '', null, undefined]) {
    assert.equal(normalizeHomeViewMode(value), 'shelf');
  }
});
```

- [ ] **Step 2: 執行測試並確認因模組不存在而失敗**

Run: `node --test tests/homeViewMode.test.js`
Expected: FAIL，錯誤包含 `ERR_MODULE_NOT_FOUND` 與 `homeViewMode.js`。

- [ ] **Step 3: 實作最小的模式正規化函式**

```js
export function normalizeHomeViewMode(value) {
  return value === 'deck' ? 'deck' : 'shelf';
}
```

- [ ] **Step 4: 讓 `HomePage` 使用正規化函式並移除網格按鈕**

在 `HomePage.jsx` 匯入 `normalizeHomeViewMode`，將初始化改為：

```js
const [viewMode, setViewMode] = useState(() =>
  normalizeHomeViewMode(localStorage.getItem('cinelog_view_mode'))
);
```

保留既有寫回 `cinelog_view_mode` 的 effect；刪除 `compact` 按鈕整段，只留下書櫃與疊卡按鈕及既有 ARIA 標記。這會讓曾儲存 `compact` 的裝置在首次載入後寫回 `shelf`。

- [ ] **Step 5: 執行單元測試與靜態檢查**

Run: `node --test tests/homeViewMode.test.js && npm run lint`
Expected: 2 tests PASS，ESLint 0 errors。

- [ ] **Step 6: 提交模式恢復**

```bash
git add src/utils/homeViewMode.js tests/homeViewMode.test.js src/pages/HomePage.jsx
git commit -m "恢復首頁書櫃與疊卡模式"
```

---

### Task 2: 恢復可靠的彩色側邊選單與管理員新增入口

**Files:**
- Modify: `src/components/StaggeredMenu.jsx:1-317`
- Modify: `src/pages/HomePage.jsx:60-69, 563-584, 608-612`
- Modify: `src/components/StaggeredMenu.css:72-90, 160-164`

**Interfaces:**
- Consumes: optional `onAddReview(): void` prop from `HomePage`
- Produces: admin-only `add` menu action; non-home routes navigate to `('/', { state: { openEditor: true } })`
- Preserves: `onHomeClick`, `onSearchClick`, `searchOpen`, focus trap, body scroll lock, route navigation

- [ ] **Step 1: 記錄目前可重現的失敗條件**

在目前手機版打開首頁並點擊漢堡：按鈕狀態變為 X，但 `aside#cinerooms-main-menu` 的 transform 仍可能是 `translate3d(-100%, 0, 0)`。此為本任務的失敗基準；修正後同一操作必須讓面板 transform 到可視位置。

- [ ] **Step 2: 恢復同步 GSAP 並加入直接顯示備援**

在 `StaggeredMenu.jsx`：

```js
import { gsap } from 'gsap';
```

刪除 `gsapRef`、`gsapPromiseRef` 與 `loadGsap()`。新增單一備援函式：

```js
const setVisibleWithoutAnimation = useCallback((visible) => {
  const panel = panelRef.current;
  if (!panel) return;
  const transform = visible
    ? 'translate3d(0, 0, 0)'
    : 'translate3d(-100%, 0, 0)';
  [panel, ...layerEls()].forEach((element) => {
    element.style.transform = transform;
  });
  panel.querySelectorAll('.sm-item-label').forEach((element) => {
    element.style.transform = visible ? 'translate(0, 0) rotate(0deg)' : '';
  });
  panel.querySelectorAll('.sm-item').forEach((element) => {
    element.style.setProperty('--sm-num-opacity', visible ? '1' : '0');
  });
}, []);
```

`useLayoutEffect` 使用舊版 `gsap.context()` 將面板停在 `xPercent: -100`，並在例外時呼叫 `setVisibleWithoutAnimation(false)`。`buildOpen()` 直接使用同步 `gsap`。`playOpen()` 與 `playClose()` 各以 `try/catch` 包住 timeline；例外時呼叫相應備援並清除 `busyRef`。Reduced Motion 分支直接顯示並將焦點移到第一個選項。

- [ ] **Step 3: 加入所有頁面都可用的管理員新增動作**

把元件簽名改為：

```js
export default function StaggeredMenu({
  onHomeClick,
  onSearchClick,
  onAddReview,
  searchOpen = false,
})
```

新增：

```js
const goAddReview = () => {
  if (isHome && onAddReview) onAddReview();
  else navigate('/', { state: { openEditor: true } });
};

if (isAdmin) {
  items.push({ key: 'add', label: t('addReview'), action: goAddReview });
}
```

`HomePage` 的 location-state effect 同時處理 `openSearch` 與 `openEditor`，處理後以 `navigate('.', { replace: true, state: null })` 清除狀態。首頁傳入 `onAddReview={() => setShowEditor(true)}`。

- [ ] **Step 4: 手機隱藏浮動新增按鈕，桌面保留**

將 FAB 改為語意化 `motion.button`，加入 `type="button"`、`aria-label={t('addReview')}` 與 `hidden md:block`；保留 `greenBtnRef`、hover、clip-path 與桌面位置。`StaggeredMenu.css` 只在需要時縮小五個選項的垂直間距，且不得改變 44px toggle、安全區或 z-index 1100／1150／1200。

- [ ] **Step 5: 驗證選單程式與正式 bundle**

Run: `npm run lint && npm run build`
Expected: 0 errors，Vite build 成功；輸出不再含獨立的延遲 GSAP chunk 是可接受結果。

手動檢查 390px：連續開關三次、Escape 關閉、Tab 不離開面板、選取首頁／搜尋後關閉；管理員看得到「新增影評」，一般訪客看不到。

- [ ] **Step 6: 提交選單修復**

```bash
git add src/components/StaggeredMenu.jsx src/components/StaggeredMenu.css src/pages/HomePage.jsx
git commit -m "恢復手機側邊選單與管理員入口"
```

---

### Task 3: 建立單排手機篩選與緊湊 Hero

**Files:**
- Create: `src/utils/homeFilters.js`
- Create: `tests/homeFilters.test.js`
- Create: `src/components/MobileFilterControls.jsx`
- Modify: `src/components/LanguageContext.jsx:15-42, 208-235`
- Modify: `src/pages/HomePage.jsx:161-178, 211-348`

**Interfaces:**
- Produces: `HOME_GENRE_OPTIONS`, `HOME_MEDIA_OPTIONS`
- Produces: `selectedFilterLabel(options, value, translate, short): string`
- `MobileFilterControls` props: `{ genre, media, disabled, onGenreChange(value), onMediaChange(value) }`
- Consumes: existing `useDialogA11y`, `useLanguage`, Framer Motion `AnimatePresence`

- [ ] **Step 1: 寫出會失敗的篩選標籤測試**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HOME_GENRE_OPTIONS,
  HOME_MEDIA_OPTIONS,
  selectedFilterLabel,
} from '../src/utils/homeFilters.js';

const translate = (key) => ({
  All: '全部類型',
  filterAllShort: '全部',
  Action: '動作',
  mediaMovie: '電影',
}[key] || key);

test('filter summaries use short all label and selected values', () => {
  assert.equal(selectedFilterLabel(HOME_GENRE_OPTIONS, '', translate, true), '全部');
  assert.equal(selectedFilterLabel(HOME_GENRE_OPTIONS, '動作', translate, true), '動作');
  assert.equal(selectedFilterLabel(HOME_MEDIA_OPTIONS, 'movie', translate, true), '電影');
});

test('unknown filter values fall back to the all option', () => {
  assert.equal(selectedFilterLabel(HOME_MEDIA_OPTIONS, 'invalid', translate, true), '全部');
});
```

- [ ] **Step 2: 執行測試並確認因模組不存在而失敗**

Run: `node --test tests/homeFilters.test.js`
Expected: FAIL with `ERR_MODULE_NOT_FOUND`。

- [ ] **Step 3: 實作共用篩選定義與標籤函式**

`HOME_GENRE_OPTIONS` 使用既有值 `''、動作、喜劇、劇情、恐怖、科幻、驚悚、愛情、動畫、懸疑` 與既有翻譯鍵；全部選項另設 `shortLabelKey: 'filterAllShort'`。`HOME_MEDIA_OPTIONS` 使用 `''、movie、tv、anime` 與 `mediaAll、mediaMovie、mediaSeries、mediaAnime`，全部選項同樣使用 `filterAllShort`。

```js
export function selectedFilterLabel(options, value, translate, short = false) {
  const option = options.find((entry) => entry.value === value) || options[0];
  const key = short && option.shortLabelKey
    ? option.shortLabelKey
    : option.labelKey;
  return translate(key);
}
```

- [ ] **Step 4: 建立可及的手機摘要與底部單選面板**

`MobileFilterControls.jsx`：

- 外層使用 `md:hidden grid grid-cols-2 gap-3 px-5 mb-7`，兩顆摘要按鈕高度至少 48px。
- 按鈕文案為 `${t('mediaFilterShort')} · ${selectedValue}` 與 `${t('genreFilterShort')} · ${selectedValue}`，加入 `aria-haspopup="dialog"`、`aria-expanded`、disabled 狀態與下拉圖示。
- 本地狀態只保存 `activeFilter: null | 'media' | 'genre'`；實際選值仍由 `HomePage` 控制。
- 開啟時渲染 `fixed inset-0 z-[900]` 背景與置底面板，面板 `role="dialog"`、`aria-modal="true"`、`pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]`。
- 使用 `useDialogA11y` 處理初始焦點、Escape、Tab 與焦點返回；effect 保存並恢復 `document.body.style.overflow`。
- 選項使用 `role="radio"`、`aria-checked`，點擊後先呼叫對應 change callback，再關閉；背景只在 `event.target === event.currentTarget` 時關閉。

- [ ] **Step 5: 接入翻譯、桌面篩選與手機 Hero**

在中英文翻譯新增：

```js
filterAllShort: 'All',          // zh: '全部'
mediaFilterShort: 'Media',      // zh: '影視'
genreFilterShort: 'Genre',      // zh: '類型'
mediaAll: 'All media',          // zh: '全部影視'
mediaMovie: 'Film',             // zh: '電影'
mediaSeries: 'Series',          // zh: '影集'
mediaAnime: 'Anime',            // zh: '動漫'
closeFilter: 'Close filter',    // zh: '關閉篩選'
```

`HomePage` 以共用 options 渲染桌面兩排，兩排容器改為 `hidden md:block`；在 Hero 後插入 `MobileFilterControls`。Hero 使用：

```jsx
<div className="relative pt-24 pb-8 md:pb-12 px-5 flex flex-col items-start md:items-center justify-center md:min-h-[40vh]">
  <motion.h1 className="text-[clamp(5.25rem,20vw,5.375rem)] md:text-[12rem] lg:text-[15rem] ...">
```

語言按鈕的 mobile top 改為 `top-[calc(1.5rem+env(safe-area-inset-top,0px))]`。手機不使用 `-mt-12`；桌面第一排保留 `md:-mt-12`。標語下方透過 Hero `pb-8` 提供 32px 間距。

- [ ] **Step 6: 執行單元測試、Lint 與建置**

Run: `node --test tests/homeFilters.test.js && npm run lint && npm run build`
Expected: 2 tests PASS，ESLint 0 errors，Vite build 成功。

手動檢查 360、390、430px：摘要維持單排；長英文不撐開；面板可選、背景與 Escape 可關；Home Indicator 不遮住最後一項；書脊比目前版本更早出現。

- [ ] **Step 7: 提交首屏與篩選優化**

```bash
git add src/utils/homeFilters.js tests/homeFilters.test.js src/components/MobileFilterControls.jsx src/components/LanguageContext.jsx src/pages/HomePage.jsx
git commit -m "壓縮手機首屏並整合篩選面板"
```

---

### Task 4: 將手機搜尋結果改為單欄列表

**Files:**
- Modify: `src/utils/reviewData.js`
- Modify: `tests/reviewData.test.js`
- Create: `src/components/MobileReviewList.jsx`
- Modify: `src/components/CompactGrid.jsx:1-37`
- Modify: `src/components/ReviewFeed.jsx:1-8, 202-208`
- Modify: `src/components/SearchOverlay.jsx:36-93`

**Interfaces:**
- Produces: `latestReviewWatchDate(review): string | undefined`
- Produces: `MobileReviewList({ reviews, featuredIds })`
- Adds `ReviewFeed` presentation mode: `viewMode="search-list"`
- Preserves: desktop search continues through `CompactGrid` when `searchQuery` is present and mode is not `search-list`

- [ ] **Step 1: 寫出最近觀看日期的失敗測試**

在 `tests/reviewData.test.js` 匯入 `latestReviewWatchDate` 並加入：

```js
test('latest watch date prefers the summary field then newest history date', () => {
  assert.equal(latestReviewWatchDate({
    last_watched_date: '2026-07-30',
    watch_dates: ['2026-07-31'],
  }), '2026-07-30');
  assert.equal(latestReviewWatchDate({
    watch_dates: '["2025-01-02", "2026-06-03"]',
  }), '2026-06-03');
  assert.equal(latestReviewWatchDate({ watch_dates: 'bad json' }), undefined);
});
```

- [ ] **Step 2: 執行測試並確認函式尚未匯出**

Run: `node --test tests/reviewData.test.js`
Expected: FAIL，錯誤指出 `latestReviewWatchDate` 沒有 export。

- [ ] **Step 3: 實作並重用日期解析**

在 `reviewData.js` 使用安全 JSON 解析，先回傳非空的 `last_watched_date`，否則將 `watch_dates` 轉成字串後遞減排序並取第一個。`CompactGrid` 改為匯入此函式，刪除元件內重複的 `watchDates()`。

- [ ] **Step 4: 建立手機單欄結果元件**

`MobileReviewList.jsx` 使用 `Link`、`TMDB_IMG_BASE`、`MEDIA_BADGES`、`mediaCategory`、`getReviewTotal`、`formatDate`、`latestReviewWatchDate` 與 `useLanguage`。每列：

- `grid grid-cols-[72px_minmax(0,1fr)] gap-3`，整列最小高度超過 96px。
- 左側 72×108px 海報；無海報時顯示 `t('notAvailable')`。
- 右側顯示最多兩行片名、影視 badge／年份、最近觀看日期。
- 分數存在時放右上，精選存在時顯示 `★` 標記。
- Link 保留 `to={`/review/${review.id}`}`、`state={{ review }}` 與可辨識的 `aria-label`。

- [ ] **Step 5: 在資料流中明確分流手機與桌面搜尋**

`ReviewFeed` 的顯示順序必須是：

```jsx
if (viewMode === 'search-list') {
  return <MobileReviewList reviews={items} featuredIds={featuredIds} />;
}
if (viewMode === 'compact' || searchQuery) {
  return <CompactGrid reviews={items} featuredIds={featuredIds} />;
}
if (viewMode === 'deck') {
  return <CardDeck reviews={items} featuredIds={featuredIds} />;
}
return <SpineShelf reviews={items} featuredIds={featuredIds} />;
```

`SearchOverlay` 傳入 `viewMode="search-list"`，移除已過時的 compact 註解；頂部與捲動內容補上 `env(safe-area-inset-top)`／`env(safe-area-inset-bottom)`，但保留現有 dialog、焦點與 body lock。

- [ ] **Step 6: 執行測試與完整檢查**

Run: `node --test tests/reviewData.test.js && npm run check`
Expected: 所有 Node tests PASS、ESLint 0 errors、Vite build 成功。

手動檢查 390px：一般與 AI 搜尋皆顯示單欄；長片名、無海報、無分數、無日期不破版；關閉後焦點回到搜尋入口。桌面搜尋仍是既有 grid。

- [ ] **Step 7: 提交單欄搜尋**

```bash
git add src/utils/reviewData.js tests/reviewData.test.js src/components/MobileReviewList.jsx src/components/CompactGrid.jsx src/components/ReviewFeed.jsx src/components/SearchOverlay.jsx
git commit -m "改進手機搜尋結果閱讀體驗"
```

---

### Task 5: 整體回歸、推送與 Vercel 正式部署

**Files:**
- Verify only: all files changed in Tasks 1–4
- Verify: `.github/workflows/ci.yml`, `.vercel/project.json`

**Interfaces:**
- Consumes: commits from Tasks 1–4 and existing `origin/master`
- Produces: green GitHub CI and successful Vercel production deployment for `cinerooms.vercel.app`

- [ ] **Step 1: 完整本機驗證**

Run: `npm run check`
Expected: tests PASS、ESLint 0 errors、Vite build 成功。若本機 Node 20 顯示 engine warning，記錄警告；不得把它誤報為 Node 22 驗證，GitHub CI／Vercel 的 Node 22 結果才是正式依據。

Run: `git diff --check && git status --short --branch`
Expected: 無 whitespace error，工作樹乾淨，`master` 僅領先 `origin/master` 本次提交。

- [ ] **Step 2: 逐尺寸回歸檢查**

依設計規格手動檢查 360、390、430px 的首頁／選單／篩選／搜尋，以及 768、1024、1440px 的桌面篩選／書櫃／疊卡。沒有本機瀏覽器自動化時，以正式部署後的實機檢查作為視覺驗收，不新增依賴來規避此限制。

- [ ] **Step 3: 推送前端 master**

```bash
git push origin master
```

Expected: GitHub 接受所有本次 commits，`origin/master` 指向本地 HEAD。

- [ ] **Step 4: 等待 GitHub CI**

```bash
HEAD_SHA="$(git rev-parse HEAD)"
RUN_ID="$(gh run list --repo Kaiser0207/cinelog-frontend --branch master --commit "$HEAD_SHA" --limit 1 --json databaseId --jq '.[0].databaseId')"
test -n "$RUN_ID"
gh run watch "$RUN_ID" --repo Kaiser0207/cinelog-frontend --exit-status
```

Expected: 對應 HEAD 的 CI conclusion 為 `success`，使用符合專案 engines 的 Node 22。

- [ ] **Step 5: 等待並確認 Vercel production deployment**

```bash
HEAD_SHA="$(git rev-parse HEAD)"
DEPLOYMENT_ID="$(gh api -X GET repos/Kaiser0207/cinelog-frontend/deployments -f sha="$HEAD_SHA" -f per_page=10 --jq '.[0].id')"
test -n "$DEPLOYMENT_ID"
gh api "repos/Kaiser0207/cinelog-frontend/deployments/$DEPLOYMENT_ID/statuses"
```

Expected: 對應 HEAD SHA 的 Vercel environment 為 `Production`，最新狀態為 `success`。

- [ ] **Step 6: 正式站冒煙檢查**

```bash
curl -fsS -D /tmp/cinerooms-headers.txt -o /tmp/cinerooms-index.html https://cinerooms.vercel.app/
```

Expected: HTTP 200；HTML 的靜態資產 hash 已更新，且回應沒有把舊 HTML 長時間快取。以手機實機確認漢堡面板可見、首頁無網格按鈕、雙摘要單排、書脊提前出現、搜尋為單欄、管理員新增入口在選單內。

- [ ] **Step 7: 回報部署結果**

列出最終 HEAD SHA、CI 結果、Vercel production 狀態、正式 URL、已驗證的手機項目；明確說明後端未變更、未重新部署。

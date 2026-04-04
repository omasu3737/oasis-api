// OASIS カラーパレット（ライト / ダーク 共通管理）

// ライトテーマ（参考画像ベース: 柔らかい青紫系）
export const lightTheme = {
  p: '#6a1fc8',    // primary（濃い紫）
  pl: '#8b45e0',   // primary light
  pp: '#f0e8ff',   // primary pale
  pm: '#c09ef8',   // primary muted
  t1: '#1a0a40',   // text primary
  t2: '#6b4a9e',   // text secondary
  tm: '#a498c0',   // text muted
  bg: '#fcfbff',   // background
  bd: '#e8dfff',   // border
  bs: '#f6f2ff',   // background subtle
  bm: '#d4c4f5',   // border muted
  card: '#ffffff',  // card background
  modalBg: '#ffffff',
  overlay: 'rgba(0,0,0,0.35)',
  inputBg: '#f8f5ff',
  statusBar: 'dark-content',
  white: '#ffffff',
  err: '#e05050',
  t3: '#c8c0d8',   // text faint (empty states, disabled icons)
};

// ダークテーマ（洗練された深い紫黒 - Instagram/Discord/Spotify参考）
export const darkTheme = {
  p: '#9b6dff',      // primary - brighter purple for dark mode visibility
  pl: '#b898ff',     // primary light
  pp: '#1e1a30',     // primary pale (card-like surfaces)
  pm: '#6a50a0',     // primary muted
  t1: '#ffffff',     // text primary - PURE WHITE for readability
  t2: '#b8b0cc',     // text secondary - light purple gray
  tm: '#7a7090',     // text muted
  bg: '#0f0d18',     // background - deep purple black
  bd: '#2a2645',     // border - subtle
  bs: '#1a1830',     // background subtle (cards)
  bm: '#353050',     // border muted
  card: '#1a1830',   // card background
  modalBg: '#1e1c35', // modal background
  overlay: 'rgba(0,0,0,0.65)',
  inputBg: '#1a1830',
  statusBar: 'light-content',
  white: '#ffffff',
  err: '#ff6b6b',
  t3: '#4a4565',   // text faint (empty states, disabled icons)
};

// エレメントカラー（ライト）
export const ELEMENT_COLORS = {
  Fire:  { bg: '#fff1ee', border: '#ffb3a0', text: '#c0392b', emoji: '🔥' },
  Water: { bg: '#eef4ff', border: '#a0c4ff', text: '#1a5fa8', emoji: '💧' },
  Wind:  { bg: '#eefff4', border: '#a0ffca', text: '#1a8a4a', emoji: '🌬' },
  Earth: { bg: '#fdf6ee', border: '#f0d0a0', text: '#8a5a1a', emoji: '🌍' },
};

// エレメントカラー（ダーク - 視認性向上）
export const ELEMENT_COLORS_DARK = {
  Fire:  { bg: '#2d1a18', border: '#a05040', text: '#ff9080', emoji: '🔥' },
  Water: { bg: '#141c30', border: '#4070b0', text: '#80b8ff', emoji: '💧' },
  Wind:  { bg: '#142c1c', border: '#409060', text: '#80e0a0', emoji: '🌬' },
  Earth: { bg: '#2c2418', border: '#a08050', text: '#e0b070', emoji: '🌍' },
};

// 後方互換: 既存コードがimport { C }で使えるように
export const C = lightTheme;

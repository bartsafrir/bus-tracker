// Israeli bus operator colors — matched to real brand logos
const OPERATOR_COLORS = {
  // ── Major operators ──
  'אגד':                    { bg: '#008D36', text: '#fff' },  // Egged — green (alef wing logo)
  'דן':                     { bg: '#00A0E3', text: '#fff' },  // Dan — light blue
  'מטרופולין':              { bg: '#F27C21', text: '#fff' },  // Metropoline — orange (bus livery)
  'קווים':                  { bg: '#1B3A6B', text: '#fff' },  // Kavim — dark navy blue
  'סופרבוס':                { bg: '#1D5FA0', text: '#fff' },  // Superbus — blue (rings logo)
  'נתיב אקספרס':            { bg: '#003D79', text: '#fff' },  // Nateev Express — dark blue
  'אלקטרה אפיקים':          { bg: '#6A2382', text: '#fff' },  // Electra Afikim — purple
  'רכבת ישראל':             { bg: '#003DA5', text: '#fff' },  // Israel Railways — blue

  // ── Regional / smaller ──
  'ש.א.מ':                  { bg: '#2E7D32', text: '#fff' },  // SHA.M (UNBS) — green (starburst logo)
  'דן בדרום':               { bg: '#00A0E3', text: '#fff' },  // Dan South — same as Dan
  'גלים':                   { bg: '#0077B6', text: '#fff' },  // Galim — blue
  'תנופה':                  { bg: '#3AAFA9', text: '#fff' },  // Tnufa — teal gradient (logo)
  'בית שמש אקספרס':         { bg: '#003D79', text: '#fff' },  // Beit Shemesh Express — same as Nateev Express
  'נסיעות ותיירות':          { bg: '#4A4A8A', text: '#fff' },  // Travel & Tourism — muted purple
  'מועצה אזורית גולן':      { bg: '#047857', text: '#fff' },  // Golan — green
  'אלקטרה אפיקים תחבורה':   { bg: '#6A2382', text: '#fff' },  // Electra Afikim Transport — purple
  'כרמלית':                 { bg: '#C62828', text: '#fff' },  // Carmelit — red
  'תבל':                    { bg: '#2196F3', text: '#fff' },  // Tevel — blue

  // ── Jerusalem operators ──
  'ירושלים':                 { bg: '#D4A017', text: '#fff' },  // Jerusalem union — gold
  'אקסטרה ירושלים':          { bg: '#1B5E20', text: '#fff' },  // Extra Jerusalem — dark green
  'דרך אגד עוטף ירושלים':    { bg: '#008D36', text: '#fff' },  // Derech Egged Jerusalem — Egged green
};

const DEFAULT_COLOR = { bg: '#475569', text: '#fff' }; // slate fallback

export function getOperatorColor(agencyName) {
  if (!agencyName) return DEFAULT_COLOR;
  // Exact match
  if (OPERATOR_COLORS[agencyName]) return OPERATOR_COLORS[agencyName];
  // Partial match — check both directions
  for (const [key, val] of Object.entries(OPERATOR_COLORS)) {
    if (agencyName.includes(key) || key.includes(agencyName)) return val;
  }
  return DEFAULT_COLOR;
}

// Israeli bus operator colors — harmonized palette
// Designed as a cohesive set: high contrast on white, distinct from each other
const OPERATOR_COLORS = {
  // ── Major operators ──
  'אגד':                    { bg: '#16A34A', text: '#fff' },  // Egged — green
  'דן':                     { bg: '#2563EB', text: '#fff' },  // Dan — blue
  'מטרופולין':              { bg: '#DC2626', text: '#fff' },  // Metropoline — red
  'קווים':                  { bg: '#EA580C', text: '#fff' },  // Kavim — orange
  'סופרבוס':                { bg: '#1D5FA0', text: '#fff' },  // Superbus — blue (brand)
  'נתיב אקספרס':            { bg: '#0891B2', text: '#fff' },  // Nateev Express — cyan
  'אלקטרה אפיקים':          { bg: '#7C3AED', text: '#fff' },  // Electra Afikim — violet
  'רכבת ישראל':             { bg: '#1D4ED8', text: '#fff' },  // Israel Railways — indigo

  // ── Regional / smaller ──
  'ש.א.מ':                  { bg: '#15803D', text: '#fff' },  // SHA.M — emerald
  'דן בדרום':               { bg: '#1E40AF', text: '#fff' },  // Dan South — darker blue
  'גלים':                   { bg: '#0369A1', text: '#fff' },  // Galim — sky blue
  'תנופה':                  { bg: '#BE185D', text: '#fff' },  // Tnufa — pink
  'בית שמש אקספרס':         { bg: '#B45309', text: '#fff' },  // Beit Shemesh — brown
  'נסיעות ותיירות':          { bg: '#6D28D9', text: '#fff' },  // Travel & Tourism — purple
  'מועצה אזורית גולן':      { bg: '#047857', text: '#fff' },  // Golan — dark green
  'אלקטרה אפיקים תחבורה':   { bg: '#7C3AED', text: '#fff' },  // Electra Afikim Transport — violet

  // ── Jerusalem operators ──
  'ירושלים':                 { bg: '#C2410C', text: '#fff' },  // Jerusalem — burnt orange
  'אקסטרה ירושלים':          { bg: '#B91C1C', text: '#fff' },  // Extra Jerusalem — dark red
  'דרך אגד עוטף ירושלים':    { bg: '#166534', text: '#fff' },  // Derech Egged Jerusalem — forest
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

// ملف مولّد تلقائيًا من design-tokens.js — لا تُعدّله يدويًا
export const colors = {
  "ink": "#121214",
  "ink2": "#1a1a1d",
  "ink3": "#232327",
  "amber": "#c1592e",
  "amberLight": "#e0824b",
  "paper": "#f3eae0",
  "paperDim": "#c9bfb4",
  "coral": "#ff5a36",
  "grey": "#6b625c",
  "greyLight": "#9c9289"
};
export const categoryColors = {
  "laugh": "#f4c430",
  "shock": "#7c5cff",
  "anger": "#c81e3a",
  "surprise": "#2cb6c4",
  "embarrass": "#f17fb2",
  "approve": "#4caf6d",
  "reject": "#6e8296",
  "sarcasm": "#d98e04",
  "hype": "#e8712e"
};
export const categories = [
  {
    "id": "laugh",
    "name": "ضحك",
    "color": "#f4c430"
  },
  {
    "id": "shock",
    "name": "صدمة",
    "color": "#7c5cff"
  },
  {
    "id": "anger",
    "name": "ضابح",
    "color": "#c81e3a"
  },
  {
    "id": "surprise",
    "name": "استغراب",
    "color": "#2cb6c4"
  },
  {
    "id": "embarrass",
    "name": "إحراج/صمت",
    "color": "#f17fb2"
  },
  {
    "id": "approve",
    "name": "موافقة",
    "color": "#4caf6d"
  },
  {
    "id": "reject",
    "name": "رفض",
    "color": "#6e8296"
  },
  {
    "id": "sarcasm",
    "name": "سخرية",
    "color": "#d98e04"
  },
  {
    "id": "hype",
    "name": "حماس",
    "color": "#e8712e"
  }
];
export const qusasaPath = "M10,0 L86,0 L92,6 L98,1 L104,7 L110,3 L120,14 L120,106 L106,120 L14,120 L0,106 L0,10 Z M46,38 L46,82 L82,60 Z";
export function qusasaSvg({ size = 24, fill = colors.amber } = {}) {
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" style="display:block"><path fill="' + fill + '" fill-rule="evenodd" d="' + qusasaPath + '"/></svg>';
}

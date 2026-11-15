// Predefined color palette for initials
const colorPalette = [
  '#0ea5e9',
  '#14b8a6',
  '#10b981',
  '#f59e0b',
  '#f43f5e',
  '#8b5cf6',
  '#f87171',
  '#06b6d4'
];

// Get a random color from the predefined palette
export const getRandomColor = () => {
  return colorPalette[Math.floor(Math.random() * colorPalette.length)];
};


export const getAvatarName = (name) => {
  if (!name) return "";

  return name.split(" ").map((item) => item[0]).join("").toUpperCase();
}

export const formatDate = (date) => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[date.getMonth()]} ${String(date.getDate()).padStart(
    2,
    "0"
  )}, ${date.getFullYear()}`;
};

export const formatDateAndTime = (date) => {
  const dateAndTime = new Date(date).toLocaleString("en-us", {
    month: "long",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata"
  })

  return dateAndTime;
}

// True when the logged-in user has this permission (permissions come from GET /api/user).
export const can = (user, permission) => !!user?.permissions?.includes(permission);

// UPI deep link (NPCI "upi://pay" format) that any UPI app can scan. Amount is in paise.
// Built by hand: URLSearchParams writes spaces as "+" and "@" as "%40", which some UPI apps show literally.
export const buildUpiUri = ({ vpa, payeeName, amountPaise, note }) => {
  const parts = [
    `pa=${vpa.trim()}`,
    `pn=${encodeURIComponent(payeeName || vpa)}`,
    `am=${(amountPaise / 100).toFixed(2)}`,
    "cu=INR",
  ];
  if (note) parts.push(`tn=${encodeURIComponent(note.slice(0, 50))}`);
  return `upi://pay?${parts.join("&")}`;
};

// Uploaded files live on the backend; anything else (full URLs, bundled assets) is used as is.
export const assetUrl = (path) => (path?.startsWith("/uploads/") ? `${import.meta.env.VITE_BACKEND_URL}${path}` : path);

export const ALLERGENS = ["gluten", "dairy", "nuts", "egg", "soy", "fish", "shellfish", "sesame"];

// crypto.randomUUID only exists on https/localhost; staff phones on the shop Wi-Fi use plain http.
export const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;

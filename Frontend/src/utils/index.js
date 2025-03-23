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
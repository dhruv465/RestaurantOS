// Predefined color palette for initials
const colorPalette = [
  '#FF6B6B', // Soft red
  '#4ECDC4', // Turquoise
  '#FF9F1C', // Orange
  '#6B5B95', // Purple
  '#F25F5C', // Coral
  '#2EC4B6', // Teal
  '#247BA0', // Blue
  '#F25F5C'  // Coral
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
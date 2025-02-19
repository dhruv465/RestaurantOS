// Predefined color palette for initials
const colorPalette = [
  '#FF6B6B', // Soft red
  '#4ECDC4', // Turquoise
  '#C7F464', // Lime green
  '#FF9F1C', // Orange
  '#6B5B95', // Purple
  '#F25F5C', // Coral
  '#2EC4B6', // Teal
  '#FFE066', // Yellow
  '#247BA0', // Blue
  '#F25F5C'  // Coral
];

// Get a random color from the predefined palette
export const getRandomColor = () => {
  return colorPalette[Math.floor(Math.random() * colorPalette.length)];
};



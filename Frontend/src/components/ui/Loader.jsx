import React from 'react'
import { useTheme } from '../../context/ThemeContext'

const Loader = () => {
  const { theme } = useTheme()

  return (
    <div className={`fullscreen-loader ${theme}`}>
      <div className="spinner"></div>
    </div>
  )
}

export default Loader

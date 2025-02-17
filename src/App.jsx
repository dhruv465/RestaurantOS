import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { Home, Auth, Orders } from './pages'
import Header from './components/ui/Header'
import { ThemeProvider } from './context/ThemeContext'
function App() {

  return (
    <ThemeProvider>
      <Router>
        <Header />
        <Routes>
          <Route path="/" element={<Home/>} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/orders" element={<Orders />} />
        </Routes>
      </Router>
    </ThemeProvider>
  )

}

export default App

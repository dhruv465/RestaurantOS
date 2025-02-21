import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { Home, Auth, Orders, Tables, Menu } from './pages'
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
          <Route path="/tables" element={<Tables/>} />
          <Route path="/menu" element={<Menu/>} />
        </Routes>
      </Router>
    </ThemeProvider>
  )

}

export default App

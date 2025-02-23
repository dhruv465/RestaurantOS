import { useSelector } from "react-redux";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
} from "react-router-dom";
import Header from "./components/ui/Header";
import { ThemeProvider } from "./context/ThemeContext";
import useLoadData from "./hooks/useLoadData";
import { Auth, Home, Menu, NotFound, Orders, Tables } from "./pages";

function Layout() {
  useLoadData();
  const location = useLocation();

  const hideHeaderRoutes = ["/auth"];
  const { isAuth } = useSelector((state) => state.auth);

  return (
    <>
      {hideHeaderRoutes.includes(location.pathname) ? null : <Header />}
      <Routes>
        <Route path="*" element={<NotFound />} />
        <Route
          path="/"
          element={
            <ProtectedRoutes>
              <Home />
            </ProtectedRoutes>
          }
        />
        <Route path="/auth" element={isAuth ? <Navigate to="/" /> : <Auth />} />
        <Route
          path="/orders"
          element={
            <ProtectedRoutes>
              <Orders />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/tables"
          element={
            <ProtectedRoutes>
              <Tables />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/menu"
          element={
            <ProtectedRoutes>
              <Menu />
            </ProtectedRoutes>
          }
        />
      </Routes>
    </>
  );
}

function ProtectedRoutes({ children }) {
  const { isAuth } = useSelector((state) => state.auth);
  if (!isAuth) {
    return <Navigate to="/auth" />;
  }

  return children;
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Layout />
      </Router>
    </ThemeProvider>
  );
}

export default App;

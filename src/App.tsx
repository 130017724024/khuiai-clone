import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { NotificationsProvider } from './lib/notifications';
import Home from './pages/Home';
import Characters from './pages/Characters';
import Chat from './pages/Chat';
import Auth from './pages/Auth';
import Wallet from './pages/Wallet';
import Gacha from './pages/Gacha';

function App() {
  return (
    <AuthProvider>
      <Router>
        <NotificationsProvider>
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/characters" element={<Characters />} />
          <Route path="/chat/:id" element={<Chat />} />
          <Route path="/chat" element={<Navigate to="/characters" replace />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/gacha" element={<Gacha />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/signup" element={<Auth mode="signup" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotificationsProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;

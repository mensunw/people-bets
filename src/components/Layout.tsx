import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src="/icon.png" alt="People Bets Logo" className="logo" />
          <h2>People Bets</h2>
        </div>

        <nav className="sidebar-nav">
          <Link to="/" className={isActive('/') ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">🏠</span>
            <span>Home</span>
          </Link>
          <Link
            to="/my-bets"
            className={isActive('/my-bets') ? 'nav-item active' : 'nav-item'}
          >
            <span className="nav-icon">🎲</span>
            <span>My Bets</span>
          </Link>
          <Link to="/groups" className={isActive('/groups') ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">👥</span>
            <span>Groups</span>
          </Link>
          <Link
            to="/leaderboard"
            className={isActive('/leaderboard') ? 'nav-item active' : 'nav-item'}
          >
            <span className="nav-icon">🏆</span>
            <span>Leaderboard</span>
          </Link>
          <Link to="/profile" className={isActive('/profile') ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">👤</span>
            <span>Profile</span>
          </Link>
        </nav>
      </aside>

      <div className="main-content">
        <header className="header">
          <div className="header-left">
            <h1 className="page-title">
              {location.pathname === '/' && 'Dashboard'}
              {location.pathname === '/my-bets' && 'My Bets'}
              {location.pathname === '/groups' && 'Groups'}
              {location.pathname === '/leaderboard' && 'Leaderboard'}
              {location.pathname === '/profile' && 'Profile'}
            </h1>
          </div>

          <div className="header-right">
            <div className="currency-display">
              <span className="currency-icon">💰</span>
              <span className="currency-amount">
                {user?.profile?.currency_balance?.toLocaleString() || 0}
              </span>
            </div>

            <div className="user-menu">
              <div className="user-info">
                <span className="username">{user?.profile?.username || user?.email}</span>
                <span className="user-email">{user?.email}</span>
              </div>
              <button onClick={handleSignOut} className="btn-logout">
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}

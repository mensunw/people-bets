import { Layout } from '../components/Layout';
import '../styles/pages.css';

export function Home() {
  return (
    <Layout>
      <div className="page-container">
        <div className="welcome-section">
          <h2>Welcome to People Bets</h2>
          <p>Place bets on Over or Under predictions and compete with your friends!</p>
        </div>

        <div className="quick-stats">
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <div className="stat-value">0</div>
              <div className="stat-label">Active Bets</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-value">0</div>
              <div className="stat-label">Groups</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-content">
              <div className="stat-value">0</div>
              <div className="stat-label">Wins</div>
            </div>
          </div>
        </div>

        <div className="section">
          <h3>Recent Bets</h3>
          <div className="empty-state">
            <p>No bets available yet. Check back soon!</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

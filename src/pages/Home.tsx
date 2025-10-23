import { useState } from 'react';
import { Layout } from '../components/Layout';
import { DailyClaim } from '../components/DailyClaim';
import { CreateBetModal } from '../components/CreateBetModal';
import '../styles/pages.css';

export function Home() {
  const [isCreateBetModalOpen, setIsCreateBetModalOpen] = useState(false);

  return (
    <Layout>
      <div className="page-container">
        <DailyClaim />

        <div className="welcome-section">
          <div className="welcome-content">
            <div>
              <h2>Welcome to People Bets</h2>
              <p>Place bets on Over or Under predictions and compete with your friends!</p>
            </div>
            <button className="btn-primary" onClick={() => setIsCreateBetModalOpen(true)}>
              Create Bet
            </button>
          </div>
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

        <CreateBetModal
          isOpen={isCreateBetModalOpen}
          onClose={() => setIsCreateBetModalOpen(false)}
        />
      </div>
    </Layout>
  );
}

import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import '../styles/pages.css';

export function Profile() {
  const { user } = useAuth();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Layout>
      <div className="page-container">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">{user?.profile?.username?.charAt(0).toUpperCase()}</div>
            <div className="profile-info">
              <h2>{user?.profile?.username}</h2>
              <p className="profile-email">{user?.email}</p>
              <p className="profile-joined">
                Member since {user?.profile?.created_at && formatDate(user.profile.created_at)}
              </p>
            </div>
          </div>

          <div className="profile-stats">
            <div className="profile-stat">
              <div className="profile-stat-value">
                {user?.profile?.currency_balance?.toLocaleString() || 0}
              </div>
              <div className="profile-stat-label">Currency Balance</div>
            </div>

            <div className="profile-stat">
              <div className="profile-stat-value">0</div>
              <div className="profile-stat-label">Total Bets</div>
            </div>

            <div className="profile-stat">
              <div className="profile-stat-value">0</div>
              <div className="profile-stat-label">Wins</div>
            </div>

            <div className="profile-stat">
              <div className="profile-stat-value">0%</div>
              <div className="profile-stat-label">Win Rate</div>
            </div>
          </div>
        </div>

        <div className="section">
          <h3>Betting History</h3>
          <div className="empty-state">
            <p>No betting history yet</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

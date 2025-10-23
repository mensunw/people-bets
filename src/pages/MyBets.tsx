import { Layout } from '../components/Layout';
import '../styles/pages.css';

export function MyBets() {
  return (
    <Layout>
      <div className="page-container">
        <div className="tabs">
          <button className="tab active">Active Bets</button>
          <button className="tab">Created Bets</button>
          <button className="tab">Past Bets</button>
        </div>

        <div className="section">
          <div className="empty-state">
            <div className="empty-icon">🎲</div>
            <h3>No Active Bets</h3>
            <p>You haven't placed any bets yet. Start betting to see them here!</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

import { Layout } from '../components/Layout';
import '../styles/pages.css';

export function Groups() {
  return (
    <Layout>
      <div className="page-container">
        <div className="page-header">
          <h2>My Groups</h2>
          <button className="btn-primary">Create Group</button>
        </div>

        <div className="section">
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>No Groups Yet</h3>
            <p>Create or join a group to start betting with your friends!</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

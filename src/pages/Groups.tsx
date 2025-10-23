import { useState } from 'react';
import { Layout } from '../components/Layout';
import { CreateGroupModal } from '../components/CreateGroupModal';
import { GroupCard } from '../components/GroupCard';
import { useGroups } from '../hooks/useGroups';
import '../styles/pages.css';
import '../styles/groups.css';

export function Groups() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { groups, loading, refetch } = useGroups();

  const filteredGroups = groups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const myGroups = filteredGroups.filter((g) => g.is_member);
  const availableGroups = filteredGroups.filter((g) => !g.is_member && !g.is_private);

  return (
    <Layout>
      <div className="page-container">
        <div className="page-header">
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            Create Group
          </button>
        </div>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner">Loading groups...</div>
          </div>
        ) : (
          <>
            <div className="groups-section">
              <h3>My Groups ({myGroups.length})</h3>
              {myGroups.length > 0 ? (
                <div className="groups-grid">
                  {myGroups.map((group) => (
                    <GroupCard key={group.id} group={group} onUpdate={refetch} />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">👥</div>
                  <p>You haven't joined any groups yet</p>
                </div>
              )}
            </div>

            {availableGroups.length > 0 && (
              <div className="groups-section">
                <h3>Available Public Groups ({availableGroups.length})</h3>
                <div className="groups-grid">
                  {availableGroups.map((group) => (
                    <GroupCard key={group.id} group={group} onUpdate={refetch} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <CreateGroupModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={refetch}
        />
      </div>
    </Layout>
  );
}

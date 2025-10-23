import { useState, useMemo } from 'react';
import { BetCard } from './BetCard';
import { useBets } from '../hooks/useBets';
import { useGroups } from '../hooks/useGroups';
import '../styles/bets.css';

type StatusFilter = 'all' | 'open' | 'closed' | 'resolved';
type SortOption = 'newest' | 'ending_soon' | 'popular';

export function BetsFeed() {
  const { bets, loading } = useBets();
  const { groups } = useGroups();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const filteredAndSortedBets = useMemo(() => {
    let filtered = [...bets];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((bet) => {
        if (statusFilter === 'open') {
          return bet.status === 'open' && new Date(bet.betting_window_end) > new Date();
        }
        return bet.status === statusFilter;
      });
    }

    // Group filter
    if (groupFilter !== 'all') {
      filtered = filtered.filter((bet) => bet.group_id === groupFilter);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'ending_soon':
          return (
            new Date(a.betting_window_end).getTime() - new Date(b.betting_window_end).getTime()
          );
        case 'popular':
          return b.participants_count - a.participants_count;
        default:
          return 0;
      }
    });

    return filtered;
  }, [bets, statusFilter, groupFilter, sortBy]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading bets...</div>
      </div>
    );
  }

  return (
    <div className="bets-feed">
      <div className="feed-filters">
        <div className="filter-group">
          <label>Status</label>
          <div className="filter-buttons">
            <button
              className={statusFilter === 'all' ? 'active' : ''}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            <button
              className={statusFilter === 'open' ? 'active' : ''}
              onClick={() => setStatusFilter('open')}
            >
              Active
            </button>
            <button
              className={statusFilter === 'closed' ? 'active' : ''}
              onClick={() => setStatusFilter('closed')}
            >
              Closed
            </button>
            <button
              className={statusFilter === 'resolved' ? 'active' : ''}
              onClick={() => setStatusFilter('resolved')}
            >
              Resolved
            </button>
          </div>
        </div>

        <div className="filter-group">
          <label>Group</label>
          <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
            <option value="all">All Groups</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Sort By</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}>
            <option value="newest">Newest</option>
            <option value="ending_soon">Ending Soon</option>
            <option value="popular">Most Popular</option>
          </select>
        </div>
      </div>

      {filteredAndSortedBets.length > 0 ? (
        <div className="bets-grid">
          {filteredAndSortedBets.map((bet) => (
            <BetCard key={bet.id} bet={bet} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🎲</div>
          <h3>No Bets Found</h3>
          <p>Try adjusting your filters or create a new bet!</p>
        </div>
      )}
    </div>
  );
}

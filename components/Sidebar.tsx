'use client';
import type { GroupInfo } from '@/app/page';

interface SidebarProps {
  groups: GroupInfo[];
  selected: string;
  open: boolean;
  onSelect: (group: string) => void;
  onClose: () => void;
}

export default function Sidebar({ groups, selected, open, onSelect, onClose }: SidebarProps) {
  const totalAll = groups.reduce((s, g) => s + g.count, 0);

  return (
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="sidebar-header">
        <span>Categories</span>
        <button className="sidebar-close" onClick={onClose}>✕</button>
      </div>

      <div className="sidebar-scroll">
        <button
          className={`group-item ${selected === 'All' ? 'active' : ''}`}
          onClick={() => onSelect('All')}
        >
          <span className="group-emoji">📺</span>
          <span className="group-label">All Channels</span>
          <span className="group-badge">{totalAll.toLocaleString()}</span>
        </button>

        {groups.map(g => (
          <button
            key={g.name}
            className={`group-item ${selected === g.name ? 'active' : ''}`}
            onClick={() => onSelect(g.name)}
          >
            <span className="group-emoji">{g.emoji}</span>
            <span className="group-label">{g.name}</span>
            <span className="group-badge">{g.count.toLocaleString()}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

import { useProgressStore } from '../state/progress';

export function SyncStatusIndicator() {
  const syncStatus = useProgressStore((s) => s.syncStatus);

  if (syncStatus === 'idle') return null;

  const config = {
    syncing: { label: '저장 중...', color: 'var(--brand-1)', icon: '🔄', anim: 'spin' },
    synced: { label: '저장됨', color: 'var(--ok-ink)', icon: '✅', anim: 'none' },
    error: { label: '저장 실패', color: 'var(--danger-ink)', icon: '⚠️', anim: 'none' }
  }[syncStatus];

  return (
    <div 
      className="sync-status-indicator" 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px', 
        fontSize: '0.78rem',
        color: config.color,
        padding: '4px 8px',
        background: 'color-mix(in srgb, currentColor 10%, transparent)',
        borderRadius: '8px',
        transition: 'all 0.3s ease'
      }}
      title={config.label}
    >
      <span style={{ 
        display: 'inline-block',
        animation: config.anim === 'spin' ? 'spin 1.5s linear infinite' : 'none' 
      }}>
        {config.icon}
      </span>
      <span className="sync-label">{config.label}</span>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 600px) {
          .sync-label { display: none; }
        }
      `}</style>
    </div>
  );
}

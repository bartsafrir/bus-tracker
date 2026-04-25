import { CloseIcon, SunIcon, MoonIcon } from './Icons';

interface Props {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onClose: () => void;
}

export default function SettingsOverlay({ theme, onToggleTheme, onClose }: Props) {
  return (
    <div className="settings-overlay">
      <div className="settings-header">
        <span className="settings-brand">KAV</span>
        <button className="settings-close" onClick={onClose}><CloseIcon size={16} /></button>
      </div>

      <div className="settings-section">
        <div className="settings-label">מראה</div>
        <div className="settings-theme-row">
          <button
            className={`settings-theme-btn ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => { if (theme !== 'dark') onToggleTheme(); }}
          >
            <MoonIcon size={18} color="currentColor" />
            <span>כהה</span>
          </button>
          <button
            className={`settings-theme-btn ${theme === 'light' ? 'active' : ''}`}
            onClick={() => { if (theme !== 'light') onToggleTheme(); }}
          >
            <SunIcon size={18} color="currentColor" />
            <span>בהיר</span>
          </button>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-label">אודות</div>
        <div className="settings-about">
          <p>מעקב אוטובוסים בזמן אמת בישראל</p>
          <p className="settings-credit">נבנה על ידי <strong>בר צפריר</strong></p>
          <p className="settings-sub">מידע מבוסס על נתוני GTFS ו-SIRI ממשרד התחבורה</p>
        </div>
      </div>
    </div>
  );
}

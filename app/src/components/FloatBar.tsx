import { SearchIcon, BackIcon, SettingsIcon } from './Icons';

interface HomeBarProps {
  mode: 'home';
  onSearch: () => void;
  onSettings: () => void;
  onLocate: () => void;
}

interface TrackingBarProps {
  mode: 'tracking';
  lineName: string;
  directionText: string;
  operatorColor: string;
  onBack: () => void;
  onSettings: () => void;
}

type Props = HomeBarProps | TrackingBarProps;

export default function FloatBar(props: Props) {
  if (props.mode === 'tracking') {
    return (
      <div className="float-bar compact">
        <div className="float-brand-row">
          <span className="float-brand small">KAV</span>
        </div>
        <div className="float-controls">
          <button className="float-btn" onClick={props.onBack}><BackIcon color="var(--text1)" /></button>
          <div className="float-pill">
            <span className="float-badge" style={{ background: props.operatorColor }}>{props.lineName}</span>
            <span className="float-pill-text" style={{ fontSize: 13 }}>{props.directionText}</span>
          </div>
          <button className="float-btn" onClick={props.onSettings}>
            <SettingsIcon size={18} color="var(--text2)" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="float-bar">
      <div className="float-brand-row">
        <span className="float-brand">KAV</span>
      </div>
      <div className="float-controls">
        <div className="float-pill" onClick={props.onSearch}>
          <SearchIcon size={16} color="var(--search-icon)" />
          <span className="float-pill-text float-pill-placeholder">חפש קו...</span>
        </div>
        <button className="float-btn" onClick={props.onSettings}>
          <SettingsIcon size={18} color="var(--text2)" />
        </button>
      </div>
    </div>
  );
}

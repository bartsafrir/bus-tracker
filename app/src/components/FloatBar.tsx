import React from 'react';
import { SearchIcon, SunIcon, MoonIcon, BackIcon, LocationIcon } from './Icons';

interface HomeBarProps {
  mode: 'home';
  theme: 'dark' | 'light';
  onSearch: () => void;
  onToggleTheme: () => void;
  onLocate: () => void;
}

interface TrackingBarProps {
  mode: 'tracking';
  theme: 'dark' | 'light';
  lineName: string;
  directionText: string;
  operatorColor: string;
  onBack: () => void;
  onToggleTheme: () => void;
}

type Props = HomeBarProps | TrackingBarProps;

export default function FloatBar(props: Props) {
  if (props.mode === 'tracking') {
    return (
      <div className="float-bar">
        <button className="float-btn" onClick={props.onBack}><BackIcon color="var(--text1)" /></button>
        <div className="float-pill">
          <span className="float-badge" style={{ background: props.operatorColor }}>{props.lineName}</span>
          <span className="float-pill-text" style={{ fontSize: 13 }}>{props.directionText}</span>
        </div>
        <button className="float-btn" onClick={props.onToggleTheme}>
          {props.theme === 'dark' ? <SunIcon color="var(--text2)" /> : <MoonIcon color="var(--text2)" />}
        </button>
      </div>
    );
  }

  return (
    <div className="float-bar">
      <div className="float-pill" onClick={props.onSearch}>
        <SearchIcon size={16} color="var(--search-icon)" />
        <span className="float-pill-text float-pill-placeholder">חפש קו...</span>
      </div>
      <button className="float-btn" onClick={props.onToggleTheme}>
        {props.theme === 'dark' ? <SunIcon color="var(--text2)" /> : <MoonIcon color="var(--text2)" />}
      </button>
    </div>
  );
}

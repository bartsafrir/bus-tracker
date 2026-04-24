import React from 'react';
import { SwapIcon } from './Icons';
import type { Sibling } from '../types';

interface Props {
  from: string;
  to: string;
  siblings: Sibling[] | null;
  currentLineRef: number;
  showPicker: boolean;
  onTogglePicker: () => void;
  onSwap: () => void;
  onPick: (sibling: Sibling) => void;
  fmtDir: (from: string, to: string) => string;
}

export default function DirectionPicker({ from, to, siblings, currentLineRef, showPicker, onTogglePicker, onSwap, onPick, fmtDir }: Props) {
  const hasSiblings = siblings && siblings.length > 1;

  return (
    <>
      {from && (
        <div className="dir-bar">
          <div className="dir-bar-text" onClick={() => hasSiblings && onTogglePicker()}>
            {fmtDir(from, to)}
            {hasSiblings && <span className="dir-bar-more"> ▾</span>}
          </div>
          {hasSiblings && (
            <button className="dir-swap-btn" onClick={onSwap}>
              <SwapIcon size={16} color="var(--text1)" />
            </button>
          )}
        </div>
      )}
      {showPicker && siblings && (
        <div className="dir-picker">
          {siblings.map(s => (
            <div key={s.lineRef}
              className={`dir-picker-item ${s.lineRef === currentLineRef ? 'active' : ''}`}
              onClick={() => onPick(s)}>
              <span className="dir-picker-label">{fmtDir(s.from, s.to)}</span>
              {s.lineRef === currentLineRef && <span className="dir-picker-check">✓</span>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

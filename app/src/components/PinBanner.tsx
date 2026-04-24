import React from 'react';

interface Props {
  locError: string | null;
  onCancel: () => void;
}

export default function PinBanner({ locError, onCancel }: Props) {
  return (
    <div className="pin-banner">
      <div>
        <div>בחר מיקום על המפה</div>
        {locError && <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>{locError}</div>}
      </div>
      <button onClick={onCancel}>ביטול</button>
    </div>
  );
}

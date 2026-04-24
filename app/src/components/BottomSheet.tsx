export default function BottomSheet({ snap, onSnapChange, children }) {
  const handleClick = () => {
    if (snap === 'peek') onSnapChange('half');
    else if (snap === 'half') onSnapChange('full');
  };

  return (
    <div className={`bottom-sheet ${snap}`}>
      <div className="sheet-handle-area" onClick={handleClick}>
        <div className="sheet-handle" />
      </div>
      <div className="sheet-content">
        {children}
      </div>
    </div>
  );
}

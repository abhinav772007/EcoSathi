import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Filter } from 'lucide-react';

export function FilterMenu({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    function handleClick(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="filter-menu" ref={rootRef}>
      <button type="button" className="select-button" onClick={() => setOpen((current) => !current)}>
        <Filter size={14} /> {value} <ChevronDown size={14} />
      </button>
      {open && (
        <div className="filter-dropdown">
          {options.map((option) => (
            <button
              type="button"
              key={option}
              className={option === value ? 'active' : ''}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

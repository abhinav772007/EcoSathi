import { Check, X } from 'lucide-react';

export function Toast({ title, detail, onClose }) {
  return (
    <div className="toast">
      <div className="toast-check">
        <Check size={16} />
      </div>
      <div>
        <b>{title}</b>
        <span>{detail}</span>
      </div>
      <button type="button" onClick={onClose} aria-label="Dismiss notification">
        <X size={16} />
      </button>
    </div>
  );
}

import { useEffect } from 'react';
import { X } from 'lucide-react';

// Na mobitelu izlazi odozdo (bottom sheet), na računalu je u sredini.
export default function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className={`flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-5">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-full p-2 text-soft hover:bg-mist" aria-label="Zatvori"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto px-5 pb-6 pt-2">{children}</div>
      </div>
    </div>
  );
}

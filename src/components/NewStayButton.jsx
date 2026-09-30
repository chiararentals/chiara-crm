import { useState } from 'react';
import { Plus } from 'lucide-react';
import StayForm from './StayForm';

export default function NewStayButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={18} /> Novi boravak</button>
      {open && <StayForm onClose={() => setOpen(false)} />}
    </>
  );
}

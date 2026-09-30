import { useMemo, useState } from 'react';
import { MessageCircle, Mail } from 'lucide-react';
import Modal from './Modal';
import { useMe } from '../lib/me';
import { fillTemplate, whatsappUrl, mailtoUrl } from '../lib/messages';
import { TEMPLATE_KINDS, LANGUAGES } from '../seed/templates';

// channel: 'whatsapp' | 'email'
export default function MessageDialog({ stay, unit, templates, channel, onClose }) {
  const [me] = useMe();
  const [kind, setKind] = useState('id_request');
  const [lang, setLang] = useState(stay.language || 'hr');

  const tpl = templates.find((t) => t.kind === kind && t.language === lang);
  const subject = useMemo(() => (tpl ? fillTemplate(tpl.subject, stay, unit, me) : ''), [tpl, stay, unit, me]);
  const [bodyEdit, setBodyEdit] = useState(null); // ručna izmjena prije slanja
  const body = bodyEdit ?? (tpl ? fillTemplate(tpl.body, stay, unit, me) : '');

  const missing = channel === 'whatsapp' ? !stay.phone : !stay.email;
  const href = channel === 'whatsapp' ? whatsappUrl(stay.phone, body) : mailtoUrl(stay.email, subject, body);

  return (
    <Modal title={channel === 'whatsapp' ? 'WhatsApp poruka' : 'Email poruka'} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Poruka</label>
            <select className="field" value={kind} onChange={(e) => { setKind(e.target.value); setBodyEdit(null); }}>
              {Object.entries(TEMPLATE_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Jezik</label>
            <select className="field" value={lang} onChange={(e) => { setLang(e.target.value); setBodyEdit(null); }}>
              {Object.entries(LANGUAGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        {channel === 'email' && <div className="text-sm"><span className="font-semibold">Naslov:</span> {subject}</div>}
        <div>
          <label className="label">Tekst (možeš ga urediti prije slanja)</label>
          <textarea className="field min-h-[220px] text-sm" value={body} onChange={(e) => setBodyEdit(e.target.value)} />
        </div>
        {missing && (
          <p className="rounded-xl bg-gold/20 p-3 text-sm">
            Gost nema upisan {channel === 'whatsapp' ? 'broj telefona' : 'email'}. Dodaj ga u uređivanju boravka.
          </p>
        )}
        <a
          href={missing ? undefined : href}
          target="_blank" rel="noreferrer"
          className={`btn-primary w-full ${missing ? 'pointer-events-none opacity-50' : ''}`}
        >
          {channel === 'whatsapp' ? <MessageCircle size={18} /> : <Mail size={18} />}
          {channel === 'whatsapp' ? 'Otvori WhatsApp' : 'Otvori email'}
        </a>
      </div>
    </Modal>
  );
}

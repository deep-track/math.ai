import React, { useEffect, useState } from 'react';

const KEY = 'guest_name';

const getGuestName = () => localStorage.getItem(KEY) || '';
const setGuestName = (name: string) => {
  localStorage.setItem(KEY, name);
  window.dispatchEvent(new CustomEvent('guestNameUpdated', { detail: { name } }));
};

const GuestNamePrompt: React.FC<{ onNameSet?: (name: string) => void }> = ({ onNameSet }) => {
  const [name, setName] = useState<string>(getGuestName());
  const [editing, setEditing] = useState(!name);

  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent;
      setName(ev.detail.name || '');
    };
    window.addEventListener('guestNameUpdated', handler as EventListener);
    return () => window.removeEventListener('guestNameUpdated', handler as EventListener);
  }, []);

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setGuestName(trimmed);
    setEditing(false);
    onNameSet?.(trimmed);
  };

  if (!editing) {
    return (
      <div className="text-sm text-gray-700">
        Hello, <strong>{name}</strong>
        <button className="ml-3 text-xs text-green-600 underline" onClick={() => setEditing(true)}>Change</button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        className="px-3 py-2 rounded-md border border-gray-300"
        placeholder="Enter your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button className="px-3 py-2 rounded-md bg-green-500 text-white" onClick={save}>Save</button>
    </div>
  );
};

export default GuestNamePrompt;
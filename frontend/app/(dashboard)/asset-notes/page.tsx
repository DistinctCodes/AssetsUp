'use client';

import { useState, useRef } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

const USERS = ['alice.m', 'bob.k', 'carol.s', 'dave.t', 'emma.w'];

interface Note { id: string; author: string; text: string; timestamp: string }

const MOCK_NOTES: Note[] = [
  { id:'1', author:'Alice M.', text:'Sent for repair. @bob.k please follow up with vendor.', timestamp:'2024-01-20T10:00:00Z' },
  { id:'2', author:'Bob K.', text:'Will check @carol.s for parts availability.', timestamp:'2024-01-20T10:30:00Z' },
];

export default function AssetNotesPage() {
  const [notes, setNotes] = useState<Note[]>(MOCK_NOTES);
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [mentionStart, setMentionStart] = useState(-1);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (val: string) => {
    setText(val);
    const atIdx = val.lastIndexOf('@');
    if (atIdx >= 0 && atIdx === val.length - 1 - (val.slice(atIdx + 1).length) + atIdx) {
      const fragment = val.slice(atIdx + 1);
      const matches = USERS.filter(u => u.startsWith(fragment));
      setSuggestions(matches);
      setMentionStart(atIdx);
    } else if (val.slice(val.lastIndexOf('@') + 1).includes(' ')) {
      setSuggestions([]);
    }
  };

  const insertMention = (user: string) => {
    const newText = text.slice(0, mentionStart) + @ ;
    setText(newText);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const addNote = () => {
    if (!text.trim()) return;
    setNotes(prev => [...prev, { id: Date.now().toString(), author:'You', text, timestamp: new Date().toISOString() }]);
    setText('');
  };

  const renderText = (t: string) => t.replace(/@(\w+\.\w+)/g, '<span class="text-blue-600 font-medium">@</span>');

  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">Asset Notes</h1><p className="text-sm text-gray-500 mt-1">@mention support with user autocomplete</p></div>
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 mb-4">
        {notes.map(n => (
          <div key={n.id} className="border-b border-gray-100 pb-3 last:border-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-900">{n.author}</span>
              <span className="text-xs text-gray-400">{new Date(n.timestamp).toLocaleString()}</span>
            </div>
            <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: renderText(n.text) }} />
          </div>
        ))}
      </div>
      <div className="relative">
        <textarea ref={inputRef} value={text} onChange={e => handleChange(e.target.value)} placeholder="Add a note... type @ to mention a user" rows={3}
          className="w-full text-sm border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
        {suggestions.length > 0 && (
          <div className="absolute z-10 bg-white border border-gray-200 rounded-lg shadow-sm mt-1 w-48">
            {suggestions.map(u => <button key={u} onClick={() => insertMention(u)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">@{u}</button>)}
          </div>
        )}
        <div className="mt-2 flex justify-end"><Button onClick={addNote}><Send size={14} className="mr-1.5"/>Post Note</Button></div>
      </div>
    </div>
  );
}
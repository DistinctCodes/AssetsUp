'use client';
import React, { useState } from 'react';
import { AssetNote } from '@/lib/query/types/asset';
import { Skeleton } from '@/components/ui/Skeleton';
import { MessageSquare, Plus } from 'lucide-react';
import Button from '@/components/ui/Button';

interface NotesListProps {
  notes: AssetNote[];
  onAddNote: (content: string) => void;
  isLoading?: boolean;
  isAdding?: boolean;
}

export function NotesList({
  notes,
  onAddNote,
  isLoading,
  isAdding,
}: NotesListProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newNote, setNewNote] = useState('');

  const handleSubmit = () => {
    if (newNote.trim()) {
      onAddNote(newNote);
      setNewNote('');
      setIsFormOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Notes</h3>
        <Button size="sm" onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Note
        </Button>
      </div>

      {isFormOpen && (
        <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Enter your note..."
            className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-3">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setIsFormOpen(false);
                setNewNote('');
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!newNote.trim() || isAdding}
            >
              {isAdding ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </div>
      )}

      {notes.length === 0 && !isFormOpen ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No notes added</p>
          <Button size="sm" className="mt-3" onClick={() => setIsFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Note
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="p-4 border border-gray-200 rounded-lg"
            >
              <div className="flex items-start">
                <MessageSquare className="w-5 h-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {note.content}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    By {note.createdBy.name} on{' '}
                    {new Date(note.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

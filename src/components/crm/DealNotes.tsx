import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { Activity, User } from '../../types/crm';
import { fetchActivitiesForEntity, createActivity } from '../../lib/api/activities';
import { useAuth } from '../../contexts/AuthContext';
import { useAppContext } from '../../contexts/AppContext';

interface DealNotesProps {
  entityId: string;
  entityType: 'Partner' | 'Account' | 'Contact' | 'Opportunity' | 'Project';
}

export const DealNotes: React.FC<DealNotesProps> = ({ entityId, entityType }) => {
  const { user: authUser } = useAuth();
  const { users } = useAppContext();
  const [notes, setNotes] = useState<Activity[]>([]);
  const [noteText, setNoteText] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [entityId, entityType]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const allActivities = await fetchActivitiesForEntity(entityId, entityType);
      const notesOnly = allActivities.filter(a => a.type === 'Note');
      setNotes(notesOnly);
    } catch (err) {
      console.error('Error loading notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!noteText.trim() || !authUser) return;

    setPosting(true);
    try {
      await createActivity({
        type: 'Note',
        summary: noteText.trim(),
        relatedToId: entityId,
        relatedToType: entityType,
        createdById: authUser.id,
      });

      setNoteText('');
      await loadNotes();
    } catch (err) {
      console.error('Error posting note:', err);
    } finally {
      setPosting(false);
    }
  };

  const getUserById = (userId: string): User | undefined => {
    return users.find(u => u.id === userId);
  };

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Input Area */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex gap-3">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handlePost();
              }
            }}
            placeholder="Write a note..."
            rows={3}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          />
          <button
            onClick={handlePost}
            disabled={!noteText.trim() || posting}
            className="px-4 h-fit bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {posting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Post
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Press Cmd/Ctrl + Enter to post</p>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm font-medium">No notes yet</p>
            <p className="text-xs mt-1">Add the first note to start the conversation</p>
          </div>
        ) : (
          notes.map((note) => {
            const noteUser = getUserById(note.createdById);
            const isOwnNote = authUser?.id === note.createdById;

            return (
              <div
                key={note.id}
                className={`flex gap-3 ${isOwnNote ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {noteUser?.avatar ? (
                    <img
                      src={noteUser.avatar}
                      alt={noteUser.name || 'User'}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold">
                      {(noteUser?.name || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Note Content */}
                <div className={`flex-1 max-w-2xl ${isOwnNote ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className={`text-sm font-semibold text-gray-900 ${isOwnNote ? 'order-2' : ''}`}>
                      {noteUser?.name || 'Unknown User'}
                    </span>
                    <span className={`text-xs text-gray-500 ${isOwnNote ? 'order-1' : ''}`}>
                      {getTimeAgo(note.createdAt)}
                    </span>
                  </div>

                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      isOwnNote
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{note.summary}</p>
                    {note.details && (
                      <p className={`text-xs mt-2 ${isOwnNote ? 'text-emerald-100' : 'text-gray-600'}`}>
                        {note.details}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

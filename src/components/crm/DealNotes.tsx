import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Loader2, Reply, CornerDownRight } from 'lucide-react';
import { Activity, User } from '../../types/crm';
import { fetchActivitiesForEntity, createActivity } from '../../lib/api/activities';
import { useAuth } from '../../contexts/AuthContext';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';

interface DealNotesProps {
  entityId: string;
  entityType: 'Partner' | 'Account' | 'Contact' | 'Opportunity' | 'Project';
}

interface NoteWithReplies extends Activity {
  replies?: Activity[];
}

export const DealNotes: React.FC<DealNotesProps> = ({ entityId, entityType }) => {
  const { user: authUser } = useAuth();
  const { users } = useAppContext();
  const [notes, setNotes] = useState<NoteWithReplies[]>([]);
  const [noteText, setNoteText] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    loadNotes();
  }, [entityId, entityType]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          assignee:crm_users!assigned_to_id(name, avatar),
          replies:activities!parent_id(
            *,
            creator:crm_users!created_by(name, avatar)
          )
        `)
        .eq('related_to_id', entityId)
        .eq('related_to_type', entityType)
        .eq('type', 'Note')
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const notesWithReplies = (data || []).map(note => ({
        ...note,
        createdAt: new Date(note.created_at),
        updatedAt: new Date(note.updated_at),
        dueDate: note.due_date ? new Date(note.due_date) : undefined,
        createdById: note.created_by,
        assignedToId: note.assigned_to_id,
        relatedToId: note.related_to_id,
        relatedToType: note.related_to_type as any,
        replies: (note.replies || []).map((r: any) => ({
          ...r,
          createdAt: new Date(r.created_at),
          updatedAt: new Date(r.updated_at),
          dueDate: r.due_date ? new Date(r.due_date) : undefined,
          createdById: r.created_by,
          assignedToId: r.assigned_to_id,
          relatedToId: r.related_to_id,
          relatedToType: r.related_to_type as any,
        }))
      }));

      setNotes(notesWithReplies);
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

  const handleReply = async (parentId: string) => {
    if (!replyText.trim() || !authUser) return;

    setPosting(true);
    try {
      const { error } = await supabase
        .from('activities')
        .insert({
          type: 'Note',
          summary: replyText.trim(),
          related_to_id: entityId,
          related_to_type: entityType,
          created_by: authUser.id,
          parent_id: parentId,
        });

      if (error) throw error;

      setReplyText('');
      setReplyingTo(null);
      await loadNotes();
    } catch (err) {
      console.error('Error posting reply:', err);
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
      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
              <div key={note.id} className="space-y-3">
                {/* Main Note */}
                <div className="flex gap-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {noteUser?.avatar ? (
                      <img
                        src={noteUser.avatar}
                        alt={noteUser.name || 'User'}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-sm font-semibold">
                        {(noteUser?.name || 'U')[0].toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Note Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-semibold text-slate-900">
                        {noteUser?.name || 'Unknown User'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {getTimeAgo(note.createdAt)}
                      </span>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                      <p className="text-sm text-slate-900 whitespace-pre-wrap break-words leading-relaxed">
                        {note.summary}
                      </p>
                    </div>

                    {/* Reply Button */}
                    <button
                      onClick={() => setReplyingTo(note.id)}
                      className="mt-2 text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1 transition-colors"
                    >
                      <Reply className="w-3 h-3" />
                      Reply
                    </button>

                    {/* Reply Input */}
                    {replyingTo === note.id && (
                      <div className="mt-3 ml-3 relative">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                              e.preventDefault();
                              handleReply(note.id);
                            }
                            if (e.key === 'Escape') {
                              setReplyingTo(null);
                              setReplyText('');
                            }
                          }}
                          placeholder="Write a reply..."
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm min-h-[60px]"
                          autoFocus
                        />
                        <div className="flex items-center justify-end gap-2 mt-2">
                          <button
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyText('');
                            }}
                            className="text-xs text-slate-500 hover:text-slate-700 font-medium px-3 py-1"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleReply(note.id)}
                            disabled={!replyText.trim() || posting}
                            className="text-xs text-slate-700 hover:text-slate-900 font-semibold disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1 transition-colors"
                          >
                            {posting ? 'Posting...' : 'Post Reply'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Replies */}
                    {note.replies && note.replies.length > 0 && (
                      <div className="mt-4 space-y-3 pl-6 border-l-2 border-slate-200">
                        {note.replies.map((reply) => {
                          const replyUser = getUserById(reply.createdById);

                          return (
                            <div key={reply.id} className="flex gap-3">
                              {/* Reply Avatar */}
                              <div className="flex-shrink-0">
                                {replyUser?.avatar ? (
                                  <img
                                    src={replyUser.avatar}
                                    alt={replyUser.name || 'User'}
                                    className="w-7 h-7 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center text-white text-xs font-semibold">
                                    {(replyUser?.name || 'U')[0].toUpperCase()}
                                  </div>
                                )}
                              </div>

                              {/* Reply Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 mb-1">
                                  <CornerDownRight className="w-3 h-3 text-slate-400" />
                                  <span className="text-xs font-semibold text-slate-700">
                                    {replyUser?.name || 'Unknown User'}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    {getTimeAgo(reply.createdAt)}
                                  </span>
                                </div>

                                <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                                  <p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
                                    {reply.summary}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area - Tesla Style */}
      <div className="border-t border-slate-200 bg-white p-4">
        <div className="relative">
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
            className="w-full px-4 py-3 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-slate-300 text-sm min-h-[80px] pr-20"
          />
          <button
            onClick={handlePost}
            disabled={!noteText.trim() || posting}
            className="absolute bottom-3 right-3 text-sm text-slate-700 hover:text-slate-900 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {posting ? 'Posting...' : 'Post'}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">Press Cmd/Ctrl + Enter to post</p>
      </div>
    </div>
  );
};

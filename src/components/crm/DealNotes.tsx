import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Loader2, X } from 'lucide-react';
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
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyingToUser, setReplyingToUser] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      const { error } = await supabase
        .from('activities')
        .insert({
          type: 'Note',
          summary: noteText.trim(),
          related_to_id: entityId,
          related_to_type: entityType,
          created_by: authUser.id,
          parent_id: replyingToId,
        });

      if (error) throw error;

      setNoteText('');
      setReplyingToId(null);
      setReplyingToUser(null);
      await loadNotes();
    } catch (err) {
      console.error('Error posting note:', err);
    } finally {
      setPosting(false);
    }
  };

  const handleReply = (noteId: string, userName: string) => {
    setReplyingToId(noteId);
    setReplyingToUser(userName);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePost();
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium text-slate-500">No notes yet</p>
            <p className="text-xs mt-1">Add the first note to start the conversation</p>
          </div>
        ) : (
          notes.map((note) => {
            const noteUser = getUserById(note.createdById);

            return (
              <div key={note.id} className="space-y-3">
                {/* Main Note */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    {noteUser?.avatar ? (
                      <img
                        src={noteUser.avatar}
                        alt={noteUser.name || 'User'}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-xs font-semibold">
                        {(noteUser?.name || 'U')[0].toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-semibold text-slate-900">
                        {noteUser?.name || 'Unknown'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {getTimeAgo(note.createdAt)}
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
                        {note.summary}
                      </p>
                    </div>

                    <button
                      onClick={() => handleReply(note.id, noteUser?.name || 'Unknown')}
                      className="mt-1.5 text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
                    >
                      Reply
                    </button>

                    {/* Replies (Threading with ml-8) */}
                    {note.replies && note.replies.length > 0 && (
                      <div className="mt-3 ml-8 space-y-3 border-l-2 border-slate-100 pl-4">
                        {note.replies.map((reply) => {
                          const replyUser = getUserById(reply.createdById);

                          return (
                            <div key={reply.id} className="flex gap-2.5">
                              <div className="flex-shrink-0">
                                {replyUser?.avatar ? (
                                  <img
                                    src={replyUser.avatar}
                                    alt={replyUser.name || 'User'}
                                    className="w-6 h-6 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center text-white text-[10px] font-semibold">
                                    {(replyUser?.name || 'U')[0].toUpperCase()}
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 mb-1">
                                  <span className="text-xs font-semibold text-slate-700">
                                    {replyUser?.name || 'Unknown'}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    {getTimeAgo(reply.createdAt)}
                                  </span>
                                </div>

                                <div className="bg-white rounded-lg px-3 py-2 border border-slate-100">
                                  <p className="text-sm text-slate-600 whitespace-pre-wrap break-words leading-relaxed">
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

      {/* Minimalist Input Area - Tesla Style */}
      <div className="border-t border-slate-100 bg-white p-4">
        <div className="w-full bg-slate-50 rounded-2xl p-4 border border-transparent focus-within:border-slate-200 focus-within:bg-white transition-all">
          {/* Replying Badge */}
          {replyingToId && replyingToUser && (
            <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
              <span>Replying to <span className="font-semibold text-slate-700">{replyingToUser}</span></span>
              <button
                onClick={() => {
                  setReplyingToId(null);
                  setReplyingToUser(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a note..."
            className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm placeholder:text-slate-400 min-h-[60px] resize-none focus:outline-none"
          />

          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-slate-400">Press Enter to post</p>
            <button
              onClick={handlePost}
              disabled={!noteText.trim() || posting}
              className="text-sm text-slate-600 hover:text-slate-900 font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

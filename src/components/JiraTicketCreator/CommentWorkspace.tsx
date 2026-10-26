/**
 * CommentWorkspace Component
 * Owns comment mode: the notes form, the generation request, and copy.
 *
 * Split out of JiraTicketCreator, which had grown to hold both modes' state.
 * It stays mounted while hidden so switching tabs never discards a comment.
 */

import { useState, useCallback, type ReactNode } from 'react';
import { useComment } from '../../hooks/useComment';
import { DEFAULT_COMMENT_INPUT } from '../../types/ticket';
import type { CommentInput, CommentType } from '../../types/ticket';
import { CommentView } from './CommentView';
import { ModePanel } from './ModePanel';

interface CommentWorkspaceProps {
  provider: string;
  providerLoading: boolean;
  /** Whether this mode's tab is selected. Hidden workspaces stay mounted. */
  isActive: boolean;
  /** The shared tab strip, rendered above this workspace's card. */
  tabs: (trailing?: ReactNode) => ReactNode;
  onCopyFailure: () => void;
}

export function CommentWorkspace({
  provider,
  providerLoading,
  isActive,
  tabs,
  onCopyFailure,
}: CommentWorkspaceProps) {
  const [commentData, setCommentData] = useState<CommentInput>(DEFAULT_COMMENT_INPUT);
  const [contextOpen, setContextOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const {
    generatedComment,
    editedContent,
    isGenerating,
    error,
    setEditedContent,
    generateComment,
    cancelGeneration,
    reset,
  } = useComment({ provider });

  const handleNotesChange = useCallback((notes: string) => {
    setCommentData(prev => ({ ...prev, notes }));
  }, []);

  const handleTypeChange = useCallback((type: CommentType) => {
    setCommentData(prev => ({ ...prev, type }));
  }, []);

  const handleContextChange = useCallback((ticketContext: string) => {
    setCommentData(prev => ({ ...prev, ticketContext }));
  }, []);

  const handleGenerate = useCallback(() => {
    generateComment(commentData);
  }, [generateComment, commentData]);

  /** Copies the markdown as plain text, as the ticket flow's copy does. */
  const handleCopy = useCallback(async () => {
    const content = editedContent || generatedComment?.content;
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      onCopyFailure();
    }
  }, [editedContent, generatedComment, onCopyFailure]);

  const handleClear = useCallback(() => {
    reset();
    setCommentData(DEFAULT_COMMENT_INPUT);
  }, [reset]);

  return (
    <ModePanel mode="comment" isActive={isActive} tabs={tabs()}>
      <CommentView
        commentData={commentData}
        generatedComment={generatedComment}
        editedContent={editedContent}
        isGenerating={isGenerating}
        providerLoading={providerLoading}
        error={error}
        copied={copied}
        contextOpen={contextOpen}
        onContextOpenChange={setContextOpen}
        onNotesChange={handleNotesChange}
        onTypeChange={handleTypeChange}
        onContextChange={handleContextChange}
        onContentChange={setEditedContent}
        onGenerate={handleGenerate}
        onCancel={cancelGeneration}
        onCopy={handleCopy}
        onClear={handleClear}
      />
    </ModePanel>
  );
}

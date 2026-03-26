/**
 * ImagePreviewModal Component
 * Full-size image preview with click-outside and Escape to close
 */

import { memo, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Attachment } from '../../types/ticket';
import { isImageAttachment } from '../../types/ticket';

interface ImagePreviewModalProps {
  attachments: Attachment[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export const ImagePreviewModal = memo(function ImagePreviewModal({
  attachments,
  currentIndex,
  onClose,
  onNavigate,
}: ImagePreviewModalProps) {
  const current = attachments[currentIndex];
  if (!current) return null;

  const imageAttachments = attachments.filter(isImageAttachment);
  const currentImageIndex = imageAttachments.findIndex(a => a.id === current.id);
  const hasPrev = currentImageIndex > 0;
  const hasNext = currentImageIndex < imageAttachments.length - 1;

  const goToPrev = useCallback(() => {
    if (hasPrev) {
      const prevImage = imageAttachments[currentImageIndex - 1];
      const globalIdx = attachments.findIndex(a => a.id === prevImage.id);
      onNavigate(globalIdx);
    }
  }, [hasPrev, imageAttachments, currentImageIndex, attachments, onNavigate]);

  const goToNext = useCallback(() => {
    if (hasNext) {
      const nextImage = imageAttachments[currentImageIndex + 1];
      const globalIdx = attachments.findIndex(a => a.id === nextImage.id);
      onNavigate(globalIdx);
    }
  }, [hasNext, imageAttachments, currentImageIndex, attachments, onNavigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goToPrev, goToNext]);

  // Only show preview for images
  if (!isImageAttachment(current)) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-label={`Preview: ${current.name}`}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all z-10"
        aria-label="Close preview"
        type="button"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Previous button */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); goToPrev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all z-10"
          aria-label="Previous image"
          type="button"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Next button */}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); goToNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all z-10"
          aria-label="Next image"
          type="button"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Image */}
      <img
        src={current.previewUrl}
        alt={current.name}
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Filename and counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/60 text-white text-sm flex items-center gap-3">
        <span className="truncate max-w-[300px]">{current.name}</span>
        {imageAttachments.length > 1 && (
          <span className="text-white/60">
            {currentImageIndex + 1} / {imageAttachments.length}
          </span>
        )}
      </div>
    </div>
  );
});

import { useCallback, useEffect, useRef } from 'react';

export type AnnouncementPriority = 'polite' | 'assertive';

interface UseAnnouncerOptions {
  politeness?: AnnouncementPriority;
  clearAfter?: number;
}

export const useAnnouncer = (options: UseAnnouncerOptions = {}) => {
  const { politeness = 'polite', clearAfter = 3000 } = options;
  const announcerRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Create or find the announcer element
    let announcer = document.getElementById('live-announcer') as HTMLDivElement;

    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'live-announcer';
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', politeness);
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only';
      document.body.appendChild(announcer);
    } else {
      announcer.setAttribute('aria-live', politeness);
    }

    announcerRef.current = announcer;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [politeness]);

  const announce = useCallback((message: string, priority?: AnnouncementPriority) => {
    const announcer = announcerRef.current;
    if (!announcer) return;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Update the politeness level if specified
    if (priority) {
      announcer.setAttribute('aria-live', priority);
    }

    // Set the message
    announcer.textContent = message;

    // Clear the message after the specified time
    if (clearAfter > 0) {
      timeoutRef.current = setTimeout(() => {
        if (announcer.textContent === message) {
          announcer.textContent = '';
        }
      }, clearAfter);
    }
  }, [clearAfter]);

  const clear = useCallback(() => {
    if (announcerRef.current) {
      announcerRef.current.textContent = '';
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return { announce, clear };
};

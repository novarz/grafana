import { useEffect, useState } from 'react';

import { renderMarkdown, textUtil } from '@grafana/data';

const DISMISSED_NOTICES_KEY = 'grafana.headerNotice.dismissed';

const listeners = new Set<() => void>();
let dashboardDescription: string | undefined;

/**
 * Published by the dashboard page while a dashboard is on screen, and cleared on leave
 * so a description cannot follow the user onto another route.
 */
export function setHeaderNoticeDashboardDescription(value: string | undefined) {
  const next = value?.trim() || undefined;
  if (next === dashboardDescription) {
    return;
  }
  dashboardDescription = next;
  listeners.forEach((listener) => listener());
}

export function useHeaderNoticeDashboardDescription(): string | undefined {
  const [value, setValue] = useState(dashboardDescription);

  useEffect(() => {
    const listener = () => setValue(dashboardDescription);
    listeners.add(listener);
    setValue(dashboardDescription);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return value;
}

export function readNoticeParam(search: string): string | undefined {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const notice = params.get('notice')?.trim();
  return notice || undefined;
}

/** `notice` wins. Dashboard description is only present while a dashboard page is mounted. */
export function resolveHeaderNotice(search: string, description: string | undefined): string | undefined {
  return readNoticeParam(search) ?? (description?.trim() || undefined);
}

/**
 * Operator copy may be markdown or a short HTML snippet. Render it, then sanitize so
 * event handlers and script never reach the DOM.
 */
export function formatHeaderNotice(raw: string): string {
  const rendered = renderMarkdown(raw, { breaks: true });
  const sanitized = textUtil.sanitize(rendered);
  const visible = sanitized
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
  return visible ? sanitized : '';
}

export function readDismissedNotices(): string[] {
  try {
    const raw = sessionStorage.getItem(DISMISSED_NOTICES_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

export function dismissNoticeForSession(raw: string) {
  const next = new Set(readDismissedNotices());
  next.add(raw);
  sessionStorage.setItem(DISMISSED_NOTICES_KEY, JSON.stringify([...next]));
}

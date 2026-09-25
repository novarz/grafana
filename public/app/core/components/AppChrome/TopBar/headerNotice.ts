import { renderMarkdown, textUtil } from '@grafana/data';

const DISMISS_STORAGE_KEY = 'grafana.headerNotice.dismissed';

export function resolveHeaderNotice(
  noticeParam: string | null | undefined,
  dashboardDescription: string | null | undefined
): string | undefined {
  const notice = noticeParam?.trim();
  if (notice) {
    return notice;
  }

  const description = dashboardDescription?.trim();
  if (description) {
    return description;
  }

  return undefined;
}

/** Markdown-ish copy is rendered, then passed through Grafana's HTML sanitizer. */
export function formatNoticeHtml(message: string): string {
  return textUtil.sanitize(renderMarkdown(message, { breaks: true, noSanitize: true }));
}

export function readDismissedNotices(): string[] {
  try {
    const raw = sessionStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return parseStoredDismissals(raw);
  } catch {
    return [];
  }
}

export function rememberDismissedNotice(message: string) {
  try {
    const dismissed = new Set(readDismissedNotices());
    dismissed.add(message);
    sessionStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify([...dismissed]));
  } catch {
    // Session storage can be blocked; the in-memory dismiss still hides the banner.
  }
}

/** Earlier builds stored one plain message; current builds store a JSON array. */
function parseStoredDismissals(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
  } catch {
    // Not JSON, so the stored value is the previous single-message format.
  }
  return [raw];
}

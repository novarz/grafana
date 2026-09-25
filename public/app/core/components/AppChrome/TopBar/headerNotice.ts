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

export function readDismissedNotice(): string | null {
  try {
    return sessionStorage.getItem(DISMISS_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function rememberDismissedNotice(message: string) {
  try {
    sessionStorage.setItem(DISMISS_STORAGE_KEY, message);
  } catch {
    // Session storage can be blocked; the in-memory dismiss still hides the banner.
  }
}

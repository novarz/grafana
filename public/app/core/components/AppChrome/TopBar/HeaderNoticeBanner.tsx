import { css } from '@emotion/css';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom-v5-compat';

import { type GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { Icon, useStyles2 } from '@grafana/ui';
import { getDashboardSrv } from 'app/features/dashboard/services/DashboardSrv';

import { formatNoticeHtml, readDismissedNotices, rememberDismissedNotice, resolveHeaderNotice } from './headerNotice';

interface Props {
  onHeightChange?: (height: number) => void;
}

export function HeaderNoticeBanner({ onHeightChange }: Props) {
  const location = useLocation();
  const styles = useStyles2(getStyles);
  const dashboardDescription = useDashboardDescription();
  const noticeParam = new URLSearchParams(location.search).get('notice');
  const message = resolveHeaderNotice(noticeParam, dashboardDescription);
  const [dismissedMessages, setDismissedMessages] = useState<ReadonlySet<string>>(
    () => new Set(readDismissedNotices())
  );
  const bannerRef = useRef<HTMLDivElement>(null);
  const visible = message !== undefined && !dismissedMessages.has(message);
  const html = visible && message ? formatNoticeHtml(message) : '';

  useLayoutEffect(() => {
    if (!onHeightChange) {
      return;
    }
    const node = bannerRef.current;
    if (!node) {
      onHeightChange(0);
      return;
    }

    const publish = () => onHeightChange(node.getBoundingClientRect().height);
    publish();
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(publish);
    observer.observe(node);
    return () => observer.disconnect();
  }, [onHeightChange, visible, html]);

  if (!visible || !message) {
    return null;
  }

  const dismiss = () => {
    rememberDismissedNotice(message);
    setDismissedMessages((current) => {
      const next = new Set(current);
      next.add(message);
      return next;
    });
  };

  return (
    <div
      ref={bannerRef}
      className={styles.banner}
      role="region"
      aria-label={t('app-chrome.header-notice.label', 'Notice')}
      data-testid="header-notice-banner"
    >
      <div className={styles.message} dangerouslySetInnerHTML={{ __html: html }} />
      <button
        type="button"
        className={styles.dismiss}
        aria-label={t('app-chrome.header-notice.dismiss', 'Dismiss notice')}
        onClick={dismiss}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            dismiss();
          }
        }}
      >
        <Icon name="times" />
      </button>
    </div>
  );
}

function useDashboardDescription() {
  const location = useLocation();
  const [description, setDescription] = useState<string | undefined>(() => readDashboardDescription(location.pathname));

  useEffect(() => {
    const read = () => setDescription(readDashboardDescription(location.pathname));
    read();
    const onDashboard = location.pathname.startsWith('/d/') || location.pathname.startsWith('/dashboard/');
    if (!onDashboard) {
      return;
    }
    // The dashboard model is assigned after the route renders, so chrome has to read it again.
    const timer = window.setInterval(read, 500);
    return () => window.clearInterval(timer);
  }, [location.pathname]);

  return description;
}

function readDashboardDescription(pathname: string): string | undefined {
  if (!pathname.startsWith('/d/') && !pathname.startsWith('/dashboard/')) {
    return undefined;
  }
  const description = getDashboardSrv().getCurrent()?.description;
  return typeof description === 'string' && description.trim() ? description : undefined;
}

const getStyles = (theme: GrafanaTheme2) => ({
  banner: css({
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing(1),
    width: '100%',
    padding: theme.spacing(1, 2),
    background: theme.colors.info.transparent,
    color: theme.colors.text.primary,
    borderBottom: `1px solid ${theme.colors.border.weak}`,
  }),
  message: css({
    flex: 1,
    minWidth: 0,
    '& p': {
      margin: 0,
    },
    '& a': {
      color: theme.colors.text.link,
    },
  }),
  dismiss: css({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    border: 'none',
    background: 'transparent',
    color: theme.colors.text.secondary,
    cursor: 'pointer',
    padding: theme.spacing(0.5),
    '&:hover, &:focus-visible': {
      color: theme.colors.text.primary,
    },
  }),
});

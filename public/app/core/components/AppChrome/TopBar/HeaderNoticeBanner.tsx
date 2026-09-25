import { css } from '@emotion/css';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom-v5-compat';

import { type GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { Icon, useStyles2 } from '@grafana/ui';
import { appEvents } from 'app/core/app_events';
import { getDashboardSrv } from 'app/features/dashboard/services/DashboardSrv';
import { DashboardDescriptionChangedEvent } from 'app/types/events';

import { formatNoticeHtml, readDismissedNotice, rememberDismissedNotice, resolveHeaderNotice } from './headerNotice';

interface Props {
  onHeightChange?: (height: number) => void;
}

export function HeaderNoticeBanner({ onHeightChange }: Props) {
  const location = useLocation();
  const styles = useStyles2(getStyles);
  const dashboardDescription = useDashboardDescription();
  const noticeParam = new URLSearchParams(location.search).get('notice');
  const message = resolveHeaderNotice(noticeParam, dashboardDescription);
  const [dismissedMessage, setDismissedMessage] = useState<string | null>(() => readDismissedNotice());
  const bannerRef = useRef<HTMLDivElement>(null);
  const visible = Boolean(message) && dismissedMessage !== message;
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
    setDismissedMessage(message);
  };

  return (
    <div
      ref={bannerRef}
      className={styles.banner}
      role="region"
      aria-label={t('app-chrome.header-notice.label', 'Notice')}
      data-testid="header-notice-banner"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          dismiss();
        }
      }}
    >
      <div className={styles.message} dangerouslySetInnerHTML={{ __html: html }} />
      <button
        type="button"
        className={styles.dismiss}
        aria-label={t('app-chrome.header-notice.dismiss', 'Dismiss notice')}
        onClick={dismiss}
      >
        <Icon name="times" />
      </button>
    </div>
  );
}

function useDashboardDescription() {
  const [description, setDescription] = useState<string | undefined>(
    () => getDashboardSrv().getCurrent()?.description
  );

  useEffect(() => {
    setDescription(getDashboardSrv().getCurrent()?.description);
    const sub = appEvents.subscribe(DashboardDescriptionChangedEvent, (event) => {
      setDescription(event.payload.description);
    });
    return () => sub.unsubscribe();
  }, []);

  return description;
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

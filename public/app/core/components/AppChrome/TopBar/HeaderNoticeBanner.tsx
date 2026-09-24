import { css } from '@emotion/css';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom-v5-compat';

import { type GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { IconButton, useStyles2 } from '@grafana/ui';

import {
  dismissNoticeForSession,
  formatHeaderNotice,
  readDismissedNotices,
  resolveHeaderNotice,
  useHeaderNoticeDashboardDescription,
} from './headerNotice';

interface Props {
  onHeightChange?: (height: number) => void;
}

export function HeaderNoticeBanner({ onHeightChange }: Props) {
  const styles = useStyles2(getStyles);
  const location = useLocation();
  const dashboardDescription = useHeaderNoticeDashboardDescription();
  const [dismissed, setDismissed] = useState(readDismissedNotices);
  const raw = resolveHeaderNotice(location.search, dashboardDescription);
  const html = raw && !dismissed.includes(raw) ? formatHeaderNotice(raw) : '';
  const [node, setNode] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!onHeightChange) {
      return;
    }
    if (!node) {
      onHeightChange(0);
      return;
    }
    const publish = () => onHeightChange(Math.ceil(node.getBoundingClientRect().height));
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(node);
    return () => {
      observer.disconnect();
      onHeightChange(0);
    };
  }, [node, onHeightChange, html]);

  if (!raw || !html) {
    return null;
  }

  const dismiss = () => {
    dismissNoticeForSession(raw);
    setDismissed(readDismissedNotices());
  };

  return (
    <div
      ref={setNode}
      className={styles.banner}
      role="region"
      aria-label={t('app-chrome.header-notice.region', 'Notice')}
    >
      <div className={styles.message} dangerouslySetInnerHTML={{ __html: html }} />
      <IconButton
        name="times"
        size="lg"
        aria-label={t('app-chrome.header-notice.dismiss', 'Dismiss notice')}
        onClick={dismiss}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            dismiss();
          }
        }}
      />
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  banner: css({
    label: 'header-notice-banner',
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing(1),
    width: '100%',
    padding: theme.spacing(1, 1.5),
    background: theme.colors.info.transparent,
    color: theme.colors.text.primary,
    borderBottom: `1px solid ${theme.colors.border.weak}`,
  }),
  message: css({
    flex: 1,
    minWidth: 0,
    overflowWrap: 'anywhere',
    '& p': {
      margin: 0,
    },
    '& a': {
      color: theme.colors.text.link,
      textDecoration: 'underline',
    },
  }),
});

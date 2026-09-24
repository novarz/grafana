import { css } from '@emotion/css';
import { useEffect, useState } from 'react';

import { type GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import { getDashboardSrv } from 'app/features/dashboard/services/DashboardSrv';

let dismissed = false;

function readNotice() {
  const param = new URLSearchParams(window.location.search).get('notice');
  if (param) {
    return param;
  }
  return getDashboardSrv().getCurrent()?.description ?? '';
}

export function NoticeBanner() {
  const styles = useStyles2(getStyles);
  const [html, setHtml] = useState(readNotice);
  const [hidden, setHidden] = useState(dismissed);

  useEffect(() => {
    const onPop = () => setHtml(readNotice());
    window.addEventListener('popstate', onPop);
    setHtml(readNotice());
  }, []);

  if (hidden || !html) {
    return null;
  }

  return (
    <div className={styles.banner}>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <button className={styles.dismiss} onClick={() => {
        dismissed = true;
        setHidden(true);
      }}>
        x
      </button>
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  banner: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
    padding: theme.spacing(0.5, 1),
    background: theme.colors.warning.transparent,
    borderBottom: `1px solid ${theme.colors.warning.border}`,
    fontSize: theme.typography.bodySmall.fontSize,
  }),
  dismiss: css({
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: theme.colors.text.primary,
  }),
});

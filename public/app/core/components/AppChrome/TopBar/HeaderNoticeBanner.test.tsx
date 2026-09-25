import { act, render, screen, waitFor } from 'test/test-utils';

import { locationService } from '@grafana/runtime';
import { getDashboardSrv } from 'app/features/dashboard/services/DashboardSrv';
import { type DashboardModel } from 'app/features/dashboard/state/DashboardModel';

import { HeaderNoticeBanner } from './HeaderNoticeBanner';

describe('HeaderNoticeBanner', () => {
  beforeEach(() => {
    sessionStorage.clear();
    getDashboardSrv().setCurrent(undefined);
  });

  afterEach(() => {
    getDashboardSrv().setCurrent(undefined);
  });

  it('renders nothing when the notice param and dashboard description are empty', () => {
    render(<HeaderNoticeBanner />, { historyOptions: { initialEntries: ['/'] } });

    expect(screen.queryByRole('region', { name: 'Notice' })).not.toBeInTheDocument();
  });

  it('renders the notice query param', () => {
    render(<HeaderNoticeBanner />, {
      historyOptions: { initialEntries: ['/?notice=Scheduled+maintenance'] },
    });

    expect(screen.getByRole('region', { name: 'Notice' })).toHaveTextContent('Scheduled maintenance');
  });

  it('uses the dashboard description when the notice param is absent', () => {
    getDashboardSrv().setCurrent({ description: 'Read-only window' } as DashboardModel);

    render(<HeaderNoticeBanner />, { historyOptions: { initialEntries: ['/d/abc'] } });

    expect(screen.getByRole('region', { name: 'Notice' })).toHaveTextContent('Read-only window');
  });

  it('ignores the dashboard description when the page is not a dashboard', () => {
    getDashboardSrv().setCurrent({ description: 'Read-only window' } as DashboardModel);

    render(<HeaderNoticeBanner />, { historyOptions: { initialEntries: ['/explore'] } });

    expect(screen.queryByRole('region', { name: 'Notice' })).not.toBeInTheDocument();
  });

  it('prefers the notice query param over the dashboard description', () => {
    getDashboardSrv().setCurrent({ description: 'From dashboard' } as DashboardModel);

    render(<HeaderNoticeBanner />, {
      historyOptions: { initialEntries: ['/d/abc?notice=From+query'] },
    });

    expect(screen.getByRole('region', { name: 'Notice' })).toHaveTextContent('From query');
    expect(screen.queryByText('From dashboard')).not.toBeInTheDocument();
  });

  it('hides the banner on click and keeps it dismissed for the session', async () => {
    const { user, unmount } = render(<HeaderNoticeBanner />, {
      historyOptions: { initialEntries: ['/?notice=Hold'] },
    });

    await user.click(screen.getByRole('button', { name: 'Dismiss notice' }));

    expect(screen.queryByRole('region', { name: 'Notice' })).not.toBeInTheDocument();

    unmount();
    render(<HeaderNoticeBanner />, { historyOptions: { initialEntries: ['/?notice=Hold'] } });

    expect(screen.queryByRole('region', { name: 'Notice' })).not.toBeInTheDocument();
  });

  it('dismisses the banner from the keyboard', async () => {
    const { user } = render(<HeaderNoticeBanner />, {
      historyOptions: { initialEntries: ['/?notice=Keyboard'] },
    });

    screen.getByRole('button', { name: 'Dismiss notice' }).focus();
    await user.keyboard('{Enter}');

    expect(screen.queryByRole('region', { name: 'Notice' })).not.toBeInTheDocument();
  });

  it('dismisses the banner when Escape is pressed', async () => {
    const { user } = render(<HeaderNoticeBanner />, {
      historyOptions: { initialEntries: ['/?notice=Escape'] },
    });

    screen.getByRole('button', { name: 'Dismiss notice' }).focus();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('region', { name: 'Notice' })).not.toBeInTheDocument();
  });

  it('drops a notice-only banner after navigation removes the query param', async () => {
    render(<HeaderNoticeBanner />, {
      historyOptions: { initialEntries: ['/?notice=Scheduled+maintenance'] },
    });

    expect(screen.getByRole('region', { name: 'Notice' })).toHaveTextContent('Scheduled maintenance');

    act(() => {
      locationService.push('/explore');
    });

    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'Notice' })).not.toBeInTheDocument();
    });
  });

  it('does not execute an XSS payload', () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => undefined);
    const payload = '<img src=x onerror=alert(1)><script>alert(1)</script>[x](javascript:alert(1))';

    render(<HeaderNoticeBanner />, {
      historyOptions: { initialEntries: [`/?notice=${encodeURIComponent(payload)}`] },
    });

    const banner = screen.getByRole('region', { name: 'Notice' });
    expect(banner.querySelector('script')).toBeNull();
    expect(banner.querySelector('[onerror]')).toBeNull();
    expect(banner.innerHTML.toLowerCase()).not.toContain('javascript:');
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('renders bold text and links from the notice', () => {
    const message = '**Soon** [status](https://example.com/status)';
    render(<HeaderNoticeBanner />, {
      historyOptions: { initialEntries: [`/?notice=${encodeURIComponent(message)}`] },
    });

    const banner = screen.getByRole('region', { name: 'Notice' });
    expect(banner.querySelector('strong')).toHaveTextContent('Soon');
    expect(banner.querySelector('a')).toHaveAttribute('href', 'https://example.com/status');
  });
});

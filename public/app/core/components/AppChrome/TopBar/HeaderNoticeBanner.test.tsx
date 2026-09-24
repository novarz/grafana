import { act } from '@testing-library/react';

import { locationService } from '@grafana/runtime';
import { render, screen } from 'test/test-utils';

import { HeaderNoticeBanner } from './HeaderNoticeBanner';
import { setHeaderNoticeDashboardDescription } from './headerNotice';

describe('HeaderNoticeBanner', () => {
  beforeEach(() => {
    sessionStorage.clear();
    setHeaderNoticeDashboardDescription(undefined);
    delete window.__noticeXss;
  });

  it('renders nothing when notice and the dashboard description are empty', () => {
    render(<HeaderNoticeBanner />);

    expect(screen.queryByRole('region', { name: 'Notice' })).not.toBeInTheDocument();
  });

  it('shows the notice query param, including bold text, a link, and a line break', () => {
    render(<HeaderNoticeBanner />);
    act(() => {
      locationService.push(
        '/?notice=' + encodeURIComponent('**Scheduled** maintenance\nSee [status](https://example.com/status)')
      );
    });

    const region = screen.getByRole('region', { name: 'Notice' });
    expect(region.querySelector('strong')).toHaveTextContent('Scheduled');
    expect(region).toHaveTextContent('maintenance');
    expect(region.querySelector('a')).toHaveAttribute('href', 'https://example.com/status');
    expect(region.querySelector('a')).toHaveTextContent('status');
    expect(region.innerHTML).toMatch(/<br\s*\/?>/i);
  });

  it('uses the dashboard description only when notice is absent', () => {
    setHeaderNoticeDashboardDescription('Disk pressure on the metrics cluster');
    render(<HeaderNoticeBanner />);

    expect(screen.getByRole('region', { name: 'Notice' })).toHaveTextContent('Disk pressure on the metrics cluster');

    act(() => {
      locationService.push('/?notice=Scheduled+maintenance');
    });
    expect(screen.getByRole('region', { name: 'Notice' })).toHaveTextContent('Scheduled maintenance');
    expect(screen.getByRole('region', { name: 'Notice' })).not.toHaveTextContent('Disk pressure');
  });

  it('drops the notice after navigation instead of keeping the previous query param', () => {
    render(<HeaderNoticeBanner />);
    act(() => {
      locationService.push('/d/abc?notice=Scheduled+maintenance');
    });
    expect(screen.getByRole('region', { name: 'Notice' })).toHaveTextContent('Scheduled maintenance');

    act(() => {
      locationService.push('/explore');
    });
    expect(screen.queryByRole('region', { name: 'Notice' })).not.toBeInTheDocument();
  });

  it('dismisses from a click and stays dismissed for the session', async () => {
    const { user } = render(<HeaderNoticeBanner />);
    act(() => {
      locationService.push('/?notice=Scheduled+maintenance');
    });

    await user.click(screen.getByRole('button', { name: 'Dismiss notice' }));
    expect(screen.queryByRole('region', { name: 'Notice' })).not.toBeInTheDocument();

    act(() => {
      locationService.push('/explore');
      locationService.push('/?notice=Scheduled+maintenance');
    });
    expect(screen.queryByRole('region', { name: 'Notice' })).not.toBeInTheDocument();
  });

  it('dismisses from the keyboard with Enter and Escape', async () => {
    const { user } = render(<HeaderNoticeBanner />);
    act(() => {
      locationService.push('/?notice=First+notice');
    });

    screen.getByRole('button', { name: 'Dismiss notice' }).focus();
    await user.keyboard('{Enter}');
    expect(screen.queryByRole('region', { name: 'Notice' })).not.toBeInTheDocument();

    act(() => {
      locationService.push('/?notice=Second+notice');
    });
    screen.getByRole('button', { name: 'Dismiss notice' }).focus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'Notice' })).not.toBeInTheDocument();
  });

  it('does not execute an XSS payload', () => {
    render(<HeaderNoticeBanner />);
    act(() => {
      locationService.push(
        '/?notice=' +
          encodeURIComponent(
            'Hi <img src=x onerror="window.__noticeXss=1"><script>window.__noticeXss=1</script> [x](javascript:alert(1))'
          )
      );
    });

    const region = screen.getByRole('region', { name: 'Notice' });
    expect(region).toHaveTextContent('Hi');
    expect(region.innerHTML).not.toMatch(/onerror/i);
    expect(region.innerHTML).not.toMatch(/<script/i);
    expect(region.innerHTML).not.toMatch(/javascript:/i);
    expect(window.__noticeXss).toBeUndefined();
  });
});

declare global {
  interface Window {
    __noticeXss?: number;
  }
}

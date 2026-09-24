import { getWrapper, renderHook, act } from 'test/test-utils';

import { config } from '@grafana/runtime';

import { AppChromeService } from '../AppChromeService';

import { setChromeNoticeHeight, useChromeHeaderHeight } from './useChromeHeaderHeight';

function renderHeaderHeight(chromeless: boolean) {
  const chrome = new AppChromeService();
  chrome.state.next({
    ...chrome.state.getValue(),
    chromeless,
    kioskMode: null,
    actions: undefined,
  });

  return renderHook(() => useChromeHeaderHeight(), {
    wrapper: getWrapper({ renderWithRouter: false, grafanaContext: { chrome } }),
  });
}

describe('useChromeHeaderHeight', () => {
  const previousToggles = {
    unifiedNavbars: config.featureToggles.unifiedNavbars,
    dashboardNewLayouts: config.featureToggles.dashboardNewLayouts,
  };

  beforeEach(() => {
    config.featureToggles.unifiedNavbars = false;
    config.featureToggles.dashboardNewLayouts = true;
    act(() => {
      setChromeNoticeHeight(0);
    });
  });

  afterEach(() => {
    config.featureToggles.unifiedNavbars = previousToggles.unifiedNavbars;
    config.featureToggles.dashboardNewLayouts = previousToggles.dashboardNewLayouts;
    act(() => {
      setChromeNoticeHeight(0);
    });
  });

  it('adds the header notice height to the sticky offset', () => {
    const { result } = renderHeaderHeight(false);

    // One header level at 48px while dashboardNewLayouts is on.
    expect(result.current).toBe(48);

    act(() => {
      setChromeNoticeHeight(28);
    });
    expect(result.current).toBe(76);

    act(() => {
      setChromeNoticeHeight(0);
    });
    expect(result.current).toBe(48);
  });

  it('ignores a leftover notice height when the header is hidden', () => {
    act(() => {
      setChromeNoticeHeight(28);
    });
    const { result } = renderHeaderHeight(true);

    expect(result.current).toBe(0);
  });
});

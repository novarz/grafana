import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ReducerID } from '@grafana/data';
import {
  CalculateFieldMode,
  WindowAlignment,
  WindowSizeMode,
  type CalculateFieldTransformerOptions,
} from '@grafana/data/internal';
import { mockComboboxRect } from '@grafana/test-utils';

import { WindowOptionsEditor } from './WindowOptionsEditor';

beforeAll(() => {
  mockComboboxRect();
});

function setup(jsx: JSX.Element) {
  return {
    user: userEvent.setup(),
    ...render(jsx),
  };
}

const defaultOptions: CalculateFieldTransformerOptions = {
  mode: CalculateFieldMode.WindowFunctions,
  window: {
    field: 'x',
    reducer: ReducerID.mean,
    windowAlignment: WindowAlignment.Trailing,
    windowSizeMode: WindowSizeMode.Fixed,
    windowSize: 2,
  },
};

describe('WindowOptionsEditor', () => {
  it('includes EMA in the calculation picker and selects it', async () => {
    const onChange = jest.fn();
    const { user } = setup(<WindowOptionsEditor options={defaultOptions} names={['x', 'y']} onChange={onChange} />);

    await user.click(screen.getByRole('combobox', { name: 'Calculation' }));

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /EMA/ })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('option', { name: /EMA/ }));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        ...defaultOptions,
        mode: CalculateFieldMode.WindowFunctions,
        window: {
          ...defaultOptions.window,
          reducer: ReducerID.ema,
        },
      });
    });
  });
});

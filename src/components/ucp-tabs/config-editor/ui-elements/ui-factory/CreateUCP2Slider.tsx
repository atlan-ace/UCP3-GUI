import {
  useConfigurationDefaults,
  useConfigurationLocks,
  useConfigurationReducer,
  useConfigurationSuggestions,
  useConfigurationWarnings,
  useSetConfigurationTouched,
} from 'hooks/jotai/globals-wrapper';

import { NumberContents, DisplayConfigElement } from 'config/ucp/common';

import { Form } from 'react-bootstrap';

import 'react-bootstrap-range-slider/dist/react-bootstrap-range-slider.css';
import RangeSlider from 'react-bootstrap-range-slider';

import { useState } from 'react';

import { useSetAtom } from 'jotai';
import { STATUS_BAR_MESSAGE_ATOM } from 'function/global/global-atoms';
import Logger from 'util/scripts/logging';
import { parseEnabledLogic } from '../enabled-logic';

import { formatToolTip } from '../tooltips';
import { createStatusBarMessage } from './StatusBarMessage';

const LOGGER = new Logger('CreateUCP2Slider.tsx');

export type UCP2SliderValue = { enabled: boolean; sliderValue: number };

function CreateUCP2Slider(args: {
  spec: DisplayConfigElement;
  disabled: boolean;
  className: string;
}) {
  const [configuration, setConfiguration] = useConfigurationReducer();
  const configurationWarnings = useConfigurationWarnings();
  const setConfigurationTouched = useSetConfigurationTouched();
  const configurationDefaults = useConfigurationDefaults();
  const configurationLocks = useConfigurationLocks();
  const configurationSuggestions = useConfigurationSuggestions();

  const { spec, disabled, className } = args;
  const { url, text, tooltip, enabled, header } = spec;
  const { contents } = spec;
  const { min, max, step } = contents as NumberContents;
  let { [url]: value } = configuration as {
    [url: string]: UCP2SliderValue;
  };
  const { [url]: defaultValue } = configurationDefaults as {
    [url: string]: UCP2SliderValue;
  };
  const isEnabled = parseEnabledLogic(
    enabled,
    configuration,
    configurationDefaults,
  );
  const fullToolTip = formatToolTip(tooltip, url);

  const hasWarning = configurationWarnings[url] !== undefined;
  const { hasHeader } = spec as DisplayConfigElement & {
    hasHeader: boolean;
  };

  if (value === undefined) {
    LOGGER.msg(`value not defined (no default specified?) for: ${url}`).error();

    if (defaultValue === undefined) {
      LOGGER.msg(`default value not defined for: ${url}`).error();
    }

    LOGGER.msg(`default value for ${url}: {}`, defaultValue).debug();
    value = defaultValue;
  }

  const statusBarMessage = createStatusBarMessage(
    disabled,
    !isEnabled,
    configurationLocks[url] !== undefined,
    enabled,
    configurationLocks[url],
    configurationSuggestions[url] !== undefined,
    configurationSuggestions[url],
  );
  const isDisabled =
    disabled || !isEnabled || configurationLocks[url] !== undefined;

  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  // eslint-disable-next-line react/jsx-no-useless-fragment
  let headerElement = <></>;
  if (hasHeader) {
    headerElement = (
      <Form.Switch>
        <Form.Switch.Input
          className="me-2"
          id={`${url}-header`}
          key={`${url}-header`}
          checked={
            value.enabled === undefined ? false : (value.enabled as boolean)
          }
          onChange={(event) => {
            setConfiguration({
              type: 'set-multiple',
              value: Object.fromEntries([
                [url, { ...value, ...{ enabled: event.target.checked } }],
              ]),
            });
            setConfigurationTouched({
              type: 'set-multiple',
              value: Object.fromEntries([[url, true]]),
            });
          }}
          disabled={isDisabled}
        />
        <Form.Switch.Label className="fs-6" htmlFor={`${url}-header`}>
          {header}
        </Form.Switch.Label>
      </Form.Switch>
    );
  }
  // eslint-disable-next-line no-nested-ternary
  const factor = 1 / (step === undefined ? 1 : step === 0 ? 1 : step);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [localValue, setLocalValue] = useState(
    value.sliderValue === undefined
      ? 0
      : (value.sliderValue as number) * factor,
  );
  return (
    <div
      className="col-5"
      style={{ marginLeft: 0, marginBottom: 0 }}
      onMouseEnter={() => {
        setStatusBarMessage(statusBarMessage);
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
    >
      {headerElement}
      <div>
        <label className="form-check-label" htmlFor={`${url}-slider`}>
          {!hasHeader && header}
          {text}
        </label>
      </div>
      <div className="row">
        <div className="col-auto">
          <Form.Label>{min}</Form.Label>
        </div>
        <div className="col">
          <RangeSlider
            min={min * factor}
            max={max * factor}
            step={step * factor}
            id={`${url}-slider`}
            size="sm"
            value={localValue}
            tooltipLabel={(currentValue) => (currentValue / factor).toString()}
            onChange={(event) => {
              setLocalValue(parseInt(event.target.value, 10));
            }}
            onAfterChange={(event) => {
              setConfiguration({
                type: 'set-multiple',
                value: Object.fromEntries([
                  [
                    url,
                    {
                      ...value,
                      ...{
                        sliderValue: parseInt(event.target.value, 10) / factor,
                      },
                    },
                  ],
                ]),
              });
              setConfigurationTouched({
                type: 'set-multiple',
                value: Object.fromEntries([[url, true]]),
              });
            }}
            disabled={
              !isEnabled ||
              disabled ||
              !value.enabled ||
              configurationLocks[url] !== undefined
            }
          />
        </div>

        <div className="col-auto">
          <Form.Label>{max}</Form.Label>
        </div>
      </div>
    </div>
  );
}

export default CreateUCP2Slider;

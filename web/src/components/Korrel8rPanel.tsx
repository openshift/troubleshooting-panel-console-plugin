import {
  Button,
  Divider,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  ExpandableSection,
  ExpandableSectionToggle,
  Spinner,
  Stack,
  StackItem,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Tooltip,
} from '@patternfly/react-core';

import {
  BanIcon,
  CogIcon,
  CubesIcon,
  ExclamationCircleIcon,
  RedoIcon,
} from '@patternfly/react-icons';
import { useQueryClient } from '@tanstack/react-query';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useFeature } from '../hooks/useFeatures';
import { useLocationQuery } from '../hooks/useLocationQuery';
import { usePluginAvailable } from '../hooks/usePluginAvailable';
import { GraphResult, useKorrel8rGraph } from '../korrel8r-client';
import * as korrel8r from '../korrel8r/types';
import { defaultSearch, Search, setSearch } from '../redux-actions';
import { State } from '../redux-reducers';
import * as time from '../time';
import { AdvancedSearchForm } from './AdvancedSearchForm';
import AgentMenu from './AgentMenu';
import './korrel8rpanel.css';
import { TimeRangeDropdown } from './TimeRangeDropdown';
import { Korrel8rTopology } from './topology/Korrel8rTopology';

export default function Korrel8rPanel() {
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  const dispatch = useDispatch();
  const locationQuery = useLocationQuery();
  const featureEnabled = useFeature('agent-navigation');

  const search: Search = useSelector((state: State) => state.plugins?.tp?.get('search'));

  // Compute constraint from search period and max results.
  const constraint = useMemo(() => {
    if (!search.period && !search.limit) {
      return undefined;
    }
    const [start, end] = search.period?.startEnd() ?? [undefined, undefined];
    return new korrel8r.Constraint({ start, end, limit: search.limit });
  }, [search.period, search.limit]);

  const { data, isError, error, isFetching, isPending, fetchStatus, refetch } = useKorrel8rGraph({
    search,
    constraint,
  });
  const isCancelled = !!search?.queryStr && isPending && fetchStatus === 'idle';
  const queryClient = useQueryClient();

  // Disable focus button if the panel is already focused on the current location,
  // or the current result is an error.
  const isFocused = useMemo(
    () => locationQuery?.toString() === search.queryStr && !isError,
    [locationQuery, search.queryStr, isError],
  );

  // Showing advanced query
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Dispatch a new search value, making a new reference (reducer clears result automatically).
  const dispatchSearch = useCallback(
    (search: Search) => dispatch(setSearch({ ...search })),
    [dispatch],
  );

  // Create the initial result on startup.
  // Use the current location or an explicit "Empty" result.
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (!search?.queryStr && !data) {
      if (locationQuery?.toString()) {
        dispatchSearch({ ...defaultSearch, queryStr: locationQuery.toString() });
      }
    }
  }, [locationQuery, dispatchSearch, search?.queryStr, data, t]);

  const advancedToggleID = 'query-toggle';
  const advancedContentID = 'query-content';

  return (
    <>
      <Stack>
        <Toolbar className="tp-plugin__panel-toolbar">
          <ToolbarContent>
            <ToolbarItem>
              <Tooltip
                content={
                  isFocused
                    ? t('Graph is already focused on the current view')
                    : locationQuery
                      ? t('Create a correlation graph starting from the current view')
                      : t('Current view does not support correlation')
                }
                position="bottom-start"
              >
                <Button
                  variant={isFocused ? 'secondary' : 'primary'}
                  isAriaDisabled={!locationQuery}
                  onClick={() => {
                    dispatchSearch({
                      ...search,
                      queryStr: locationQuery?.toString(),
                    });
                  }}
                >
                  {t('Focus')}
                </Button>
              </Tooltip>
            </ToolbarItem>

            <ToolbarItem>
              <Tooltip content={t('Advanced search parameters')} position="bottom-start">
                <ExpandableSectionToggle
                  contentId={advancedContentID}
                  toggleId={advancedToggleID}
                  isExpanded={showAdvanced}
                  onToggle={(on: boolean) => setShowAdvanced(on)}
                  aria-label={t('Advanced search parameters')}
                >
                  <CogIcon />
                </ExpandableSectionToggle>
              </Tooltip>
            </ToolbarItem>

            <ToolbarGroup align={{ default: 'alignCenter' }}>
              <ToolbarItem>
                <Tooltip content={t('Limit search to this time range')} position="bottom-start">
                  <TimeRangeDropdown
                    period={search.period ?? defaultSearch.period}
                    onChange={(period: time.Period) => dispatchSearch({ ...search, period })}
                  />
                </Tooltip>
              </ToolbarItem>
            </ToolbarGroup>

            <ToolbarGroup align={{ default: 'alignEnd' }}>
              {featureEnabled && (
                <ToolbarItem>
                  <Tooltip content={t('AI agent navigation')} position="bottom-end">
                    <AgentMenu />
                  </Tooltip>
                </ToolbarItem>
              )}
              <ToolbarItem>
                {isFetching ? (
                  <Button
                    variant="plain"
                    onClick={() => queryClient.cancelQueries({ queryKey: ['korrel8r', 'graph'] })}
                    aria-label={t('Cancel refresh')}
                  >
                    <BanIcon />
                  </Button>
                ) : (
                  <Tooltip content={t('Re-calculate the current graph')} position="bottom-end">
                    <Button
                      variant="plain"
                      isAriaDisabled={!search?.queryStr}
                      onClick={() => refetch()}
                      aria-label={t('Refresh')}
                    >
                      <RedoIcon />
                    </Button>
                  </Tooltip>
                )}
              </ToolbarItem>
            </ToolbarGroup>
          </ToolbarContent>
        </Toolbar>
        <ExpandableSection
          className="tp-plugin__panel-query-container"
          contentId={advancedContentID}
          toggleId={advancedToggleID}
          isExpanded={showAdvanced}
          isDetached
        >
          <AdvancedSearchForm
            search={search}
            onSearch={dispatchSearch}
            onClose={() => setShowAdvanced(false)}
          />
        </ExpandableSection>

        <Divider />

        <StackItem className="tp-plugin__panel-topology-container" isFilled={true}>
          <Topology
            isLoading={isFetching}
            result={data}
            constraint={constraint}
            error={error}
            isCancelled={isCancelled}
          />
        </StackItem>
      </Stack>
    </>
  );
}

interface TopologyProps {
  isLoading?: boolean;
  isCancelled?: boolean;
  result?: GraphResult;
  error?: Error;
  constraint?: korrel8r.Constraint;
}

const Topology: FC<TopologyProps> = ({ isLoading, result, constraint, error, isCancelled }) => {
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  const [loggingAvailable, loggingAvailableLoading] = usePluginAvailable('logging-view-plugin');
  const [netobserveAvailable, netobserveAvailableLoading] = usePluginAvailable('netobserv-plugin');

  if (isLoading || loggingAvailableLoading || netobserveAvailableLoading) {
    // korrel8r query is loading or the plugin checks are loading
    return <Searching />;
  }

  if (isCancelled) {
    return (
      <TopologyInfoState titleText={t('Canceled')} text={t('Search was interrupted')} isError />
    );
  }

  if (result?.graph?.nodes) {
    // Non-empty graph
    return (
      <Korrel8rTopology
        graph={result.graph}
        loggingAvailable={loggingAvailable}
        netobserveAvailable={netobserveAvailable}
        constraint={constraint}
      />
    );
  }

  if (error) {
    const titleText = error?.message ? t('Search Error') : t('Search Failed');
    const text = String(error?.message || error?.name || t('Unknown Error'));

    return (
      <TopologyInfoState
        titleText={titleText}
        // Only display first 400 characters of error to prevent repeating errors
        text={text.slice(0, 400)}
        isError
      />
    );
  }

  return (
    <TopologyInfoState
      titleText={result?.title || t('No Correlated Signals Found')}
      // Only display first 400 characters of error to prevent repeating errors
      text={result?.message ? result?.message.slice(0, 400) : t('No results.')}
    />
  );
};

const Searching: FC = () => {
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  return (
    <div className="tp-plugin__panel-topology-info">
      <EmptyState
        variant={EmptyStateVariant.sm}
        titleText={t('Searching')}
        headingLevel="h4"
        icon={Spinner}
      />
    </div>
  );
};

interface TopologyInfoStateProps {
  titleText: string;
  text: string;
  isError?: boolean;
}

const TopologyInfoState: FC<TopologyInfoStateProps> = ({ titleText, text, isError }) => {
  return (
    <div className="tp-plugin__panel-topology-info">
      <EmptyState
        variant={EmptyStateVariant.sm}
        titleText={titleText}
        headingLevel="h4"
        icon={isError ? ExclamationCircleIcon : CubesIcon}
        status={isError ? 'danger' : undefined}
      >
        <EmptyStateBody>{text}</EmptyStateBody>
      </EmptyState>
    </div>
  );
};

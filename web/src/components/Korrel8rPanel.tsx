import {
  Button,
  Divider,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  ExpandableSection,
  ExpandableSectionToggle,
  Flex,
  Spinner,
  Stack,
  StackItem,
  Tooltip,
} from '@patternfly/react-core';
import {
  CubesIcon,
  ExclamationCircleIcon,
  LinkIcon,
  SlidersHIcon,
  SyncIcon,
  UnlinkIcon,
} from '@patternfly/react-icons';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useLocationQuery } from '../hooks/useLocationQuery';
import { usePluginAvailable } from '../hooks/usePluginAvailable';
import * as korrel8r from '../korrel8r/types';
import { defaultSearch, Search, setSearch } from '../redux-actions';
import { State } from '../redux-reducers';
import * as time from '../time';
import { AdvancedSearchForm } from './AdvancedSearchForm';
import { TimeRangeDropdown } from './TimeRangeDropdown';
import { Korrel8rTopology } from './topology/Korrel8rTopology';
import './korrel8rpanel.css';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GraphResult, useKorrel8rGraph } from '../korrel8r-client';
import { useQueryClient } from '@tanstack/react-query';

export default function Korrel8rPanel() {
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  const dispatch = useDispatch();
  const locationQuery = useLocationQuery();

  const search: Search = useSelector((state: State) => state.plugins?.tp?.get('search'));

  // Compute constraint from search period.
  const constraint = useMemo(() => {
    if (!search.period) {
      return undefined;
    }
    const [start, end] = search.period.startEnd();
    return new korrel8r.Constraint({ start, end });
  }, [search.period]);

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
        <Flex
          className="tp-plugin__panel-toolbar"
          direction={{ default: 'row' }}
          flexWrap={{ default: 'wrap' }}
          alignItems={{ default: 'alignItemsCenter' }}
          spaceItems={{ default: 'spaceItemsXs' }}
        >
          <Tooltip
            position="bottom-start"
            content={
              locationQuery
                ? isFocused
                  ? t('Correlation graph is focused on the current view.')
                  : t('Focus the correlation on the current view.')
                : t('Current view does not provide a starting point for correlation')
            }
          >
            <Button
              className="tp-plugin__compact-control"
              isAriaDisabled={!locationQuery || isFocused}
              size="sm"
              onClick={() => {
                dispatchSearch({
                  ...defaultSearch,
                  queryStr: locationQuery?.toString(),
                  period: search?.period,
                });
              }}
              icon={isFocused ? <LinkIcon /> : <UnlinkIcon />}
            >
              {t('Focus')}
            </Button>
          </Tooltip>

          {/* Time range drop-down */}
          <Flex align={{ default: 'alignRight' }} spaceItems={{ default: 'spaceItemsNone' }}>
            <TimeRangeDropdown
              className="tp-plugin__compact-control"
              period={search.period ?? defaultSearch.period}
              onChange={(period: time.Period) => dispatchSearch({ ...search, period })}
            />
          </Flex>

          {/* Right aligned buttons */}
          <Flex align={{ default: 'alignRight' }} spaceItems={{ default: 'spaceItemsNone' }}>
            {/* Advanced search toggle */}
            <Tooltip content={t('Advanced search parameters')} position="bottom-end">
              <ExpandableSectionToggle
                contentId={advancedContentID}
                toggleId={advancedToggleID}
                isExpanded={showAdvanced}
                onToggle={(on: boolean) => setShowAdvanced(on)}
                aria-label={t('Advanced search parameters')}
              >
                <SlidersHIcon />
              </ExpandableSectionToggle>
            </Tooltip>

            {/* Refresh / Cancel button */}
            {isFetching ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => queryClient.cancelQueries({ queryKey: ['korrel8r', 'graph'] })}
                aria-label={t('Cancel')}
              >
                {t('Cancel')}
              </Button>
            ) : (
              <Tooltip content={t('Refresh the graph by re-running the current search.')}>
                <Button
                  variant="link"
                  size="sm"
                  isAriaDisabled={!search?.queryStr}
                  onClick={() => refetch()}
                  aria-label={t('Refresh')}
                >
                  <SyncIcon />
                </Button>
              </Tooltip>
            )}
          </Flex>
        </Flex>

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
    const text = error?.message || error?.name || 'Unknown Error';

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

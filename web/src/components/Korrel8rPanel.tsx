import {
  Button,
  Divider,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
  EmptyStateVariant,
  ExpandableSection,
  ExpandableSectionToggle,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Spinner,
  TextArea,
  Title,
  Tooltip,
} from '@patternfly/react-core';
import { CubesIcon, ExclamationCircleIcon, SyncIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { TFunction, Trans, useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useLocationQuery } from '../hooks/useLocationQuery';
import { usePluginAvailable } from '../hooks/usePluginAvailable';
import { getGoalsGraph, getNeighborsGraph } from '../korrel8r-client';
import { AlertDomain } from '../korrel8r/alert';
import { allDomains } from '../korrel8r/all-domains';
import * as api from '../korrel8r/client';
import * as korrel8r from '../korrel8r/types';
import {
  defaultSearch,
  Result,
  Search,
  SearchResult,
  SearchType,
  setPersistedSearch,
} from '../redux-actions';
import { State } from '../redux-reducers';
import * as time from '../time';
import { HelpPopover as FieldLevelHelp } from './HelpPopover';
import './korrel8rpanel.css';
import { SearchFormGroup } from './SearchFormGroup';
import TimeRangeFormGroup from './TimeRangeFormGroup';
import { Korrel8rTopology } from './topology/Korrel8rTopology';

export default function Korrel8rPanel() {
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  const searchResult: SearchResult = useSelector((state: State) => {
    return state.plugins?.tp?.get('persistedSearch');
  });
  const dispatch = useDispatch();

  const alertRules = useSelector((state: State) => state.observe?.get('rules'));
  const alertIDs = React.useMemo(() => {
    if (!alertRules) return new Map<string, string>();
    return new Map<string, string>(alertRules.map(({ id, name }) => [id, name]));
  }, [alertRules]);
  const domains = React.useMemo(
    () => new korrel8r.Domains(...allDomains, new AlertDomain(alertIDs)),
    [alertIDs],
  );
  const locationQuery = useLocationQuery(domains);

  // Search parameters.
  const [search, setSearch] = React.useState<Search>({
    ...defaultSearch, // Default search parameters.
    queryStr: locationQuery?.toString(), // Default query string from location.
    ...searchResult?.search, // Use persisted search if available.
  });
  // Search result
  const [result, setResult] = React.useState<Result | null>(searchResult?.result ?? null);
  // Showing advanced query
  const [showQuery, setShowQuery] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.debug('korrel8r search', search);
    const queryStr = search?.queryStr?.trim();
    const start: api.Start = {
      queries: queryStr ? [queryStr] : undefined,
      constraint: search?.constraint?.toAPI() ?? undefined,
    };
    let cancelled = false; // Detect if returned cleanup function was called.
    const onResult = (newResult: Result) => {
      if (!cancelled) {
        setResult(newResult);
        dispatch(setPersistedSearch({ search, result: newResult }));
      }
      // eslint-disable-next-line no-console
      console.debug('korrel8r result', newResult, 'cancelled', cancelled);
    };
    const fetch =
      search.type === SearchType.Goal
        ? getGoalsGraph({ start, goals: [search.goal] })
        : getNeighborsGraph({ start, depth: search.depth });
    fetch
      .then((response: api.Graph) => onResult({ graph: new korrel8r.Graph(response) }))
      .catch((e: api.ApiError) => {
        onResult({
          title: e?.body?.error ? t('Korrel8r Error') : t('Request Failed'),
          message: e?.body?.error || e.message || 'Unknown Error',
        });
      });
    return () => {
      cancelled = true;
      fetch.cancel();
    };
  }, [search, t, dispatch]);

  const queryToggleID = 'query-toggle';
  const queryContentID = 'query-content';
  const queryInputID = 'query-input';

  const runSearch = React.useCallback((newSearch: Search) => {
    // Update constraint from time period
    if (newSearch.period) {
      const [start, end] = newSearch.period.startEnd();
      newSearch.constraint = new korrel8r.Constraint({ ...newSearch.constraint, start, end });
    }
    newSearch.depth = Math.max(1, Math.min(newSearch.depth, 10));
    setSearch({ ...newSearch }); // Create a new search object to trigger useEffect
    setResult(null);
  }, []);

  const queryHelp = (
    <>
      <Title headingLevel="h4">
        {t('Query')}
        <FieldLevelHelp header={t('Query')}>
          <p>
            <Trans t={t}>
              Selects the starting point for correlation search. This query is set automatically by
              the <code>Focus</code> button. You can edit it manually to specify a custom query.
            </Trans>
          </p>
        </FieldLevelHelp>
      </Title>
    </>
  );

  const focusButton = (
    <Tooltip
      content={
        locationQuery
          ? t('Create a graph of items correlated from resources in the current page.')
          : t('The current page does not support correlation.')
      }
    >
      <Button
        isAriaDisabled={!locationQuery}
        onClick={() => {
          runSearch({
            ...defaultSearch,
            queryStr: locationQuery?.toString(),
            constraint: searchResult?.search?.constraint,
            period: searchResult?.search?.period,
          });
        }}
      >
        {t('Focus')}
      </Button>
    </Tooltip>
  );

  const advancedToggle = (
    <ExpandableSectionToggle
      contentId={queryContentID}
      toggleId={queryToggleID}
      isExpanded={showQuery}
      onToggle={(on: boolean) => {
        setShowQuery(on);
      }}
    >
      {t('Advanced')}
    </ExpandableSectionToggle>
  );

  const refreshButton = (
    <Tooltip content={t('Refresh the graph using the current settings')}>
      <Button
        isAriaDisabled={!search?.queryStr}
        onClick={() => {
          runSearch(search);
        }}
      >
        <SyncIcon />
      </Button>
    </Tooltip>
  );

  const advancedSection = (
    <ExpandableSection
      className="tp-plugin__panel-query-container"
      contentId={queryContentID}
      toggleId={queryToggleID}
      isExpanded={showQuery}
      isDetached
      isIndented
    >
      <Form>
        <TimeRangeFormGroup
          label={t('Time')}
          period={search.period}
          onChange={(period: time.Period): void => setSearch({ ...search, period })}
          t={t}
        />
        <SearchFormGroup
          label={t('Search Type')}
          search={search}
          onChange={(s: Search) => setSearch(s)}
          minDepth={1}
          maxDepth={100}
          t={t}
        />
        <FormGroup className="tp-plugin__panel-query-input" label={queryHelp}>
          <TextArea
            value={search.queryStr}
            onChange={(_event, value) => setSearch({ ...search, queryStr: value })}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                runSearch(search);
              }
            }}
            placeholder="domain:class:selector (shift-enter for new line)"
            id={queryInputID}
          />
        </FormGroup>
      </Form>
    </ExpandableSection>
  );

  const topologySection = (
    <Topology
      domains={domains}
      result={result}
      constraint={search.constraint}
      t={t}
      setSearch={setSearch}
    />
  );

  return (
    <>
      <Flex direction={{ default: 'column' }} grow={{ default: 'grow' }}>
        <Flex className="tp-plugin__panel-query-container" direction={{ default: 'row' }}>
          {focusButton}
          <FlexItem align={{ default: 'alignRight' }}>{advancedToggle}</FlexItem>
          {refreshButton}
        </Flex>
        <FlexItem>{advancedSection}</FlexItem>
        <Divider />
        <FlexItem className="tp-plugin__panel-topology-container" grow={{ default: 'grow' }}>
          {topologySection}
        </FlexItem>
      </Flex>
    </>
  );
}

interface TopologyProps {
  domains: korrel8r.Domains;
  result?: Result;
  constraint: korrel8r.Constraint;
  t: TFunction;
  setSearch: (search: Search) => void;
}

const Topology: React.FC<TopologyProps> = ({ domains, result, t, constraint }) => {
  const [loggingAvailable, loggingAvailableLoading] = usePluginAvailable('logging-view-plugin');
  const [netobserveAvailable, netobserveAvailableLoading] = usePluginAvailable('netobserv-plugin');

  if (!result || loggingAvailableLoading || netobserveAvailableLoading) {
    // korrel8r query is loading or the plugin checks are loading
    return <Loading />;
  }

  if (result?.graph?.nodes) {
    // Non-empty graph
    return (
      <Korrel8rTopology
        domains={domains}
        graph={result.graph}
        loggingAvailable={loggingAvailable}
        netobserveAvailable={netobserveAvailable}
        constraint={constraint}
      />
    );
  }

  return (
    <TopologyInfoState
      titleText={result.title || t('No Correlated Signals Found')}
      // Only display fisrt 400 characters of error to prevent repeating errors
      text={result.message ? result.message.slice(0, 400) : t('Correlation result was empty.')}
      isError={result.isError}
    />
  );
};

const Loading: React.FC = () => {
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  return (
    <div className="tp-plugin__panel-topology-info">
      <EmptyState variant={EmptyStateVariant.sm}>
        <EmptyStateHeader
          titleText={t('Loading')}
          headingLevel="h4"
          icon={<EmptyStateIcon icon={Spinner} />}
        />
      </EmptyState>
    </div>
  );
};

interface TopologyInfoStateProps {
  titleText: string;
  text: string;
  isError?: boolean;
}

const TopologyInfoState: React.FC<TopologyInfoStateProps> = ({ titleText, text, isError }) => {
  return (
    <div className="tp-plugin__panel-topology-info">
      <EmptyState variant={EmptyStateVariant.sm}>
        <EmptyStateHeader
          titleText={titleText}
          headingLevel="h4"
          icon={
            <EmptyStateIcon
              icon={isError ? ExclamationCircleIcon : CubesIcon}
              color={isError ? 'var(--pf-v5-global--danger-color--100)' : ''}
            />
          }
        />
        <EmptyStateBody>{text}</EmptyStateBody>
      </EmptyState>
    </div>
  );
};

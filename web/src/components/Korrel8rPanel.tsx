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
import { LoadingTopology } from './topology/LoadingTopology';

export default function Korrel8rPanel() {
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  const searchResult: SearchResult = useSelector((state: State) => {
    return state.plugins?.tp?.get('persistedSearch');
  });
  const dispatch = useDispatch();

  // State
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
  const [search, setSearch] = React.useState<Search>({
    ...defaultSearch, // Default search parameters.
    queryStr: locationQuery?.toString(), // Default query string.
    ...searchResult?.search, // Use persisted search if available.
  });
  const [result, setResult] = React.useState<Result | null>(searchResult?.result ?? null);
  const [showQuery, setShowQuery] = React.useState(false);

  const focusTip = t('Create a graph of correlated items from resources in the current view.');
  const cannotFocus = t('The current view does not support correlation.');

  React.useEffect(() => {
    // Set result = null to trigger a new client request, don't run the query till then.
    if (result !== null) {
      return;
    }
    if (!search?.queryStr && !locationQuery) {
      setResult({ message: cannotFocus });
      return;
    }
    // eslint-disable-next-line no-console
    console.debug('korrel8r search', search);
    const queryStr = search?.queryStr?.trim();
    const start: api.Start = {
      queries: queryStr ? [queryStr] : undefined,
      constraint: search?.constraint?.toAPI() ?? undefined,
    };
    const cancellableFetch =
      search.type === SearchType.Goal
        ? getGoalsGraph({ start, goals: [search.goal] })
        : getNeighborsGraph({ start, depth: search.depth });

    cancellableFetch
      .then((response: api.Graph) => {
        const result: Result = { graph: new korrel8r.Graph(response) };
        // eslint-disable-next-line no-console
        console.debug('korrel8r result', result);
        setResult(result);
        dispatch(setPersistedSearch({ search, result }));
      })
      .catch((e: api.ApiError) => {
        const result = {
          message: e.body?.error || e.message || 'Unknown Error',
          title: e?.body?.error ? t('Korrel8r Error') : t('Request Failed'),
        };
        // eslint-disable-next-line no-console
        console.debug('korrel8r result', result);
        setResult(result);
        dispatch(setPersistedSearch({ search, result }));
      });
    return () => cancellableFetch.cancel();
  }, [result, t, dispatch, search, cannotFocus, locationQuery]);

  const queryToggleID = 'query-toggle';
  const queryContentID = 'query-content';
  const queryInputID = 'query-input';

  const depthBounds = applyBounds(1, 10);

  const runSearch = React.useCallback(
    (newSearch: Search) => {
      // Update constraint from time period
      if (newSearch.period) {
        const [start, end] = newSearch.period.startEnd();
        newSearch.constraint = new korrel8r.Constraint({ ...newSearch.constraint, start, end });
      }
      newSearch.depth = depthBounds(newSearch.depth);
      newSearch.type = !newSearch.goal ? SearchType.Distance : newSearch.type;
      setSearch(newSearch);
      setResult(null);
    },
    [setResult, depthBounds],
  );

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

  return (
    <>
      <Flex className="tp-plugin__panel-query-container">
        <Tooltip content={locationQuery ? focusTip : cannotFocus}>
          <Button
            isAriaDisabled={!locationQuery}
            onClick={() =>
              runSearch({
                ...defaultSearch,
                queryStr: locationQuery?.toString(),
                constraint: searchResult?.search?.constraint,
                period: searchResult?.search?.period,
              })
            }
          >
            {t('Focus')}
          </Button>
        </Tooltip>

        <Flex align={{ default: 'alignRight' }}>
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
          <Tooltip content={t('Refresh the graph using the current settings')}>
            <Button isAriaDisabled={!search?.queryStr} onClick={() => runSearch(search)}>
              <SyncIcon />
            </Button>
          </Tooltip>
        </Flex>
      </Flex>

      {/* Expandable settings */}
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
      <Divider />
      <FlexItem className="tp-plugin__panel-topology-container" grow={{ default: 'grow' }}>
        <Topology
          domains={domains}
          result={result}
          constraint={search.constraint}
          t={t}
          setSearch={setSearch}
        />
      </FlexItem>
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

const Loading: React.FC = () => (
  <>
    <div className="tp-plugin__panel-topology-info">
      <div className={'co-m-loader co-an-fade-in-out tp-plugin__panel-topology-info'}>
        <div className="co-m-loader-dot__one" />
        <div className="co-m-loader-dot__two" />
        <div className="co-m-loader-dot__three" />
      </div>
    </div>
    <LoadingTopology />
  </>
);

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

const applyBounds = (min: number, max: number) => {
  return (val: number) => Math.max(min, Math.min(val, max));
};

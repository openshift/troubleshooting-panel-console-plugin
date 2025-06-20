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
  Tooltip,
} from '@patternfly/react-core';
import { CogIcon, CubesIcon, ExclamationCircleIcon, SyncIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { TFunction, useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useLocationQuery } from '../hooks/useLocationQuery';
import { usePluginAvailable } from '../hooks/usePluginAvailable';
import { getGoalsGraph, getNeighborsGraph } from '../korrel8r-client';
import * as api from '../korrel8r/client';
import * as korrel8r from '../korrel8r/types';
import { defaultSearch, Search, SearchType, setPersistedSearch } from '../redux-actions';
import { State } from '../redux-reducers';
import * as time from '../time';
import './korrel8rpanel.css';
import { SearchFormGroup } from './SearchFormGroup';
import TimeRangeFormGroup from './TimeRangeFormGroup';
import { Korrel8rTopology } from './topology/Korrel8rTopology';
import { LoadingTopology } from './topology/LoadingTopology';

type Result = {
  graph?: korrel8r.Graph;
  message?: string;
  title?: string;
  isError?: boolean;
};

export default function Korrel8rPanel() {
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  const persistedSearch = useSelector((state: State) => {
    return state.plugins?.tp?.get('persistedSearch');
  }) as Search;
  const dispatch = useDispatch();

  // State
  const locationQuery = useLocationQuery();
  const [search, setSearch] = React.useState<Search>(
    persistedSearch?.queryStr
      ? persistedSearch
      : ({
          ...defaultSearch,
          queryStr: locationQuery?.toString(),
          constraint: persistedSearch?.constraint,
        } as Search),
  );
  const [result, setResult] = React.useState<Result | null>(null);
  const [showQuery, setShowQuery] = React.useState(false);

  const focusTip = t('Create a graph starting from resources in the current view.');
  const cannotFocus = t('The current view does not support correlation.');

  React.useEffect(() => {
    // Set result = null to trigger a reload, don't run the query till then.
    if (result !== null) {
      return;
    }
    if (!search?.queryStr && !locationQuery) {
      setResult({ message: cannotFocus });
      return;
    }
    // eslint-disable-next-line no-console
    console.log('korrel8r search', search);
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
        setResult({ graph: new korrel8r.Graph(response) });
        // Only set the persisted search upon a successful query. It would be a
        // poor feeling to create a query that fails, and then be forced to rerun it
        // when opening the panel later
        dispatch(setPersistedSearch(search));
      })
      .catch((e: api.ApiError) => {
        setResult({
          message: e.body?.error || e.message || 'Unknown Error',
          title: e?.body?.error ? t('Korrel8r Error') : t('Request Failed'),
        });
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
      newSearch.type = !newSearch.goal ? SearchType.Neighbour : newSearch.type;
      setSearch(newSearch);
      setResult(null);
    },
    [setResult, depthBounds],
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
                constraint: persistedSearch?.constraint,
                period: persistedSearch?.period,
              })
            }
          >
            {t('Focus')}
          </Button>
        </Tooltip>

        <Flex align={{ default: 'alignRight' }}>
          <Tooltip content={t('Open graph query settings.')}>
            <ExpandableSectionToggle
              contentId={queryContentID}
              toggleId={queryToggleID}
              isExpanded={showQuery}
              onToggle={(on: boolean) => {
                setShowQuery(on);
              }}
            >
              <CogIcon />
            </ExpandableSectionToggle>
          </Tooltip>
          <Tooltip content={t('Refresh graph from current settings')}>
            <Button
              isAriaDisabled={!search?.queryStr}
              onClick={() => runSearch(search)}
              variant="secondary"
            >
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
          {/* FIXME Rename */}
          <TimeRangeFormGroup
            label={t('Time Range')}
            period={search.period}
            onChange={(period: time.Period): void => setSearch({ ...search, period })}
          />
          <SearchFormGroup
            label={t('Search Type')}
            search={search}
            onChange={(s: Search) => setSearch(s)}
            minDepth={1}
            maxDepth={100}
            t={t}
          />
          <FormGroup label={t('Query')} className="tp-plugin__panel-query-input">
            <Tooltip content={t('Query selecting start resources for correlation.')}>
              <TextArea
                value={search.queryStr}
                onChange={(_event, value) => setSearch({ ...search, queryStr: value })}
                placeholder="domain:class:selector"
                id={queryInputID}
              />
            </Tooltip>
          </FormGroup>
        </Form>
      </ExpandableSection>
      <Divider />
      <FlexItem className="tp-plugin__panel-topology-container" grow={{ default: 'grow' }}>
        <Topology result={result} constraint={search.constraint} t={t} setSearch={setSearch} />
      </FlexItem>
    </>
  );
}

interface TopologyProps {
  result?: Result;
  constraint: korrel8r.Constraint;
  t: TFunction;
  setSearch: (search: Search) => void;
}

const Topology: React.FC<TopologyProps> = ({ result, t, constraint }) => {
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

const applyBounds = (minValue: number, maxValue: number) => {
  return (val: number) => {
    if (!val || val < minValue) {
      return minValue;
    } else if (val > maxValue) {
      return maxValue;
    } else {
      return val;
    }
  };
};

//          {/* FIXME Tooltips or popovers uniformly */}

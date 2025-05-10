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
  NumberInput,
  Radio,
  TextArea,
  TextInput,
  Tooltip,
} from '@patternfly/react-core';
import { CubesIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
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
import DateTimeRangePicker from './DateTimeRangePicker';
import './korrel8rpanel.css';
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

  const cannotFocus = t('The current console page is not supported for correlation.');

  React.useEffect(() => {
    // Set result = null to trigger a reload, don't run the query till then.
    if (result !== null) {
      return;
    }
    if (!search?.queryStr && !locationQuery) {
      setResult({ message: cannotFocus });
      return;
    }
    // Make the search request
    const queryStr = search?.queryStr?.trim();
    const start: api.Start = { queries: queryStr ? [queryStr] : [] };
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
  const searchTypeOptions = 'search-type-options';

  // Handler for both 'start' and 'end' date/time changes
  const handleDateChange = (
    type: 'start' | 'end',
    newDate: Date,
    hour?: number,
    minute?: number,
  ): void => {
    // Adjust time if hour and minute are provided
    const updatedDate = new Date(newDate);
    if (hour !== undefined && minute !== undefined) {
      updatedDate.setHours(hour);
      updatedDate.setMinutes(minute);
    }

    // Update the constraint based on 'start' or 'end' type
    const updatedSearch = {
      ...search,
      constraint: new korrel8r.Constraint({
        ...search.constraint,
        [type]: updatedDate.toISOString(), // Update the corresponding date in search
      }),
    };

    setSearch(updatedSearch); // Update the search state with the new object
  };

  const focusTip = locationQuery
    ? t('Re-calculate the correlation graph starting from resources on the current console page.')
    : cannotFocus;
  const minDepth = 1;
  const maxDepth = 10;
  const depthBounds = applyBounds(1, 10);
  const runSearch = React.useCallback(
    (newSearch: Search) => {
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
        <Tooltip content={focusTip}>
          <Button
            isAriaDisabled={!locationQuery}
            onClick={() =>
              runSearch({
                ...defaultSearch,
                queryStr: locationQuery?.toString(),
                constraint: persistedSearch.constraint,
              })
            }
          >
            {t('Focus')}
          </Button>
        </Tooltip>
        <FlexItem align={{ default: 'alignRight' }}>
          <ExpandableSectionToggle
            contentId={queryContentID}
            toggleId={queryToggleID}
            isExpanded={showQuery}
            onToggle={(on: boolean) => setShowQuery(on)}
          >
            {showQuery ? t('Hide Query') : t('Show Query')}
          </ExpandableSectionToggle>
        </FlexItem>
      </Flex>
      <ExpandableSection
        contentId={queryContentID}
        toggleId={queryToggleID}
        isExpanded={showQuery}
        isDetached
        isIndented
      >
        {/* DateTimeRangePicker section with both date and time */}
        <Flex>
          <FlexItem>
            <b>{t('Date and Time Range')}</b>
            <DateTimeRangePicker
              // Pass the start date/time
              from={search.constraint?.start ? new Date(search.constraint.start) : null}
              // Pass the end date/time
              to={search.constraint?.end ? new Date(search.constraint.end) : null}
              onDateChange={handleDateChange} // Unified handler for both date and time changes
            />
          </FlexItem>
          <FlexItem>
            <b>{t('Korrel8 query selecting the starting points for correlation.')}</b>
            <TextArea
              className="tp-plugin__panel-query-input"
              placeholder="domain:class:querydata"
              id={queryInputID}
              value={search.queryStr}
              onChange={(_event, value) => setSearch({ ...search, queryStr: value })}
              resizeOrientation="vertical"
            />
          </FlexItem>
          <Flex>
            <Tooltip content={t('Show graph of connected classes up to the specified depth.')}>
              <Radio
                label={t('Neighbourhood depth: ')}
                name={searchTypeOptions}
                id="neighbourhood-option"
                isChecked={search.type === SearchType.Neighbour}
                onChange={(_: React.FormEvent, on: boolean) => {
                  on && setSearch({ ...search, type: SearchType.Neighbour });
                }}
              />
            </Tooltip>
            <NumberInput
              value={search.depth}
              min={minDepth}
              max={maxDepth}
              isDisabled={search.type !== SearchType.Neighbour}
              onPlus={() => setSearch({ ...search, depth: (search.depth || 0) + 1 })}
              onMinus={() =>
                (search.depth || 0) > minDepth && setSearch({ ...search, depth: search.depth - 1 })
              }
              onChange={(event: React.FormEvent<HTMLInputElement>) => {
                const n = Number((event.target as HTMLInputElement).value);
                setSearch({ ...search, depth: isNaN(n) ? 1 : n });
              }}
            />
          </Flex>
          <Flex>
            <Tooltip content={t('Show graph of paths to signals of the specified class.')}>
              <Radio
                label={t('Goal class: ')}
                name={searchTypeOptions}
                id="goal-option"
                isChecked={search.type === SearchType.Goal}
                onChange={(_: React.FormEvent, on: boolean) =>
                  on && setSearch({ ...search, type: SearchType.Goal })
                }
              />
            </Tooltip>
            <FlexItem>
              <TextInput
                value={search.goal}
                isDisabled={search.type !== SearchType.Goal}
                placeholder="domain:class"
                onChange={(event: React.FormEvent<HTMLInputElement>) => {
                  setSearch({ ...search, goal: (event.target as HTMLInputElement).value });
                }}
                aria-label="Korrel8r Query"
              />
            </FlexItem>
          </Flex>
        </Flex>
        <Button
          isAriaDisabled={!search?.queryStr}
          onClick={() => runSearch(search)}
          variant="secondary"
        >
          {t('Query')}
        </Button>
      </ExpandableSection>
      <Divider />
      <FlexItem className="tp-plugin__panel-topology-container" grow={{ default: 'grow' }}>
        <Topology result={result} t={t} setSearch={setSearch} />
      </FlexItem>
    </>
  );
}

interface TopologyProps {
  result?: Result;
  t: TFunction;
  setSearch: (search: Search) => void;
}

const Topology: React.FC<TopologyProps> = ({ result, t, setSearch }) => {
  const [loggingAvailable, loggingAvailableLoading] = usePluginAvailable('logging-view-plugin');
  const [netobserveAvailable, netobserveAvailableLoading] = usePluginAvailable('netobserv-plugin');

  if (!result || loggingAvailableLoading || netobserveAvailableLoading) {
    // korrel8r query is loading or the plugin checks are loading
    return <Loading />;
  }

  if (result.graph && result.graph.nodes) {
    // Non-empty graph
    return (
      <Korrel8rTopology
        graph={result.graph}
        loggingAvailable={loggingAvailable}
        netobserveAvailable={netobserveAvailable}
        setSearch={setSearch}
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

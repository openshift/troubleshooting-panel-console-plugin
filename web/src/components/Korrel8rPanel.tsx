import * as React from 'react';
import {
  Button,
  TextArea,
  TextInputGroup,
  Title,
  FlexItem,
  EmptyStateHeader,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  EmptyStateIcon,
} from '@patternfly/react-core';
import { Korrel8rTopology } from './Korrel8rTopology';
import './korrel8rpanel.css';
import { getNeighborsGraph } from '../korrel8r-client';
import { useDispatch, useSelector } from 'react-redux';
import { setQueryResponse, setQuery } from '../redux-actions';
import { State } from '../redux-reducers';
import { Korrel8rGraphNeighboursResponse } from '../korrel8r/query.types';
import { LoadingTopology } from './LoadingTopology';
import { useTranslation } from 'react-i18next';
import { useBoolean } from '../hooks/useBoolean';
import { CubesIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { usePluginAvailable } from '../hooks/usePluginAvailable';

interface Korrel8rPanelProps {
  initialQueryString: string;
}

export default function Korrel8rPanel({ initialQueryString }: Korrel8rPanelProps) {
  const [queryInputField, setQueryInputField] = React.useState(initialQueryString);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [errorMessageTitle, setErrorMessageTitle] = React.useState('');
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');

  // Start off loading on the first render since the usePluginAvailable hook is async and will start
  // loading immediately
  const [isLoading, , setLoadingTrue, setLoadingFalse] = useBoolean(true);
  const [netobserveAvailable, netobserveAvailableLoading] = usePluginAvailable('netobserv-plugin');
  const [loggingAvailable, loggingAvailableLoading] = usePluginAvailable('logging-view-plugin');

  const dispatch = useDispatch();
  const savedQuery: string = useSelector((state: State) => state.plugins?.tp?.get('query'));
  const queryResponse: Korrel8rGraphNeighboursResponse = useSelector((state: State) =>
    state.plugins?.tp?.get('queryResponse'),
  );

  if (!savedQuery && queryInputField) {
    dispatch(setQuery(queryInputField));
  }

  const handleError = React.useCallback(
    (error) => {
      // eslint-disable-next-line no-console
      console.error(error);
      setLoadingFalse();
      let displayError: string;
      try {
        displayError = JSON.parse(error.message).error;
        setErrorMessageTitle(t('Korrel8r Error'));
      } catch (e) {
        displayError = error.message;
        setErrorMessageTitle(t('Error Loading Data'));
      }
      setErrorMessage(displayError);
    },
    [setLoadingFalse, setErrorMessageTitle, setErrorMessage, t],
  );

  React.useEffect(() => {
    if (!savedQuery || netobserveAvailableLoading || loggingAvailableLoading) {
      return;
    }
    setLoadingTrue();
    const { request, abort } = getNeighborsGraph({ query: savedQuery });
    request()
      .then((response) => {
        const { existingEdges, existingNodes } = parseResults(
          response,
          netobserveAvailable,
          loggingAvailable,
        );

        dispatch(
          setQueryResponse({
            nodes: existingNodes,
            edges: existingEdges,
          }),
        );

        setErrorMessage('');
        setErrorMessageTitle('');
        setLoadingFalse();
      })
      .catch((error) => {
        handleError(error);
      });
    return () => {
      abort();
    };
  }, [
    savedQuery,
    dispatch,
    setLoadingFalse,
    setLoadingTrue,
    handleError,
    netobserveAvailable,
    loggingAvailable,
    setErrorMessage,
    setErrorMessageTitle,
    loggingAvailableLoading,
    netobserveAvailableLoading,
  ]);

  return (
    <>
      <FlexItem className="tp-plugin__panel-query-container">
        <Title headingLevel="h2">{t('Correlation Signals')}</Title>
        <TextInputGroup className="tp-plugin__panel-query-input">
          <TextArea
            type="text"
            id="queryString"
            name="queryString"
            value={queryInputField}
            autoResize
            onChange={(_event, value) => setQueryInputField(value)}
          />
        </TextInputGroup>
        <Button
          isAriaDisabled={!queryInputField}
          onClick={() => {
            if (queryInputField !== savedQuery) {
              dispatch(setQueryResponse({ nodes: [], edges: [] }));
              dispatch(setQuery(queryInputField));
            }
          }}
        >
          Query
        </Button>
      </FlexItem>
      <FlexItem className="tp-plugin__panel-topology-container" grow={{ default: 'grow' }}>
        {queryResponse.nodes.length > 0 && queryResponse.edges.length > 0 ? (
          <Korrel8rTopology queryNodes={queryResponse.nodes} queryEdges={queryResponse.edges} />
        ) : (
          <>
            {isLoading ? (
              <Loading />
            ) : (
              <div className="tp-plugin__panel-topology-info">
                {errorMessage ? (
                  <TopologyInfoState titleText={errorMessageTitle} text={errorMessage} isError />
                ) : (
                  <TopologyInfoState
                    titleText={t('No Correlation Signals Found')}
                    text={t(
                      'No correlation signals were found for the given query. Please try a different query.',
                    )}
                  />
                )}
              </div>
            )}
            <LoadingTopology />
          </>
        )}
      </FlexItem>
    </>
  );
}

const Loading: React.FC = () => (
  <div className={'co-m-loader co-an-fade-in-out tp-plugin__panel-topology-info'}>
    <div className="co-m-loader-dot__one" />
    <div className="co-m-loader-dot__two" />
    <div className="co-m-loader-dot__three" />
  </div>
);

interface TopologyInfoStateProps {
  titleText: string;
  text: string;
  isError?: boolean;
}

const TopologyInfoState: React.FunctionComponent<TopologyInfoStateProps> = ({
  titleText,
  text,
  isError,
}) => {
  return (
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
  );
};

const parseResults = (
  response: Korrel8rGraphNeighboursResponse,
  netobserveAvailable: boolean,
  loggingAvailable: boolean,
) => {
  let existingNodes = response.nodes.filter((node) => {
    return (
      node.count > 0 &&
      (netobserveAvailable || !node.class.startsWith('netflow')) &&
      (loggingAvailable || !node.class.startsWith('log'))
    );
  });
  existingNodes = existingNodes.map((node) => {
    return {
      class: node.class,
      count: node.count,
      queries: node.queries.filter((query) => query.count > 0),
    };
  });
  const existingNodeNames = existingNodes.map((node) => node.class);
  const existingEdges = response.edges
    ? response.edges.filter(
        (edge) => existingNodeNames.includes(edge.start) && existingNodeNames.includes(edge.goal),
      )
    : [];
  return { existingEdges, existingNodes };
};

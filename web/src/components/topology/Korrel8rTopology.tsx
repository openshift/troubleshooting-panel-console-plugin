import { ClusterIcon } from '@patternfly/react-icons';
import {
  action,
  BreadthFirstLayout,
  ComponentFactory,
  createTopologyControlButtons,
  defaultControlButtonsOptions,
  DefaultEdge,
  DefaultGroup,
  DefaultNode,
  EdgeStyle,
  Graph,
  GraphComponent,
  Model,
  ModelKind,
  Node,
  NodeShape,
  SELECTION_EVENT,
  TopologyControlBar,
  TopologyView,
  Visualization,
  VisualizationProvider,
  VisualizationSurface,
  withPanZoom,
  withSelection,
} from '@patternfly/react-topology';
import * as React from 'react';
import { TFunction, useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router';
import { nodeToLabel } from '../../korrel8r-utils';
import { InvalidNode } from '../../korrel8r/invalid';
import { Korrel8rNode } from '../../korrel8r/korrel8r.types';
import { Korrel8rNodeFactory } from '../../korrel8r/node-factory';
import { QueryEdge, QueryNode } from '../../korrel8r/query.types';
import { Query, QueryType } from '../../redux-actions';
import './korrel8rtopology.css';

interface Korrel8rTopologyNodeProps {
  element: Node;
  onSelect: () => void;
  selected: boolean;
}

type GraphNode = {
  id: string;
  type: string;
  label: string;
  width: number;
  height: number;
  shape: NodeShape;
  data: {
    korrel8rNode: Korrel8rNode;
    tooltip: string;
  };
};

type GraphEdge = {
  id: string;
  type: string;
  source: string;
  target: string;
  edgeStyle: EdgeStyle;
};

export enum NodeError {
  invalid = 'invalid',
  log = 'log',
  netflow = 'netflow',
}

const Korrel8rTopologyNode: React.FC<Korrel8rTopologyNodeProps> = ({
  element,
  selected,
  onSelect,
}) => {
  if (element.getData().tooltip) {
    return (
      <g opacity="0.7" className="tp-plugin__topology_invalid_node">
        <title>{element.getData().tooltip}</title>
        <DefaultNode element={element} selected={selected} onSelect={onSelect} hover={false}>
          <g transform={`translate(25, 25)`}>
            <ClusterIcon style={{ color: '#393F44' }} width={25} height={25} />
          </g>
        </DefaultNode>
      </g>
    );
  }

  return (
    <DefaultNode element={element} selected={selected} onSelect={onSelect}>
      <g transform={`translate(25, 25)`}>
        <ClusterIcon style={{ color: '#393F44' }} width={25} height={25} />
      </g>
    </DefaultNode>
  );
};

const baselineComponentFactory: ComponentFactory = (kind: ModelKind, type: string) => {
  switch (type) {
    case 'group':
      return DefaultGroup;
    default:
      switch (kind) {
        case ModelKind.graph:
          return withPanZoom()(GraphComponent);
        case ModelKind.node:
          return withSelection()(Korrel8rTopologyNode);
        case ModelKind.edge:
          return DefaultEdge;
        default:
          return undefined;
      }
  }
};

const NODE_SHAPE = NodeShape.ellipse;
const NODE_DIAMETER = 75;

const getErrorTooltip = (t: TFunction, error?: NodeError): string => {
  switch (error) {
    case NodeError.invalid:
      return t('Unable to find Console Link');
    case NodeError.log:
      return t('Logging Plugin Disabled');
    case NodeError.netflow:
      return t('Netflow Plugin Disabled');
    default:
      return '';
  }
};

const getNodesFromQueryResponse = (
  queryResponse: Array<QueryNode>,
  loggingAvailable: boolean,
  netobserveAvailable: boolean,
  t: TFunction,
): Array<GraphNode> => {
  const nodes: Array<GraphNode> = [];
  queryResponse.forEach((node) => {
    let korrel8rNode: Korrel8rNode;
    let error: NodeError;

    try {
      korrel8rNode = Korrel8rNodeFactory.fromQuery(node.queries.at(0)?.query);
    } catch (e) {
      korrel8rNode = InvalidNode.fromQuery(node.queries.at(0)?.query);
      // eslint-disable-next-line no-console
      console.error(e);
      error = NodeError.invalid;
    }

    if (node.class.startsWith('log') && !loggingAvailable) {
      korrel8rNode = InvalidNode.fromQuery(node.queries.at(0)?.query);
      error = NodeError.log;
    }
    if (node.class.startsWith('netflow') && !netobserveAvailable) {
      korrel8rNode = InvalidNode.fromQuery(node.queries.at(0)?.query);
      error = NodeError.netflow;
    }

    nodes.push({
      id: node.class + Date.now(),
      type: 'node',
      label: nodeToLabel(node),
      width: NODE_DIAMETER,
      height: NODE_DIAMETER,
      shape: NODE_SHAPE,
      data: {
        korrel8rNode,
        tooltip: getErrorTooltip(t, error),
      },
    });
  });
  return nodes;
};

const getEdgesFromQueryResponse = (
  queryResponse: Array<QueryEdge>,
  nodes: Array<GraphNode>,
): Array<GraphEdge> => {
  const edges: Array<GraphEdge> = [];

  queryResponse.forEach((edge) => {
    const sourceNode = nodes.find((node) => node.id.startsWith(edge.start));
    const targetNode = nodes.find((node) => node.id.startsWith(edge.goal));
    if (!sourceNode || !targetNode) {
      return;
    }
    edges.push({
      id: `edge-${edge.start}-${edge.goal}`,
      type: 'edge',
      source: sourceNode?.id,
      target: targetNode?.id,
      edgeStyle: EdgeStyle.default,
    });
  });
  return edges;
};

export const Korrel8rTopology: React.FC<{
  queryNodes: Array<QueryNode>;
  queryEdges: Array<QueryEdge>;
  loggingAvailable: boolean;
  netobserveAvailable: boolean;
  setQuery: (query: Query) => void;
}> = ({ queryNodes, queryEdges, loggingAvailable, netobserveAvailable, setQuery }) => {
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  const location = useLocation();
  const history = useHistory();

  const nodes = React.useMemo(
    () => getNodesFromQueryResponse(queryNodes, loggingAvailable, netobserveAvailable, t),
    [queryNodes, loggingAvailable, netobserveAvailable, t],
  );
  const edges = React.useMemo(
    () => getEdgesFromQueryResponse(queryEdges, nodes),
    [queryEdges, nodes],
  );

  const selectedIds = React.useMemo(() => {
    return nodes
      .filter((node) => {
        try {
          // This is less efficient, but there are certain plugins which add query params
          // to the URL that we don't want to match on
          const currentURL = location.pathname + location.search;
          const currentQuery = Korrel8rNodeFactory.fromURL(currentURL.slice(1))?.toQuery();
          return node.data.korrel8rNode.toQuery() === currentQuery;
        } catch (e) {
          return false;
        }
      })
      .map((node) => node.id);
  }, [nodes, location.pathname, location.search]);

  const selectionAction = React.useCallback(
    (selected: Array<string>) => {
      const newlySelectedNode = selected.find(
        (eachSelection) => !selectedIds.includes(eachSelection),
      );
      if (!newlySelectedNode) {
        return;
      }
      const node = nodes.find((node) => node.id.startsWith(newlySelectedNode));
      if (!node || node.data.tooltip) {
        return;
      }
      const korrel8rNode = node?.data?.korrel8rNode;
      if (!korrel8rNode) {
        return;
      }
      setQuery({
        query: korrel8rNode.toQuery(),
        queryType: QueryType.Neighbour,
        depth: 3,
        goal: null,
      });
      history.push('/' + korrel8rNode.toURL());
    },
    [history, nodes, selectedIds, setQuery],
  );

  const controller = React.useMemo(() => {
    const model: Model = {
      nodes,
      edges,
      graph: {
        id: 'korrel8r_graph',
        type: 'graph',
        layout: 'BreadthFirst',
      },
    };

    const newController = new Visualization();
    newController.registerLayoutFactory((_, graph: Graph) => new BreadthFirstLayout(graph));
    newController.registerComponentFactory(baselineComponentFactory);

    newController.fromModel(model, false);
    return newController;
  }, [nodes, edges]);

  const eventController = React.useMemo(() => {
    controller.addEventListener(SELECTION_EVENT, selectionAction);
    setTimeout(() => {
      // Center the graph on the next render tick once the graph elements have been sized and placed
      controller.getGraph().fit(30);
    }, 100); // FIXME this timeout is racy, need to reliably centre graph after layout is done.
    return controller;
  }, [controller, selectionAction]);

  return (
    <TopologyView
      controlBar={
        <TopologyControlBar
          controlButtons={createTopologyControlButtons({
            ...defaultControlButtonsOptions,
            zoomInCallback: action(() => {
              controller.getGraph().scaleBy(4 / 3);
            }),
            zoomOutCallback: action(() => {
              controller.getGraph().scaleBy(0.75);
            }),
            fitToScreenCallback: action(() => {
              controller.getGraph().fit(30);
            }),
            resetViewCallback: action(() => {
              controller.getGraph().reset();
              controller.getGraph().layout();
            }),
            legend: false,
          })}
        />
      }
    >
      <VisualizationProvider controller={eventController}>
        <VisualizationSurface state={{ selectedIds }} />
      </VisualizationProvider>
    </TopologyView>
  );
};

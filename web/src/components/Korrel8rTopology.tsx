import * as React from 'react';
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
import { ClusterIcon } from '@patternfly/react-icons';
import { QueryEdge, QueryNode } from '../korrel8r/query.types';
import { nodeToLabel } from '../korrel8r-utils';
import { Korrel8rNodeFactory } from '../korrel8r/node-factory';
import { useHistory, useLocation } from 'react-router';
import { Korrel8rNode } from '../korrel8r/korrel8r.types';

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
  };
};

type GraphEdge = {
  id: string;
  type: string;
  source: string;
  target: string;
  edgeStyle: EdgeStyle;
};

const Korrel8rTopologyNode: React.FC<Korrel8rTopologyNodeProps> = ({
  element,
  selected,
  onSelect,
}) => {
  return (
    <DefaultNode element={element} showStatusDecorator selected={selected} onSelect={onSelect}>
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

const getNodesFromQueryResponse = (queryResponse: Array<QueryNode>): Array<GraphNode> => {
  const nodes: Array<GraphNode> = [];
  queryResponse.forEach((node) => {
    let korrel8rNode: Korrel8rNode | null = null;
    try {
      korrel8rNode = Korrel8rNodeFactory.fromQuery(node.queries.at(0)?.query);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      return;
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
}> = ({ queryNodes, queryEdges }) => {
  const location = useLocation();
  const history = useHistory();

  const nodes = React.useMemo(() => getNodesFromQueryResponse(queryNodes), [queryNodes]);
  const edges = React.useMemo(
    () => getEdgesFromQueryResponse(queryEdges, nodes),
    [queryEdges, nodes],
  );

  const selectedIds = React.useMemo(() => {
    return nodes
      .filter(
        (node) => '/' + node.data.korrel8rNode?.toURL() === location.pathname + location.search,
      )
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
      if (!node) {
        return;
      }
      const url = nodes
        .find((node) => node.id.startsWith(newlySelectedNode))
        ?.data.korrel8rNode?.toURL();
      history.push('/' + url);
    },
    [history, nodes, selectedIds],
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
    }, 1);
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

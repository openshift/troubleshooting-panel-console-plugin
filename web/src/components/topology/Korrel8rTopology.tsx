import { Badge } from '@patternfly/react-core';
import { ClusterIcon } from '@patternfly/react-icons';
import {
  action,
  BadgeLocation,
  BreadthFirstLayout,
  ComponentFactory,
  ContextMenuItem,
  ControllerContext,
  createTopologyControlButtons,
  defaultControlButtonsOptions,
  DefaultEdge,
  DefaultGroup,
  DefaultNode,
  EdgeModel,
  EdgeStyle,
  ElementModel,
  Graph,
  GraphComponent,
  GraphElement,
  Model,
  ModelKind,
  Node,
  NodeModel,
  NodeShape,
  NodeStatus,
  SELECTION_EVENT,
  TopologyControlBar,
  TopologyView,
  Visualization,
  VisualizationProvider,
  VisualizationSurface,
  withContextMenu,
  WithContextMenuProps,
  withPanZoom,
  withSelection,
  WithSelectionProps,
} from '@patternfly/react-topology';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom-v5-compat';
import { allDomains } from '../../korrel8r/all-domains';
import * as korrel8r from '../../korrel8r/types';
import { Search, SearchType } from '../../redux-actions';
import { State } from '../../redux-reducers';
import './korrel8rtopology.css';

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : '');

const nodeLabel = (node: korrel8r.Node): string => {
  const c = node.class;
  if (!c) return `[${node.id}]`; // Original un-parsed class name.
  if (c.domain === c.name) return capitalize(c.domain);
  let name = c.name;
  if (c.domain === 'k8s') name = c.name.match(/^[^.]+/)?.[0] || name; // Kind without version
  return `${capitalize(c.domain)} ${capitalize(name)} `;
};

const nodeQueries = (node: korrel8r.Node) => node?.queries ?? [];

const nodeBadge = (node: korrel8r.Node): string => {
  const queries = nodeQueries(node);
  return `${queries.length > 1 ? `${queries[0]?.count}/` : ''}${node?.count ?? '?'}`;
};

type navigateToQueryFunc = (_: korrel8r.Query) => void;

const Korrel8rNode: React.FC<
  { element: Node<NodeModel, korrel8r.Node> } & WithContextMenuProps & WithSelectionProps
> = ({ element, onSelect, selected, onContextMenu, contextMenuOpen }) => {
  const controller = React.useContext(ControllerContext);
  const state = controller.getState<{ navigateToQuery: navigateToQueryFunc }>();
  const node = element.getData();
  const query = node?.queries?.[0]?.query; // Use the first query

  const topologyNode = (
    <DefaultNode
      element={element}
      onSelect={(e) => {
        onSelect(e);
        state.navigateToQuery(query);
      }}
      selected={selected}
      hover={false}
      onContextMenu={onContextMenu}
      contextMenuOpen={contextMenuOpen}
      label={nodeLabel(node)}
      badge={nodeBadge(node)}
      badgeLocation={BadgeLocation.below}
      nodeStatus={node.error ? NodeStatus.danger : NodeStatus.default}
      statusDecoratorTooltip={node.error || undefined}
      showStatusDecorator={!!node.error}
    >
      <g transform={`translate(25, 25)`}>
        <ClusterIcon style={{ color: '#393F44' }} width={25} height={25} />
      </g>
    </DefaultNode>
  );
  if (node.error) {
    // Gray out, add error tool tip
    return (
      <g opacity="0.7" className="tp-plugin__topology_invalid_node">
        <title>{node.error}</title>){topologyNode}
      </g>
    );
  }
  return topologyNode;
};

const NODE_SHAPE = NodeShape.ellipse;
const NODE_DIAMETER = 75;

export const Korrel8rTopology: React.FC<{
  graph: korrel8r.Graph;
  loggingAvailable: boolean;
  netobserveAvailable: boolean;
  setSearch: (search: Search) => void;
}> = ({ graph, loggingAvailable, netobserveAvailable, setSearch }) => {
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  const navigate = useNavigate();
  const persistedSearch = useSelector((state: State) =>
    state.plugins?.tp?.get('persistedSearch'),
  ) as Search;
  const [selectedIds, setSelectedIds] = React.useState([] as string[]);

  const nodes: NodeModel[] = React.useMemo(() => {
    return graph.nodes.map((node: korrel8r.Node) => {
      if (node.error) {
        // eslint-disable-next-line no-console
        console.error(node.error);
        node.error = t('Unable to find Console Link');
      } else if (node.class.domain === 'log' && !loggingAvailable) {
        node.error = t('Logging Plugin Disabled');
      } else if (node.class.domain === 'netflow' && !netobserveAvailable) {
        node.error = t('Netflow Plugin Disabled');
      }
      return {
        id: node.id,
        type: 'node',
        width: NODE_DIAMETER,
        height: NODE_DIAMETER,
        shape: NODE_SHAPE,
        data: node,
      };
    });
  }, [graph, loggingAvailable, netobserveAvailable, t]);

  const edges: EdgeModel[] = React.useMemo(() => {
    return graph.edges.map((edge: korrel8r.Edge) => {
      return {
        id: `edge:${edge.start.id}-${edge.goal.id}`,
        type: 'edge',
        source: edge.start.id,
        target: edge.goal.id,
        edgeStyle: EdgeStyle.default,
      };
    });
  }, [graph]);

  const navigateToQuery = React.useCallback(
    (query: korrel8r.Query) => {
      if (!query) return;
      try {
        const link = allDomains.queryToLink(query);
        setSearch({
          queryStr: query.toString(),
          type: SearchType.Neighbour,
          depth: 3,
          goal: undefined,
          constraint: persistedSearch.constraint,
        });
        navigate('/' + link);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('navigateToQuery ${query}: ', e);
      }
    },
    [navigate, setSearch, persistedSearch],
  );

  const nodeMenu = React.useCallback(
    (e: GraphElement<ElementModel, korrel8r.Node>): React.ReactElement[] => {
      const node = e.getData();
      return nodeQueries(node).map((qc) => (
        <ContextMenuItem
          key={qc.query.toString()}
          onClick={() => {
            setSelectedIds([node.id]);
            navigateToQuery(qc.query);
          }}
        >
          <Badge>{`${qc.count}`}</Badge> {`${qc.query.selector}`}
        </ContextMenuItem>
      ));
    },
    [setSelectedIds, navigateToQuery],
  );

  const componentFactory: ComponentFactory = React.useCallback(
    (kind: ModelKind, type: string) => {
      if (type === 'group') return DefaultGroup;
      switch (kind) {
        case ModelKind.graph:
          return withPanZoom()(GraphComponent);
        case ModelKind.node:
          return withContextMenu(nodeMenu)(withSelection()(Korrel8rNode));
        case ModelKind.edge:
          return DefaultEdge;
        default:
          return undefined;
      }
    },
    [nodeMenu],
  );

  const padding = 30;

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

    const controller = new Visualization();
    controller.registerLayoutFactory((_, graph: Graph) => new BreadthFirstLayout(graph));
    controller.registerComponentFactory(componentFactory);
    controller.fromModel(model, false);
    controller.addEventListener(SELECTION_EVENT, setSelectedIds);
    // Center the graph on the next render tick once the graph elements have been sized and placed
    // FIXME this is a hack, why doesn't setFitToScreenOnLayout work?
    setTimeout(() => {
      controller.getGraph().fit(padding);
    }, 100);
    return controller;
  }, [componentFactory, nodes, edges, setSelectedIds]);

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
              controller.getGraph().fit(padding);
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
      <VisualizationProvider controller={controller}>
        <VisualizationSurface state={{ navigateToQuery, selectedIds }} />
      </VisualizationProvider>
    </TopologyView>
  );
};

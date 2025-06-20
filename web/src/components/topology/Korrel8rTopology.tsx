import { Badge, Title } from '@patternfly/react-core';
import { ClusterIcon } from '@patternfly/react-icons';
import {
  action,
  BadgeLocation,
  BreadthFirstLayout,
  ComponentFactory,
  ContextMenuItem,
  createTopologyControlButtons,
  defaultControlButtonsOptions,
  DefaultEdge,
  DefaultGroup,
  DefaultNode,
  EdgeStyle,
  ElementModel,
  Graph,
  GraphComponent,
  GraphElement,
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
  withContextMenu,
  WithContextMenuProps,
  withPanZoom,
  withSelection,
  WithSelectionProps,
} from '@patternfly/react-topology';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom-v5-compat';
import { allDomains } from '../../korrel8r/all-domains';
import * as korrel8r from '../../korrel8r/types';
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

const nodeBadge = (node: korrel8r.Node): string => {
  const queries = nodeQueries(node);
  return `${queries.length > 1 ? `${queries[0]?.count}/` : ''}${node?.count ?? '?'}`;
};

const nodeQueries = (node: korrel8r.Node) => node?.queries ?? [];

interface Korrel8rTopologyNodeProps {
  element: Node;
}

const Korrel8rTopologyNode: React.FC<
  Korrel8rTopologyNodeProps & WithContextMenuProps & WithSelectionProps
> = ({ element, onSelect, selected, onContextMenu, contextMenuOpen }) => {
  const node = element.getData();
  const topologyNode = (
    <DefaultNode
      element={element}
      onSelect={onSelect}
      selected={selected}
      onContextMenu={onContextMenu}
      contextMenuOpen={contextMenuOpen}
      hover={false}
      label={nodeLabel(node)}
      badge={nodeBadge(node)}
      badgeLocation={BadgeLocation.below}
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
const PADDING = 30;

export const Korrel8rTopology: React.FC<{
  graph: korrel8r.Graph;
  reFit?: boolean;
  loggingAvailable: boolean;
  netobserveAvailable: boolean;
  constraint: korrel8r.Constraint;
}> = ({ graph, reFit, loggingAvailable, netobserveAvailable, constraint }) => {
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const nodes = React.useMemo(
    () =>
      graph.nodes.map((node: korrel8r.Node) => {
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
      }),
    [graph, loggingAvailable, netobserveAvailable, t],
  );

  const edges = React.useMemo(
    () =>
      graph.edges.map((edge: korrel8r.Edge) => {
        return {
          id: `edge:${edge.start.id}-${edge.goal.id}`,
          type: 'edge',
          source: edge.start.id,
          target: edge.goal.id,
          edgeStyle: EdgeStyle.default,
        };
      }),
    [graph],
  );

  const navigateToQuery = React.useCallback(
    (query: korrel8r.Query, constraint: korrel8r.Constraint) => {
      try {
        let link = allDomains.queryToLink(query, constraint)?.toString();
        if (!link) return;
        if (!link.startsWith('/')) link = '/' + link;
        // eslint-disable-next-line no-console
        console.log(
          'korrel8r navigate',
          '\nquery',
          query,
          '\nconstraint',
          constraint,
          '\nlink',
          link,
        );
        navigate(link);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`korrel8r navigateToQuery: ${e}`, '\nquery', query);
      }
    },
    [navigate],
  );

  const selectionAction = React.useCallback(
    (selected: Array<string>) => {
      const id = selected?.[0]; // Select only one at a time.
      setSelectedIds([id]);
      const node = graph.node(id);
      if (!node || node.error) return;
      navigateToQuery(node.queries?.[0]?.query, constraint);
    },
    [graph, navigateToQuery, setSelectedIds, constraint],
  );

  const nodeMenu = React.useCallback(
    (e: GraphElement<ElementModel, korrel8r.Node>): React.ReactElement[] => {
      const node = e.getData();
      const menu = [
        <ContextMenuItem isDisabled={true} key={node.class.toString()}>
          <Title headingLevel="h4">{node.class.toString()}</Title>
        </ContextMenuItem>,
      ];
      nodeQueries(node).forEach((qc) =>
        menu.push(
          <ContextMenuItem
            key={qc.query.toString()}
            onClick={() => {
              navigateToQuery(qc.query, constraint);
              setSelectedIds([node.id]);
              navigator.clipboard.writeText(qc.query.toString());
            }}
            icon={<Badge>{`${qc.count}`}</Badge>}
          >
            {`${qc.query.selector}`}
          </ContextMenuItem>,
        ),
      );
      return menu;
    },
    [navigateToQuery, setSelectedIds, constraint],
  );

  const componentFactory: ComponentFactory = React.useCallback(
    (kind: ModelKind, type: string) => {
      if (type === 'group') return DefaultGroup;
      switch (kind) {
        case ModelKind.graph:
          return withPanZoom()(GraphComponent);
        case ModelKind.node:
          return withContextMenu(nodeMenu)(withSelection()(Korrel8rTopologyNode));
        case ModelKind.edge:
          return DefaultEdge;
        default:
          return undefined;
      }
    },
    [nodeMenu],
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

    const controller = new Visualization();
    controller.registerLayoutFactory((_, graph: Graph) => new BreadthFirstLayout(graph));
    controller.fromModel(model, false);
    return controller;
  }, [nodes, edges]);

  // NOTE: For some reason, the controller function above cannot depend on memoized functions
  // like selectionAction or componentfactory. Using a separate memo works. Strange.
  // The Visualization below must depend on controller 2.
  const controller2 = React.useMemo(() => {
    controller.addEventListener(SELECTION_EVENT, selectionAction);
    controller.registerComponentFactory(componentFactory);
    controller.setFitToScreenOnLayout(true, PADDING);
    return controller;
  }, [controller, selectionAction, componentFactory]);

  if (reFit) controller2.getGraph().fit(PADDING);

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
              controller.getGraph().fit(PADDING);
            }),
            legend: false,
          })}
        />
      }
    >
      <VisualizationProvider controller={controller2}>
        <VisualizationSurface state={{ selectedIds }} />
      </VisualizationProvider>
    </TopologyView>
  );
};

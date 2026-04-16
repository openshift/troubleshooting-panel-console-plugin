import { Badge, Title } from '@patternfly/react-core';
import {
  action,
  ComponentFactory,
  ContextMenuItem,
  createTopologyControlButtons,
  DagreLayout,
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
  TOP_TO_BOTTOM,
  TopologyControlBar,
  TopologyView,
  Visualization,
  VisualizationProvider,
  VisualizationSurface,
  withContextMenu,
  WithContextMenuProps,
  withDragNode,
  WithDragNodeProps,
  withPanZoom,
  withSelection,
  WithSelectionProps,
} from '@patternfly/react-topology';
import { useTranslation } from 'react-i18next';
import { useNavigateToQuery } from '../../hooks/useNavigateToQuery';
import * as korrel8r from '../../korrel8r/types';
import { getIcon } from '../icons';
import './korrel8rtopology.css';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';

// DagreLayout with straight edges (no angular bendpoints).
class StraightEdgeDagreLayout extends DagreLayout {
  protected updateEdgeBendpoints(): void {
    // no-op: skip bendpoints for straight edges between nodes.
  }
}

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : '');

const nodeLabel = (node: korrel8r.Node): string => {
  const c = node.class;
  if (!c) return `[${node.id}]`; // Original un-parsed class name.
  if (c.domain === 'k8s') return c.name.replace(/\..*$/, ''); // Strip group/version
  return capitalize(c.name);
};

interface Korrel8rTopologyNodeProps {
  element: Node;
}

const Korrel8rTopologyNode: FC<
  Korrel8rTopologyNodeProps & WithContextMenuProps & WithSelectionProps & WithDragNodeProps
> = ({ element, onSelect, selected, onContextMenu, contextMenuOpen, dragNodeRef }) => {
  const node = element.getData();
  const topologyNode = (
    <DefaultNode
      element={element}
      onSelect={onSelect}
      selected={selected}
      onContextMenu={onContextMenu}
      contextMenuOpen={contextMenuOpen}
      dragNodeRef={dragNodeRef}
      hover={false}
      label={nodeLabel(node)}
      badge={node?.count?.toString() ?? '?'}
      badgeClassName="tp-plugin__topology_node_badge"
      hideContextMenuKebab={node?.queries?.length === 1}
    >
      <g transform={`translate(25, 25)`}>{getIcon(node.class)}</g>
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

export const Korrel8rTopology: FC<{
  graph: korrel8r.Graph;
  loggingAvailable: boolean;
  netobserveAvailable: boolean;
  constraint: korrel8r.Constraint;
}> = ({ graph, loggingAvailable, netobserveAvailable, constraint }) => {
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  const navigateToQuery = useNavigateToQuery();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const nodes = useMemo(
    () =>
      graph.nodes.map((node: korrel8r.Node) => {
        const newNode = { ...node };
        if (newNode.error) {
          // eslint-disable-next-line no-console
          console.warn(`korrel8r node: ${newNode.error}`);
          newNode.error = Error(t('Unable to find Console Link'));
        } else if (newNode.class.domain === 'log' && !loggingAvailable) {
          newNode.error = Error(t('Logging Plugin Disabled'));
        } else if (newNode.class.domain === 'netflow' && !netobserveAvailable) {
          newNode.error = Error(t('Netflow Plugin Disabled'));
        }
        return {
          id: newNode.id,
          type: 'node',
          width: NODE_DIAMETER,
          height: NODE_DIAMETER,
          shape: NODE_SHAPE,
          data: newNode,
        };
      }),
    [graph, loggingAvailable, netobserveAvailable, t],
  );

  const edges = useMemo(
    () =>
      graph.edges.map((edge: korrel8r.Edge) => {
        return {
          id: `edge:${edge.start.id} -${edge.goal.id} `,
          type: 'edge',
          source: edge.start.id,
          target: edge.goal.id,
          edgeStyle: EdgeStyle.default,
        };
      }),
    [graph],
  );

  const selectionAction = useCallback(
    (selected: Array<string>) => {
      const id = selected?.[0]; // Select only one at a time.
      setSelectedIds([id]);
      const node = graph.node(id);
      if (!node || node.error) return;
      navigateToQuery(node.queries?.[0]?.query, constraint);
    },
    [graph, navigateToQuery, setSelectedIds, constraint],
  );

  const nodeMenu = useCallback(
    (e: GraphElement<ElementModel, korrel8r.Node>): React.ReactElement[] => {
      const node = e.getData();
      const menu = [
        <ContextMenuItem isDisabled={true} key={node.class.toString()}>
          <Title headingLevel="h4">{node.class.toString()}</Title>
        </ContextMenuItem>,
      ];
      node?.queries?.forEach((qc) =>
        menu.push(
          <ContextMenuItem
            key={qc.query.toString()}
            onClick={() => {
              navigateToQuery(qc.query, constraint);
              setSelectedIds([node.id]);
              navigator.clipboard.writeText(qc.query.toString());
            }}
            icon={<Badge>{`${qc.count} `}</Badge>}
          >
            {`${qc.query.selector} `}
          </ContextMenuItem>,
        ),
      );
      return menu;
    },
    [navigateToQuery, setSelectedIds, constraint],
  );

  const componentFactory: ComponentFactory = useCallback(
    (kind: ModelKind, type: string) => {
      if (type === 'group') return DefaultGroup;
      switch (kind) {
        case ModelKind.graph:
          return withPanZoom()(GraphComponent);
        case ModelKind.node:
          return withDragNode()(withContextMenu(nodeMenu)(withSelection()(Korrel8rTopologyNode)));
        case ModelKind.edge:
          return DefaultEdge;
        default:
          return undefined;
      }
    },
    [nodeMenu],
  );

  const controller = useMemo(() => {
    const model: Model = {
      nodes,
      edges,
      graph: {
        id: 'korrel8r_graph',
        type: 'graph',
        layout: 'Dagre',
      },
    };

    const controller = new Visualization();
    controller.registerLayoutFactory(
      (_, graph: Graph) =>
        new StraightEdgeDagreLayout(graph, {
          rankdir: TOP_TO_BOTTOM,
          ranksep: 10,
          nodeDistance: 15,
        }),
    );
    controller.fromModel(model, false);
    return controller;
  }, [nodes, edges]);

  // NOTE: For some reason, the controller function above cannot depend on memoized functions
  // like selectionAction or componentfactory. Using a separate memo works. Strange.
  // The Visualization below must depend on controller 2.
  const controller2 = useMemo(() => {
    controller.addEventListener(SELECTION_EVENT, selectionAction);
    controller.registerComponentFactory(componentFactory);
    controller.setFitToScreenOnLayout(true, PADDING);
    return controller;
  }, [controller, selectionAction, componentFactory]);

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    let timer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => controller.getGraph().fit(PADDING), 150);
    });
    observer.observe(element);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [controller]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
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
              resetViewCallback: action(() => {
                controller.getGraph().reset();
                controller.getGraph().layout();
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
    </div>
  );
};

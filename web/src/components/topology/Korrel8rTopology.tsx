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
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom-v5-compat';
import { allDomains } from '../../korrel8r/all-domains';
import * as korrel8r from '../../korrel8r/types';
import { Search, SearchType } from '../../redux-actions';
import { State } from '../../redux-reducers';
import './korrel8rtopology.css';

interface Korrel8rTopologyNodeProps {
  element: Node;
  onSelect: () => void;
  selected: boolean;
}

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
        <title>{element.getData().error}</title>
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

const nodeLabel = (node: korrel8r.Node): string => {
  const c = node.class;
  if (!c) return `[${node.api.class}]`; // Original un-parsed class name.
  if (c.domain === c.name) return capitalize(c.domain);
  let name = c.name;
  if (c.domain === 'k8s') name = c.name.match(/^[^.]+/)?.[0] || name; // Kind without version
  return `${capitalize(c.domain)} ${capitalize(name)} `;
};

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : '');

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
          label: `${nodeLabel(node)} (${node.api.count})`,
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

  const selectionAction = React.useCallback(
    (selected: Array<string>) => {
      const id = selected?.[0]; // Select only one at a time.
      const node = graph.node(id);
      if (!node || node.error) return;
      const qc = node.queries?.[0];
      try {
        const link = allDomains.queryToLink(qc.query); // FIXME error
        setSearch({
          queryStr: qc.query.toString(),
          type: SearchType.Neighbour,
          depth: 3,
          goal: null,
          constraint: persistedSearch.constraint,
        });
        navigate('/' + link);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('queryToLink failed: ', e);
      }
    },
    [graph, navigate, setSearch, persistedSearch],
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
        <VisualizationSurface />
      </VisualizationProvider>
    </TopologyView>
  );
};

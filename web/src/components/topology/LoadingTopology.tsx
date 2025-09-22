import {
  action,
  BreadthFirstLayout,
  ComponentFactory,
  createTopologyControlButtons,
  defaultControlButtonsOptions,
  DefaultEdge,
  DefaultGroup,
  DefaultNode,
  Graph,
  GraphComponent,
  Model,
  ModelKind,
  TopologyControlBar,
  TopologyView,
  Visualization,
  VisualizationProvider,
  VisualizationSurface,
} from '@patternfly/react-topology';
import * as React from 'react';

const baselineComponentFactory: ComponentFactory = (kind: ModelKind, type: string) => {
  switch (type) {
    case 'group':
      return DefaultGroup;
    default:
      switch (kind) {
        case ModelKind.graph:
          return GraphComponent;
        case ModelKind.node:
          return DefaultNode;
        case ModelKind.edge:
          return DefaultEdge;
        default:
          return undefined;
      }
  }
};

export const LoadingTopology: React.FC = () => {
  const controller = React.useMemo(() => {
    const model: Model = {
      nodes: [],
      edges: [],
      graph: {
        id: 'korrel8r_loading_graph',
        type: 'graph',
        layout: 'BreadthFirst',
      },
    };

    const newController = new Visualization();
    newController.registerLayoutFactory((_, graph: Graph) => new BreadthFirstLayout(graph));
    newController.registerComponentFactory(baselineComponentFactory);

    newController.fromModel(model, false);
    return newController;
  }, []);

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
              controller.getGraph().fit(30);
            }),
            legend: false,
            zoomInDisabled: true,
            zoomOutDisabled: true,
            fitToScreenDisabled: true,
            resetViewDisabled: true,
          })}
        />
      }
    >
      <VisualizationProvider controller={controller}>
        <VisualizationSurface />
      </VisualizationProvider>
    </TopologyView>
  );
};

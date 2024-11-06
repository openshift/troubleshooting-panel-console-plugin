import { AlertNode } from './alert';
import { InvalidNode } from './invalid';
import { K8sNode } from './k8s';
import { Korrel8rNode, WrongDomainError } from './korrel8r.types';
import { LogNode } from './log';
import { MetricNode } from './metric';
import { NetflowNode } from './netflow';
import { TraceNode } from './trace';

const urlLookup = [
  AlertNode.fromURL,
  K8sNode.fromURL,
  LogNode.fromURL,
  MetricNode.fromURL,
  NetflowNode.fromURL,
  TraceNode.fromURL,
];

const queryLookup = {
  alert: AlertNode.fromQuery,
  k8s: K8sNode.fromQuery,
  log: LogNode.fromQuery,
  metric: MetricNode.fromQuery,
  netflow: NetflowNode.fromQuery,
  trace: TraceNode.fromQuery,
};

export class Korrel8rNodeFactory {
  static fromURL(url: string): Korrel8rNode {
    for (const lookup of urlLookup) {
      try {
        return lookup(url);
      } catch (e) {
        if (!(e instanceof WrongDomainError)) {
          throw e;
        }
      }
    }
    return InvalidNode.fromURL(url);
  }

  static fromQuery(query: string): Korrel8rNode {
    const fromQuery = queryLookup[query.split(':').at(0)];
    if (fromQuery) return fromQuery(query);
    return InvalidNode.fromQuery(query);
  }
}

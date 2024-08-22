import { Korrel8rDomain, Korrel8rNode, NodeError } from './korrel8r.types';
import { parseQuery, parseURL } from './query-url';

enum LogClass {
  application = 'application',
  infrastructure = 'infrastructure',
  audit = 'audit',
}

const addJSON = (logQL: string): string => {
  return logQL.match(/\|json/) ? logQL : logQL + '|json';
};

export class LogNode extends Korrel8rNode {
  domain: Korrel8rDomain = Korrel8rDomain.Alert;
  logClass: LogClass;
  query: string;
  url: string;

  constructor(url: string, query: string, logClass: LogClass) {
    super();
    this.query = query;
    this.url = url;
    this.logClass = logClass;
  }

  // There are 2 types of URL: pod logs, and log search.
  static fromURL(url: string): Korrel8rNode {
    // First check for aggregated pod logs URL
    const [, namespace, name] = url.match(/k8s\/ns\/([^/]+)\/pods\/([^/]+)\/aggregated-logs/) || [];
    if (namespace && name) {
      const logClass = namespace.match(/^kube|^openshift-/)
        ? LogClass.infrastructure
        : LogClass.application;
      return new LogNode(
        url,
        `log:${logClass}:{kubernetes_namespace_name="${namespace}",` +
          `kubernetes_pod_name="${name}"}|json`,
        logClass,
      );
    }
    // Search URL
    const [, params] = parseURL('log', 'monitoring/logs', url) || [];
    const logQL = params.get('q');
    const logClassStr =
      params.get('tenant') || logQL?.match(/{[^}]*log_type(?:=~?)"([^"]+)"/)?.at(1);
    const logClass = LogClass[logClassStr as keyof typeof LogClass];
    if (!logClass) throw new NodeError(`No log class found in URL: ${url}`);
    return new LogNode(url, `log:${logClass}:${addJSON(logQL)}`, logClass);
  }

  static fromQuery(query: string): Korrel8rNode {
    const [clazz, logQL] = parseQuery('log', query);
    const logClass = LogClass[clazz as keyof typeof LogClass];
    if (!logClass) throw new NodeError(`Expected log class in query: ${query}`);
    return new LogNode(
      `monitoring/logs?q=${encodeURIComponent(`${addJSON(logQL)}`)}&tenant=${logClass}`,
      query,
      logClass,
    );
  }

  toURL(): string {
    return this.url;
  }

  toQuery(): string {
    return this.query;
  }
}

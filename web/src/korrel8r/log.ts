import { Class, Constraint, Domain, Query, unixMilliseconds, URIRef } from './types';

enum LogClass {
  application = 'application',
  infrastructure = 'infrastructure',
  audit = 'audit',
}

export class LogDomain extends Domain {
  constructor() {
    super('log');
  }

  class(name: string): Class {
    if (!LogClass[name]) throw this.badClass(name);
    return new Class(this.name, name);
  }

  // There are 2 types of URL: pod logs, and log search.
  linkToQuery(link: URIRef): Query {
    // First check for aggregated pod logs URL
    const [, namespace, name] =
      link.pathname.match(/k8s\/ns\/([^/]+)\/pods\/([^/]+)\/aggregated-logs/) || [];
    if (namespace && name) {
      const logClass = namespace.match(/^kube|^openshift-/)
        ? LogClass.infrastructure
        : LogClass.application;
      return new Query(
        this.class(logClass),
        `{kubernetes_namespace_name="${namespace}",kubernetes_pod_name="${name}"}`,
      );
    }
    // Assume this is a search URL
    const logQL = link.searchParams.get('q');
    const logClassStr =
      link.searchParams.get('tenant') || logQL?.match(/{[^}]*log_type(?:=~?)"([^"]+)"/)?.at(1);
    const logClass = LogClass[logClassStr as keyof typeof LogClass];
    if (!logClass) throw this.badLink(link);
    return this.class(logClass).query(logQL);
  }

  queryToLink(query: Query, constraint?: Constraint): URIRef {
    const logClass = LogClass[query.class.name as keyof typeof LogClass];
    if (!logClass) throw this.badQuery(query, 'unknown class');
    return new URIRef('monitoring/logs', {
      q: query.selector,
      tenant: logClass,
      start: unixMilliseconds(constraint?.start),
      end: unixMilliseconds(constraint?.end),
    });
  }
}

import { Class, Constraint, Domain, Query, unixMilliseconds, URIRef } from './types';

enum LogClass {
  application = 'application',
  infrastructure = 'infrastructure',
  audit = 'audit',
}

// TODO: Aggregated log links and k8s:pod style log queries ignore the containers parameter.

export class LogDomain extends Domain {
  constructor() {
    super('log');
  }

  class(name: string): Class {
    if (!LogClass[name]) throw this.badClass(name);
    return new Class(this.name, name);
  }

  // There are 2 types of URL: pod logs, and logQL searches.
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
      // Try to translate as a direct pod selector, otherwise use as logQL query
      q: directToLogQL(query.selector) || query.selector,
      tenant: logClass,
      start: unixMilliseconds(constraint?.start),
      end: unixMilliseconds(constraint?.end),
    });
  }
}

/**
 * Converts a string to a legal Loki label name by replacing illegal characters with underscores.
 * Loki label names must match the regex [a-zA-Z_:][a-zA-Z0-9_:]*
 * @param input - The input string to sanitize
 * @returns A sanitized string safe for use as a Loki label name
 */
export const cleanLokiLabel = (input: string): string => {
  if (!input) return '_';
  // Replace any character that's not alphanumeric, underscore, or colon with underscore
  const sanitized = input.replace(/[^a-zA-Z0-9_:]/g, '_');
  // Ensure the first character is valid (letter, underscore, or colon)
  if (!/^[a-zA-Z_:]/.test(sanitized)) {
    return '_' + sanitized;
  }
  return sanitized;
};

const directToLogQL = (maybeDirect: string): string | undefined => {
  try {
    // Try to parse the selector as k8s pod selector, and translate to logQL.
    const direct = JSON.parse(maybeDirect);
    if (!direct || typeof direct !== 'object') return undefined;
    const streams = [
      direct?.namespace && `kubernetes_namespace_name="${direct.namespace}"`,
      direct?.name && `kubernetes_pod_name="${direct.name}"`,
    ]
      .filter((x) => x)
      .join(',');
    const pipeline =
      direct?.labels && typeof direct.labels === 'object'
        ? Object.entries(direct.labels)
            .map(([k, v]) => `|kubernetes_labels_${cleanLokiLabel(k)}="${v}"`)
            .join('')
        : '';
    return `{${streams}}${pipeline ? '|json' + pipeline : ''}`;
  } catch {
    return undefined;
  }
};

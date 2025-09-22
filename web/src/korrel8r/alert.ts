import { Class, Domain, Query, URIRef, keyValueList, parseKeyValueList } from './types';

export class AlertDomain extends Domain {
  // Constructor takes an optional map of alert rule ID to name mappings.
  // Numeric IDs are used to refer to alerting rules with no alert parameters.
  constructor(private idToName?: Map<string, string>) {
    super('alert');
  }

  class(name: string): Class {
    if (name !== this.name) throw this.badClass(name);
    return new Class(this.name, name);
  }

  // Convert a Query to a relative URI reference.
  linkToQuery(link: URIRef): Query {
    const m = link.pathname.match(/monitoring\/(?:alerts|alertrules)(?:\/([^/]*))?/);
    if (!m) throw this.badLink(link);
    const ruleID = m?.[1];
    let selector: { [key: string]: string };
    if (ruleID) {
      // Search for alerts belonging to a specific alerting rule.
      selector = Object.fromEntries(link.searchParams);
      selector['alertname'] ||= this?.idToName?.get(ruleID); // Look up name from ID if missing
      // Must have an alertname for a specific rule search.
      if (!selector['alertname']) throw this.badLink(link, 'cannot find alertname');
      nonLabelParams.forEach((key: string) => delete selector[key]);
    } else {
      // Generic alert search across rules. Empty selector is allowed - means "all alerts"
      selector = parseKeyValueList(link.searchParams.get('alerts'));
    }
    return new Query(this.class('alert'), JSON.stringify(selector));
  }

  queryToLink(query: Query): URIRef {
    // Use "alerts" parameter to search for alerts of possibly mixed alertnames.
    try {
      const selectors = keyValueList(JSON.parse(query.selector));
      return new URIRef(`monitoring/alerts`, { alerts: selectors || undefined });
    } catch (e) {
      throw this.badQuery(query, e.toString());
    }
  }
}

// URL parameters that are not alert labels, remove them from the query.
const nonLabelParams = new Set<string>([
  'prometheus',
  'rowFilter-alert-state',
  'rowFilter-alert-source',
  'rowFilter-alerting-rule-source',
]);

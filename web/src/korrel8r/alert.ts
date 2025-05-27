import { Class, Domain, Query, URIRef, keyValueList, parseKeyValueList } from './types';

export class AlertDomain extends Domain {
  constructor() {
    super('alert');
  }

  class(name: string): Class {
    if (name !== this.name) throw this.badClass(name);
    return new Class(this.name, name);
  }

  // Convert a Query to a relative URI reference.
  linkToQuery(link: URIRef): Query {
    const m = link.pathname.match(/monitoring\/alerts(.*)$/);
    if (!m) throw this.badLink(link);
    const path = m[1];
    let selectors = {};
    if (path === '') {
      // No ID in path, this is a search URL
      selectors = parseKeyValueList(link.searchParams.get('alerts'));
    } else {
      const params = link.searchParams;
      params.delete('prometheus'); // Not part of the label selectors.
      params.delete('managed_cluster'); // Not part of the label selectors.
      for (const [key, value] of params) selectors[key] = value;
    }
    return new Query(this.class('alert'), JSON.stringify(selectors));
  }

  queryToLink(query: Query): URIRef {
    const selectors = keyValueList(JSON.parse(query.selector));
    return new URIRef(`monitoring/alerts`, { alerts: selectors || undefined })
  }
}

import { Class, Domain, Query, URIRef } from './types';

export class MetricDomain extends Domain {
  constructor() {
    super('metric');
  }

  class(name: string): Class {
    if (name !== this.name) throw this.badClass(name);
    return new Class(this.name, name);
  }

  linkToQuery(link: URIRef): Query {
    const promqlQuery = link.searchParams.get('query0');
    if (!promqlQuery) throw this.badLink(link);
    return new Query(this.class('metric'), promqlQuery);
  }

  queryToLink(query: Query): URIRef {
    query = this.checkQuery(query);
    if (!query.selector || query.selector.match(/{ *}/)) {
      throw this.badQuery(query, 'empty selector');
    }
    return new URIRef('monitoring/query-browser', { query0: query.selector })    // FIXME use explicit URIRef everywhere.
  }
}

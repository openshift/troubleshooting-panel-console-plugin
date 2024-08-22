import { Korrel8rDomain, Korrel8rNode, NodeError } from './korrel8r.types';
import { keyValueList, parseKeyValueList, parseQuery, parseURL } from './query-url';

const domain = 'alert';

export class AlertNode extends Korrel8rNode {
  domain: Korrel8rDomain = Korrel8rDomain.Alert;
  query: string;
  url: string;

  constructor(url: string, query: string) {
    super();
    this.query = query;
    this.url = url;
  }

  // fromURL creates a node from a URL.
  //
  // NOTE: There are two types of console alert URL:
  // - individual URL: numeric ID in path, query parameters are label selectors.
  // - search URL: nothing in path, 'alert' query parameter contains encoded list of label selectors
  //
  static fromURL(url: string): Korrel8rNode {
    const prefix = 'monitoring/alerts';
    const [path, params] = parseURL(domain, prefix, url);
    let selectors = {};
    if (path === '/' + prefix) {
      // No ID in path, this is a search URL
      selectors = parseKeyValueList(params.get('alerts'));
    } else {
      params.delete('prometheus'); // Not part of the label selectors.
      for (const [key, value] of params) selectors[key] = value;
    }
    return new AlertNode(url, `alert:alert:${JSON.stringify(selectors)}`);
  }

  // fromQuery only creates search-style URLs, never instance URLs.
  static fromQuery(query: string): Korrel8rNode {
    try {
      const [, data] = parseQuery(domain, query);
      const selectors = keyValueList(JSON.parse(data));
      return new AlertNode(
        `monitoring/alerts${selectors ? `?alerts=${encodeURIComponent(selectors)}` : ''}`,
        query,
      );
    } catch (e) {
      throw new NodeError(`Invalid query data ${query}: ${e.message} `);
    }
  }

  toURL(): string {
    return this.url;
  }
  toQuery(): string {
    return this.query;
  }
}

import { Korrel8rNode, NodeError } from './korrel8r.types';
import { parseURL } from './query-url';

export class MetricNode extends Korrel8rNode {
  query: string;
  url: string;

  constructor(url: string, query: string) {
    super();
    this.query = query;
    this.url = url;
  }

  static fromURL(url: string): Korrel8rNode {
    const [, params] = parseURL('metric', 'monitoring/query-browser', url);
    const promqlQuery = params.get('query0');
    if (!promqlQuery) throw new NodeError('Invalid metric URL: ${url}');
    const query = `metric:metric:${promqlQuery}`;

    return new MetricNode(url, query);
  }

  static fromQuery(query: string): Korrel8rNode {
    if (!query.startsWith('metric:metric:'))
      throw new NodeError('Expected query to start with metric:metric:');

    const queryAfterClass = query.substring('metric:metric:'.length);
    if (!queryAfterClass)
      throw new NodeError('Expected korrel8r query to contain a prometheus query');
    if (queryAfterClass === '{}') {
      throw new NodeError('Expected query to contain relevant query parameters');
    }

    const url = `monitoring/query-browser?query0=${queryAfterClass}`;
    return new MetricNode(url, query);
  }

  toURL(): string {
    return this.url;
  }

  toQuery(): string {
    return this.query;
  }
}

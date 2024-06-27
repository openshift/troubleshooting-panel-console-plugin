import { Korrel8rDomain, Korrel8rNode, NodeError } from './korrel8r.types';

// https://docs.openshift.com/container-platform/4.15/observability/network_observability/json-flows-format-reference.html
// All items which both have a Filter ID, so they can be put into the URL, and have a Loki label,
// since Korrel8r only accepts a logql query, and any query containing a item without a Loki label
// returns an empty correlation array from Korrel8r.
const logQLToLabelMap = {
  DstK8S_Namespace: 'dst_namespace',
  DstK8S_OwnerName: 'dst_owner_name',
  DstK8S_Type: 'dst_kind',
  DstK8S_Zone: 'dst_zone',
  FlowDirection: 'node_direction',
  K8S_ClusterName: 'cluster_name',
  SrcK8S_Namespace: 'src_namespace',
  SrcK8S_OwnerName: 'src_owner_name',
  SrcK8S_Type: 'src_kind',
  SrcK8S_Zone: 'src_zone',
  _RecordType: 'type',
};

export class NetflowNode extends Korrel8rNode {
  domain: Korrel8rDomain = Korrel8rDomain.Alert;
  query: string;
  url: string;

  constructor(url: string, query: string) {
    super();
    this.query = query;
    this.url = url;
  }

  // TODO: Add support for pulling parameters from filter query parameters
  static fromURL(url: string): Korrel8rNode {
    if (!url.startsWith('netflow-traffic'))
      throw new NodeError('Expected url to start with netflow-traffic');
    const urlObject = new URL('http://domain' + url);
    const urlQuerySegment = urlObject.search;
    if (!urlQuerySegment) throw new NodeError('Expected URL to contain query parameters');

    const urlSearchParams = new URLSearchParams(urlQuerySegment);
    if (urlSearchParams.size === 0)
      throw new NodeError('Expected more than 0 relevant query parameters');

    let urlQueryString = urlSearchParams.get('q');
    if (!urlQueryString) throw new NodeError('Expected more than 0 relevant query parameters');

    const netflowClass = urlSearchParams.get('tenant');
    if (!netflowClass) throw new NodeError('Expected query to contain netflow class');
    if (netflowClass !== 'network') throw new NodeError('Expected netflow class to be network');

    if (urlQueryString.endsWith('|json')) {
      urlQueryString = urlQueryString.slice(0, -5);
    }

    const korrel8rQuery = `netflow:network:${urlQueryString}`;
    return new NetflowNode(url, korrel8rQuery);
  }

  static fromQuery(query: string): Korrel8rNode {
    if (!query.startsWith('netflow:')) throw new NodeError('Expected query to start with netflow:');
    const queryAfterDomain = query.substring('netflow:'.length);
    if (!queryAfterDomain) throw new NodeError('Expected query to contain class');
    const netflowClass = queryAfterDomain.split(':').at(0);
    if (netflowClass !== 'network') throw new NodeError('Expected netflow class to be network');

    const queryAfterClass = queryAfterDomain.substring(netflowClass.length + 1);
    if (!queryAfterClass || queryAfterClass === '{}')
      throw new NodeError('Expected more than 0 relevant query parameters');

    const queryWithJSON = queryAfterClass + '|json';

    const filters = queryAfterClass
      .slice(1, -1)
      .split(',')
      .map((filter) => {
        const trimmedFilter = filter.trim();
        const keyValues = trimmedFilter.split('=');
        if (keyValues.length !== 2) {
          throw new NodeError('Expected filter to be in the format key=value');
        }
        let key = keyValues[0].trim();
        const value = keyValues[1].trim();
        let negation = false;
        if (key.endsWith('!')) {
          key = key.slice(0, -1);
          negation = true;
        }
        const mappedKey = logQLToLabelMap[key];
        if (!mappedKey) {
          throw new NodeError(`Unknown filter key: ${key}`);
        }
        return `${mappedKey}${negation ? '!=' : '='}${value}`;
      })
      .join(';');

    const url = `netflow-traffic?q=${queryWithJSON}&tenant=${netflowClass}&filters=${filters}`;
    return new NetflowNode(url, query);
  }

  toURL(): string {
    return this.url;
  }

  toQuery(): string {
    return this.query;
  }
}

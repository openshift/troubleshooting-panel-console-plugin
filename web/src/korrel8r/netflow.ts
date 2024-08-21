import { Korrel8rDomain, Korrel8rNode, NodeError } from './korrel8r.types';
import { parseQuery, parseURL } from './query-url';

// https://docs.openshift.com/container-platform/4.15/observability/network_observability/json-flows-format-reference.html
// Netflow URL parameter names are equivalent to the LogQL query labels, but spelled differently.
// Conversion of the most useful query names to URL parmameter name:
const queryToURLName = {
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

// Inverse conversion of URL parmameter names to LogQL query names.
const urlToQueryName = Object.entries(queryToURLName).reduce((result, [key, value]) => {
  result[value] = key;
  return result;
}, {});

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
    const [, params] = parseURL('netflow', 'netflow-traffic', url);

    const selectors = params
      .get('filters')
      ?.split(';')
      .map((filter) => {
        const [, key, operator, value] = filter.match(/^\s*([^!=\s]+)\s*(!?=~?)\s*(.+)\s*$/) || [];
        return urlToQueryName[key] ? `${urlToQueryName[key]}${operator}"${value}"` : '';
      })
      .filter((s) => s)
      .join(',');
    return new NetflowNode(url, `netflow:network:{${selectors || ''}}`);
  }

  static fromQuery(query: string): Korrel8rNode {
    const [clazz, data] = parseQuery('netflow', query);
    if (clazz !== 'network')
      throw new NodeError(`Expected class netflow:network in query: ${query}`);
    const filters = data
      .match(/\s*\{\s*(.*)\s*\}\s*/)?.[1]
      ?.split(',')
      ?.map((filter) => {
        const [, key, operator, value] =
          filter.match(/^\s*([^!=\s]+)\s*(!?=~?)\s*"(.+)"\s*$/) || [];
        if (!key) throw new NodeError(`Expected filter to be key="value": ${filter}`);
        return queryToURLName[key] ? `${queryToURLName[key]}${operator}${value}` : '';
      })
      .filter((s) => s)
      .join(';');
    return new NetflowNode(
      `netflow-traffic?tenant=${clazz}${filters ? `&filters=${encodeURIComponent(filters)}` : ''}`,
      query,
    );
  }

  toURL(): string {
    return this.url;
  }

  toQuery(): string {
    return this.query;
  }
}

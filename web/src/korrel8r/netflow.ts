import { Class, Constraint, Domain, Query, unixSeconds, URIRef } from './types';

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
const linkToQueryName = Object.entries(queryToURLName).reduce((result, [key, value]) => {
  result[value] = key;
  return result;
}, {});

export class NetflowDomain extends Domain {
  constructor() {
    super('netflow');
  }

  class(name: string): Class {
    if (name !== 'network') throw this.badClass(name);
    return new Class(this.name, name);
  }

  linkToQuery(link: URIRef): Query {
    if (!link.pathname.match(/netflow-traffic/)) throw this.badLink(link);
    let selectors = link.searchParams
      .get('filters')
      ?.split(';')
      .map((filter) => {
        const [, key, operator, value] = filter.match(/^\s*([^!=\s]+)\s*(!?=~?)\s*(.+)\s*$/) || [];
        // Removes surrounding quotes
        const trimmedValue = value?.replace(/^"(.*)"$/, '$1');
        return linkToQueryName[key] ? `${linkToQueryName[key]}${operator}"${trimmedValue}"` : '';
      })
      .filter((s) => s)
      .join(',');

    // Set default selector if no valid selectors are present
    selectors = selectors || 'DstK8S_Type="Pod",SrcK8S_Type="Pod"';
    return this.class('network').query(`{${selectors}}`);
  }

  queryToLink(query: Query, constraint?: Constraint): URIRef {
    if (query.class.name !== 'network') throw this.badQuery(query, 'unknown class');
    const filters = query.selector
      .match(/\s*\{\s*(.*)\s*\}\s*/)?.[1]
      ?.split(',')
      ?.map((filter: string) => {
        const [, key, operator, value] =
          filter.match(/^\s*([^!=\s]+)\s*(!?=~?)\s*"(.+)"\s*$/) || [];
        if (!key) throw this.badQuery(query);
        return queryToURLName[key] ? `${queryToURLName[key]}${operator}${value}` : '';
      })
      .filter((s) => s)
      .join(';');

    // Construct the base URL with required parameters
    return new URIRef('netflow-traffic', {
      tenant: query.class.name,
      filters: filters ? filters : undefined,
      startTime: unixSeconds(constraint?.start),
      endTime: unixSeconds(constraint?.end),
    })
  }
}

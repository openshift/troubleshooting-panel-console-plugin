import { getCachedResources } from '../getResources';
import { Korrel8rDomain, Korrel8rNode, NodeError } from './korrel8r.types';
import { keyValueList, parseQuery, parseURL } from './query-url';

type GroupVersionKind = {
  group?: string;
  version?: string;
  kind: string;
};

const eventGroupVersionKind: GroupVersionKind = {
  kind: 'Event',
  version: 'v1',
};

type QueryData = {
  name?: string;
  namespace?: string;
  labels?: { [key: string]: string };
  fields?: { [key: string]: string };
};

type Model = {
  kind: string;
  apiVersion: string;
  apiGroup: string;
  path: string;
  verbs: string[];
};

const pathRegex = new RegExp(
  '(?:k8s|search)/(?:(?:ns/([^/]+))|cluster|all-namespaces)(?:/([^/]+)(?:/([^/]+))?)?(/events)?/?$',
);

export class K8sNode extends Korrel8rNode {
  domain: Korrel8rDomain = Korrel8rDomain.Alert;
  query: string;
  url: string;

  constructor(url: string, query: string) {
    super();
    this.query = query;
    this.url = url;
  }

  static fromURL(url: string): Korrel8rNode {
    const [path, params] = parseURL('k8s', 'k8s|search', url);
    const [, namespace, resource, name, events] = path.match(pathRegex) || [];
    const groupVersionKind = this.getGroupVersionKind(resource, params.get('kind'));

    if (!groupVersionKind || !groupVersionKind.kind)
      throw new NodeError(`Expected k8s URL: ${url}`);
    if (events) {
      const data = {
        fields: {
          'involvedObject.namespace': namespace,
          'involvedObject.name': name,
          'involvedObject.apiVersion': this.apiVersionFor(groupVersionKind),
          'involvedObject.kind': groupVersionKind.kind,
        },
      };
      const query = `${K8sNode.classFor(eventGroupVersionKind)}:${JSON.stringify(data)}`;
      return new K8sNode(url, query);
    } else {
      const data = {
        namespace: namespace,
        name: name,
        labels: K8sNode.parseSelector(params.get('labels')) || undefined,
      };
      return new K8sNode(url, `${K8sNode.classFor(groupVersionKind)}:${JSON.stringify(data)}`);
    }
  }

  static fromQuery(query: string): Korrel8rNode {
    const [clazz, dataStr] = parseQuery('k8s', query);
    const [, kind, version, group] = clazz.match(/^([^.]+)(?:\.([^.]*)(?:\.(.*))?)?$/) ?? [];
    if (!kind) throw new NodeError(`Expected k8s class: ${clazz}`);
    let gvk: GroupVersionKind = { kind: kind, version: version || 'v1', group: group || undefined };

    let data: QueryData;
    try {
      data = JSON.parse(dataStr) as QueryData;
    } catch (e) {
      throw new NodeError(`Invalid k8s query data: ${dataStr}: ${e}`);
    }

    let namespace = '',
      name = '',
      events = '';
    if (gvk.kind == eventGroupVersionKind.kind && !gvk.group) {
      events = '/events';
      // Focus on the events involved object rather than the event.
      gvk = this.makeGroupVersionKind(
        data.fields['involvedObject.apiVersion'],
        data.fields['involvedObject.kind'],
      );
      namespace = data.fields['involvedObject.namespace'] || '';
      name = data.fields['involvedObject.name'] || '';
    } else {
      namespace = data.namespace || '';
      name = data.name || '';
    }

    // Prepare parts of the URL
    const [gvk2, resource] = this.findKind(gvk); // Fill out partial GVK
    gvk = gvk2;
    const nsPath = namespace ? `ns/${namespace}` : 'all-namespaces';
    const labelsParam = data.labels
      ? `?labels=${encodeURIComponent(keyValueList(data.labels))}`
      : '';

    let url: string;
    if (!name && !namespace && labelsParam) {
      // Search URL
      url =
        `search/${nsPath}${labelsParam}&kind=` +
        `${gvk.group || 'core'}~` +
        `${gvk.version || undefined}~` +
        `${gvk.kind}`;
    } else {
      // Resource URL
      url = `k8s/${nsPath}/${resource}${name && `/${name}`}${events}${labelsParam}`;
    }
    return new K8sNode(url, query);
  }

  toURL(): string {
    return this.url;
  }

  toQuery(): string {
    return this.query;
  }

  // Return a GVK for the resource (path) or throw an error
  private static getGroupVersionKind(resource: string, kind: string): GroupVersionKind {
    if (resource && !resource.includes('~')) {
      // Try the resource as a straight resource name
      if (resource === 'projects') resource = 'namespaces';
      return this.findResource(resource);
    }
    const gvkStr = resource || kind; // Either kind or resource may be a g~v~k string.
    if (gvkStr) {
      const parts = (resource || kind).split('~');
      if (parts.length !== 3 || !parts[2]) throw new NodeError('Expected k8s URL');
      const gvk: GroupVersionKind = {
        group: !parts[0] || parts[0] === 'core' ? undefined : parts[0],
        version: parts[1] || undefined,
        kind: parts[2],
      };
      return this.findKind(gvk)[0]; // Fill it out
    }
    throw new NodeError(`Invalid k8s resource: ${gvkStr}`);
  }

  // parseSelector parses a selector string as a query map.
  private static parseSelector(selector: string): { [key: string]: string } {
    if (!selector) return undefined;
    const labels: { [key: string]: string } = {};
    selector.split(',').forEach((pair: string) => {
      const [key, value] = pair.split(/=(.*)/);
      labels[key] = value;
    });
    return labels || undefined;
  }

  // findResource returns the GroupVersionKind for a resource name (path component)
  private static findResource(resource: string): GroupVersionKind {
    const model = getCachedResources()?.models.find(
      (m: Model) => m.path === resource && m.verbs.includes('watch'),
    );
    if (!model) throw new NodeError(`Unknown k8s resource: ${resource} `);
    return { group: model.apiGroup, version: model.apiVersion, kind: model.kind };
  }

  // Returns the model matching a gvk or throws an error.
  private static findKind(gvk: GroupVersionKind): [fullGVK: GroupVersionKind, resource: string] {
    const model = getCachedResources()?.models.find(
      (m: Model) =>
        m.kind === gvk.kind &&
        m.verbs.includes('watch') &&
        (!gvk.group || gvk.group === m.apiGroup) &&
        (!gvk.version || gvk.version === m.apiVersion),
    );
    if (!model) {
      throw new NodeError(`Unknown k8s kind: ${JSON.stringify(gvk)} `);
    }
    return [{ group: model.apiGroup, version: model.apiVersion, kind: model.kind }, model.path];
  }

  // makeGroupVersionKind from a kind and an apiVersion.
  private static makeGroupVersionKind(apiVersion: string, kind: string): GroupVersionKind {
    const parts = apiVersion.split('/');
    if (parts.length == 1) return { version: parts[0] || undefined, kind: kind };
    if (parts.length == 2)
      return { group: parts[0] || undefined, version: parts[1] || undefined, kind: kind };
    throw new NodeError('Invalid k8s apiVersion: ${apiVersion}');
  }

  private static apiVersionFor(gvk: GroupVersionKind): string {
    return `${gvk.group ? `${gvk.group}/` : ''}${gvk.version || 'v1'}`;
  }

  private static classFor(gvk: GroupVersionKind): string {
    return `k8s:${gvk.kind}.${gvk.version || 'v1'}.${gvk.group || ''}`;
  }
}

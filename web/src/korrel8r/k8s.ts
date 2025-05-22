import { getCachedResources } from '../getResources';
import { Domain, Class, Query, URIRef, keyValueList } from './types';

// k8s model type stored in browser cache.
type Model = {
  kind: string;
  apiVersion: string;
  apiGroup: string;
  path: string;
  verbs: string[];
};

// Parsed form of a k8s query selector.
type Selector = {
  name?: string;
  namespace?: string;
  labels?: { [key: string]: string };
  fields?: { [key: string]: string };
};

const pathRegex = new RegExp(
  '(?:k8s|search)/(?:(?:ns/([^/]+))|cluster|all-namespaces)(?:/([^/]+)(?:/([^/]+))?)?(/events)?/?$',
);

export class K8sDomain extends Domain {
  constructor() {
    super('k8s');
  }

  class(name: string): Class {
    const m = name.match(/^([^.]+)(?:\.([^.]*)(?:\.(.*))?)?$/) ?? [];
    if (!m) throw this.badClass(name);
    const model = findGVK(m[3], m[2], m[1]);
    if (!model) throw this.badClass(name);
    return this.modelClass(model);
  }

  private modelClass(model: Model): Class {
    const version = model.apiVersion || 'v1';
    const dotGroup = model.apiGroup ? `.${model.apiGroup}` : '';
    return new Class(this.name, `${model.kind}.${version}${dotGroup}`);
  }

  linkToQuery(link: URIRef): Query {
    const m = link.pathname.match(pathRegex);
    if (!m) throw this.badLink(link);
    const [, namespace, resource, name, events] = m;
    const model = findResource(resource, link.searchParams.get('kind'));
    if (!model || !model.kind) throw this.badLink(link, `unknown resource "${resource}"`);
    if (events) {
      const apiVersion = `${model.apiGroup ? `${model.apiGroup}/` : ''}${model.apiVersion || 'v1'}`;
      const data = {
        fields: {
          'involvedObject.namespace': namespace,
          'involvedObject.name': name,
          'involvedObject.apiVersion': apiVersion,
          'involvedObject.kind': model.kind,
        },
      };
      return this.class('Event.v1').query(JSON.stringify(data));
    } else {
      const data = {
        namespace: namespace,
        name: name,
        labels: K8sDomain.parseSelector(link.searchParams.get('labels')) || undefined,
      };
      return this.modelClass(model).query(JSON.stringify(data));
    }
  }

  queryToLink(query: Query): string {
    let data: Selector;
    try {
      data = JSON.parse(query.selector) as Selector;
    } catch (e) {
      throw this.badQuery(query, e.message);
    }
    const m = query.class.name.match(/^([^.]+)(?:\.([^.]*)(?:\.(.*))?)?$/) ?? [];
    if (!m) throw this.badQuery(query);
    let model = findGVK(m[3], m[2], m[1]);
    if (!model) throw this.badQuery(query);
    let namespace = data.namespace,
      name = data.name,
      events = '';
    if (model.kind == 'Event' && model.apiVersion == 'v1' && !model.apiGroup) {
      // Special treatment for event objects: focus on the involved object, not the event.
      events = '/events';
      model = findGVK(
        data.fields['involvedObject.apiGroup'],
        data.fields['involvedObject.apiVersion'],
        data.fields['involvedObject.kind'],
      );
      if (!model) throw this.badQuery(query);
      namespace = data.fields['involvedObject.namespace'] || '';
      name = data.fields['involvedObject.name'] || '';
    }
    // Prepare parts of the URL
    const nsPath = namespace ? `ns/${namespace}` : 'all-namespaces';
    const labelsParam = data.labels
      ? `?labels=${encodeURIComponent(keyValueList(data.labels))}`
      : '';
    model;
    if (!name && !namespace && labelsParam) {
      // Search URL
      return (
        `search/${nsPath}${labelsParam}&kind=` +
        `${model.apiGroup || 'core'}~${model.apiVersion}~${model.kind}`
      );
    } else {
      // Resource URL
      return `k8s/${nsPath}/${model.path}${name ? `/${name}` : ''}${events}${labelsParam}`;
    }
  }

  // parseSelector parses a selector string as a query map.
  static parseSelector(selector: string): { [key: string]: string } {
    if (!selector) return;
    const labels: { [key: string]: string } = {};
    selector.split(',').forEach((pair: string) => {
      const [key, value] = pair.split(/=(.*)/);
      labels[key] = value;
    });
    return labels || undefined;
  }
}

function findGVK(group: string, version: string, kind: string): Model {
  const model = getCachedResources()?.models.find(
    (m: Model) =>
      m.kind === kind &&
      m.verbs.includes('watch') &&
      (!group || group === m.apiGroup) &&
      (!version || version === m.apiVersion),
  );
  return model || undefined;
}

// Return a model for the resource (path) or undefined
function findResource(resource: string, kind: string): Model {
  if (resource === 'projects') resource = 'namespaces'; // Alias
  if (resource && !resource.includes('~')) {
    // Try the resource as a straight resource name
    const model = getCachedResources()?.models.find(
      (m: Model) => m.path === resource && m.verbs.includes('watch'),
    );
    if (model) return model;
  }
  // Either kind or resource may be a g~v~k string.
  const parts = (resource || kind)?.split('~');
  if (!parts || parts.length !== 3 || !parts[2]) return;
  return findGVK(
    !parts[0] || parts[0] === 'core' ? undefined : parts[0],
    parts[1] || undefined,
    parts[2],
  );
}

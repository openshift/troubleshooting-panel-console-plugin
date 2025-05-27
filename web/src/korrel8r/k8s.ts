import { getCachedResources } from '../getResources';
import { Class, Domain, Query, URIRef, keyValueList } from './types';

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

const PATH_RE = new RegExp(
  '(?:k8s|search)/(?:(?:ns/([^/]+))|cluster|all-namespaces)(?:/([^/]+)(?:/([^/]+))?)?(/events)?/?$',
);
const CLASS_RE = new RegExp('^([^./]+)(?:.(v[0-9]+(?:(?:alpha|beta)[0-9]*)?))?(?:.([^/]*))?$');

export class K8sDomain extends Domain {
  constructor() {
    super('k8s');
  }

  class(name: string): Class {
    const m = name.match(CLASS_RE);
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
    const m = link.pathname.match(PATH_RE);
    if (!m) throw this.badLink(link);
    const [, namespace, resource, name, events] = m;
    const model = findResource(resource, link.searchParams.get('kind'));
    if (!model || !model.kind) throw this.badLink(link, `unknown resource "${resource}"`);
    if (events) {
      const event = eventModel();
      const about = eventAboutField(event);
      const apiVersion = `${model.apiGroup ? `${model.apiGroup}/` : ''}${model.apiVersion || 'v1'}`;
      const data = {
        fields: {
          [`${about}.namespace`]: namespace,
          [`${about}.name`]: name,
          [`${about}.apiVersion`]: apiVersion,
          [`${about}.kind`]: model.kind,
        },
      };
      return this.modelClass(event).query(JSON.stringify(data));
    } else {
      const data = {
        namespace: namespace,
        name: name,
        labels: K8sDomain.parseSelector(link.searchParams.get('labels')) || undefined,
      };
      return this.modelClass(model).query(JSON.stringify(data));
    }
  }

  queryToLink(query: Query): URIRef {
    let data: Selector;
    try {
      data = JSON.parse(query.selector) as Selector;
    } catch (e) {
      throw this.badQuery(query, e.message);
    }
    const m = query.class.name.match(/^([^.]+)(?:\.([^.]*)(?:\.(.*))?)?$/) ?? [];
    if (!m) throw this.badQuery(query, "incorrect format");
    let model = findGVK(m[3], m[2], m[1]);
    if (!model) throw this.badQuery(query, "no matching resource");
    let namespace = data.namespace;
    let name = data.name;
    let events = '';
    if (isEvent(model)) {
      // Special treatment for event objects: focus on the involved object, not the event.
      events = '/events';
      const about = eventAboutField(model);
      const [group, version] = data.fields[`${about}.apiVersion`]?.split("/") ?? []
      const kind = data.fields[`${about}.kind`]
      model = findGVK(group, version, kind)
      if (!model) throw this.badQuery(query, `no resource for group=${group} version=${version} kind=${kind}`);
      namespace = data.fields[`${about}.namespace`] || '';
      name = data.fields[`${about}.name`] || '';
    }
    // Prepare parts of the URL
    const nsPath = namespace ? `ns/${namespace}` : 'all-namespaces';
    const params = {
      labels: keyValueList(data.labels) || undefined,
      fields: (!events && keyValueList(data.fields)) || undefined,
    }
    if (!name && !namespace && (params.labels || params.fields)) { // This is a search URL
      return new URIRef(`search/${nsPath}`, {
        ...params,
        kind: `${model.apiGroup || 'core'}~${model.apiVersion}~${model.kind}`,
      })
    } else { // Specific resource URL
      return new URIRef(
        `k8s/${nsPath}/${model.path}${name ? `/${name}` : ''}${events}`, params)
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

// Original k8s Event resource was in the core group, modern Event is in the events.k8s.io group.
// Event.v1 has an 'involvedObject' field, Event.v1.events.k8s.io has a 'regarding' field.
// Need to handle both variations.
const EVENT = {
  group: 'events.k8s.io',
  version: 'v1',
  kind: 'Event',
};

function isEvent(m: Model): boolean {
  return (
    m.kind == EVENT.kind &&
    m.apiVersion == EVENT.version &&
    (!m.apiGroup || m.apiGroup === EVENT.group)
  );
}
function eventModel(): Model {
  return findGVK(EVENT.group, EVENT.version, EVENT.kind) || findGVK('', EVENT.version, EVENT.kind);
}

function eventAboutField(m: Model): string {
  return m?.apiGroup === EVENT.group ? 'regarding' : 'involvedObject';
}

// Find the cached resource model for a GVK. Same defaulting rules as korrel8r..
function findGVK(group: string, version: string, kind: string): Model {
  version = version || 'v1';
  group = group || '';
  return getCachedResources()?.models.find((m: Model) => {
    return (
      m.kind === kind &&
      m.verbs.includes('watch') &&
      m.apiVersion === version &&
      (m.apiGroup || '') === group
    );
  });
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

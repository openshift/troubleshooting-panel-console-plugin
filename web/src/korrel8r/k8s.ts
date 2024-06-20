import { Korrel8rDomain, Korrel8rNode, NodeError } from './korrel8r.types';
import { getCachedResources } from '../getResources';

type GroupVersionKind = {
  group?: string;
  version?: string;
  kind: string;
};
const eventGroupVersionKind: GroupVersionKind = {
  version: 'v1',
  kind: 'Event',
};

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
    const urlObject = new URL('http://domain' + url);
    const path = urlObject.pathname;
    if (!path) throw new NodeError('Expected url to contain path');
    const regex =
      // eslint-disable-next-line no-useless-escape
      `(?:k8s|\/search)(?:(?:\/ns\/([^/]+))|\/cluster|` +
      // eslint-disable-next-line no-useless-escape
      `\/all-namespaces)(?:\/([^/]+)(?:\/([^/]+)(\/events)?)?)?\/?$`;
    const [, namespace, resource, name, events] = url.toString().match(regex);
    const eventsExist = !!events;

    const urlQuerySegment = urlObject.search;

    const urlSearchParams = new URLSearchParams(urlQuerySegment);
    let groupVersionKind: GroupVersionKind;
    if (resource.includes('~')) {
      groupVersionKind = K8sNode.parseGroupVersionKind(resource);
    } else if (resource !== '') {
      groupVersionKind = {
        kind: resource,
      };
    } else {
      const kind = urlSearchParams.get('kind');
      if (!kind) throw new NodeError('Expected more than 0 relevant query parameters');
      groupVersionKind = { kind };
    }
    if (!groupVersionKind.version) {
      const resources = getCachedResources();
      if (!resources) {
        throw new NodeError(resources);
      }
      const models = resources.models.filter(
        (model) => model.path === resource && model.verbs.includes('watch'),
      );
      if (!models || models.length !== 1) {
        throw new NodeError('missing model');
      }
      const model = models[0];
      groupVersionKind = {
        kind: model.kind,
        version: model.apiVersion,
        group: model.apiGroup,
      };
    }

    if (eventsExist) {
      const className =
        `k8s:${eventGroupVersionKind.kind}.` +
        `${eventGroupVersionKind.version}.` +
        `${eventGroupVersionKind.group ?? ''}`;
      const data = {
        fields: {
          'involvedObject.namespace': namespace,
          'involvedObject.name': name,
          'involvedObject.apiVersion': groupVersionKind.version,
          'involvedObject.kind': groupVersionKind.kind,
        },
      };
      const query = `${className}:${JSON.stringify(data).trim()}`;
      return new K8sNode(url, query);
    }
    const className =
      `k8s:${groupVersionKind.kind}.` +
      `${groupVersionKind.version ?? 'v1'}.` +
      `${groupVersionKind.group ?? ''}`;
    const query = `${className}:{"namespace":"${namespace}",` + `"name":"${name}"}`;
    return new K8sNode(url, query);
  }

  static fromQuery(query: string): Korrel8rNode {
    if (!query.startsWith('k8s:')) throw new NodeError('Expected query to start with k8s:');
    const queryAfterDomain = query.substring('k8s:'.length);
    if (!queryAfterDomain) throw new NodeError('Expected query to contain class');
    const groupVersionKindString = queryAfterDomain.split(':').at(0);
    const groupVersionKindSplit = groupVersionKindString.split('.');
    let groupVersionKind = {
      kind: groupVersionKindSplit[0],
      version: groupVersionKindSplit[1],
      group: groupVersionKindSplit[2],
    };
    const resources = getCachedResources();
    if (!resources) {
      throw new NodeError('Unable to retrieve resources');
    }
    const queryAfterClass = queryAfterDomain.substring(groupVersionKindString.length + 1);
    if (!queryAfterClass || queryAfterClass === '{}')
      throw new NodeError('Expected more than 0 relevant query parameters');

    const korrel8rQuery = JSON.parse(queryAfterClass);

    let models = resources.models;
    if (groupVersionKind.kind === eventGroupVersionKind.kind) {
      models = models.filter(
        (model) =>
          model.kind === korrel8rQuery.fields['involvedObject.kind'] &&
          model.verbs.includes('watch'),
      );
    } else {
      models = models.filter(
        (model) => model.kind === groupVersionKind.kind && model.verbs.includes('watch'),
      );
    }

    if (!models) {
      throw new NodeError('Unable to find a matching model');
    }
    const model = models[0];
    if (!groupVersionKind.version) {
      groupVersionKind = {
        kind: model.kind,
        version: model.apiVersion,
        group: model.apiGroup,
      };
    }
    const path = model.path;

    if (
      groupVersionKind.kind === eventGroupVersionKind.kind &&
      groupVersionKind.version === eventGroupVersionKind.version
    ) {
      let url = `k8s`;
      if (korrel8rQuery.fields['involvedObject.namespace']) {
        url = `${url}/ns/${korrel8rQuery.fields['involvedObject.namespace']}`;
      }
      url = `${url}/${path}`;
      if (korrel8rQuery.fields['involvedObject.name']) {
        url = `${url}/${korrel8rQuery.fields['involvedObject.name']}`;
      }
      url = url.concat('/events');
      return new K8sNode(url, query);
    }
    let url = `k8s`;
    if (korrel8rQuery.namespace) {
      url = `${url}/ns/${korrel8rQuery.namespace}`;
    }
    url = `${url}/${path}`;
    if (korrel8rQuery.name) {
      url = `${url}/${korrel8rQuery.name}`;
    }
    return new K8sNode(url, query);
  }

  toURL(): string {
    return this.url;
  }

  toQuery(): string {
    return this.query;
  }

  private static parseGroupVersionKind(groupVersionKindString: string): GroupVersionKind {
    const groupVersionKindArray = groupVersionKindString.split('~');
    if (groupVersionKindArray.length === 3) {
      return {
        group: groupVersionKindArray[0],
        version: groupVersionKindArray[1],
        kind: groupVersionKindArray[2],
      };
    } else {
      return { kind: groupVersionKindString };
    }
  }
}

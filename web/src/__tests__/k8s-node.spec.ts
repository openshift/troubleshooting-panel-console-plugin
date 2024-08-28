/**
 * @jest-environment jsdom
 */

import { K8sNode } from '../korrel8r/k8s';

beforeAll(() => {
  // Mock API discovery resources.
  const resources = {
    consoleVersion: 'x.y.z',
    models: [
      {
        kind: 'Pod',
        apiVersion: 'v1',
        path: 'pods',
        verbs: ['watch'],
      },
      {
        kind: 'Deployment',
        apiVersion: 'v1',
        apiGroup: 'apps',
        path: 'deployments',
        verbs: ['watch'],
      },
      {
        kind: 'Event',
        apiVersion: 'v1',
        path: 'events',
        verbs: ['watch'],
      },
      {
        kind: 'Namespace',
        apiVersion: 'v1',
        path: 'namespaces',
        verbs: ['watch'],
      },
      {
        kind: 'Node',
        apiVersion: 'v1',
        path: 'nodes',
        verbs: ['watch'],
      },
      {
        kind: 'Role',
        apiVersion: 'v1',
        apiGroup: 'rbac.authorization.k8s.io',
        path: 'roles',
        verbs: ['watch'],
      },
      {
        kind: 'Pod',
        apiVersion: 'v1',
        path: 'pods',
        verbs: ['watch'],
      },
      {
        kind: 'ClusterServiceVersion',
        apiVersion: 'v1alpha1',
        apiGroup: 'operators.coreos.com',
        path: 'operators',
        verbs: ['watch'],
      },
    ],
  };
  localStorage.setItem('bridge/api-discovery-resources', JSON.stringify(resources));
  window['SERVER_FLAGS'] = { consoleVersion: 'x.y.z' };
});

describe('K8sNode.fromURL', () => {
  it.each([
    { url: 'k8s/all-namespaces/apps~v1~Deployment', query: 'k8s:Deployment.v1.apps:{}' },
    {
      url: 'k8s/ns/korrel8r/apps~v1~Deployment',
      query: 'k8s:Deployment.v1.apps:{"namespace":"korrel8r"}',
    },
    {
      url: 'k8s/ns/korrel8r/deployments/korrel8r',
      query: 'k8s:Deployment.v1.apps:{"namespace":"korrel8r","name":"korrel8r"}',
    },
    {
      url: 'k8s/ns/default/pods/bad-deployment-000000000-00000',
      query: 'k8s:Pod.v1.:{"namespace":"default","name":"bad-deployment-000000000-00000"}',
    },
    {
      url: 'k8s/ns/default/pods/bad-deployment-000000000-00000/events',
      query:
        'k8s:Event.v1.:{"fields":{"involvedObject.namespace":"default","involvedObject.name":"bad-deployment-000000000-00000","involvedObject.apiVersion":"v1","involvedObject.kind":"Pod"}}',
    },
    { url: `/k8s/ns/default/pods/foo`, query: `k8s:Pod.v1.:{"namespace":"default","name":"foo"}` },
    { url: `/k8s/ns/default/pods`, query: `k8s:Pod.v1.:{"namespace":"default"}` },
    { url: `/k8s/cluster/projects/foo`, query: `k8s:Namespace.v1.:{"name":"foo"}` },
    {
      url: `/k8s/ns/x/operators.coreos.com~v1alpha1~ClusterServiceVersion/y`,
      query: `k8s:ClusterServiceVersion.v1alpha1.operators.coreos.com:{"namespace":"x","name":"y"}`,
    },
    { url: `/search/all-namespaces?kind=core~v1~Pod`, query: `k8s:Pod.v1.:{}` },
    { url: `/k8s/all-namespaces/core~v1~Pod`, query: `k8s:Pod.v1.:{}` },
    { url: `/k8s/cluster/nodes/oscar7`, query: `k8s:Node.v1.:{"name":"oscar7"}` },
    { url: '/k8s/ns/netobserv/core~v1~Pod', query: 'k8s:Pod.v1.:{"namespace":"netobserv"}' },
  ])('converts $url', ({ url, query }) => expect(K8sNode.fromURL(url).toQuery()).toEqual(query));
});

describe('K8sNode.fromQuery', () => {
  it.each([
    // Variations on query parameters.
    // Note "fields" are ignored.
    {
      query: 'k8s:Pod.v1.:{"namespace":"default","name":"bad-deployment-000000000-00000"}',
      url: 'k8s/ns/default/pods/bad-deployment-000000000-00000',
    },
    {
      query: `k8s:Pod:{"namespace":"x","name":"y","labels":{"a":"b","c":"d"},"fields": {"x":"y"}}`,
      url: `k8s/ns/x/pods/y?labels=${encodeURIComponent('a=b,c=d')}`,
    },
    {
      query:
        'k8s:Event.v1.:{"fields":{"involvedObject.namespace":"default","involvedObject.name":"bad-deployment-000000000-00000","involvedObject.apiVersion":"v1","involvedObject.kind":"Pod"}}',
      url: 'k8s/ns/default/pods/bad-deployment-000000000-00000/events',
    },
    {
      query: `k8s:Pod:{"namespace":"x","name":"y","labels":{"a":"b"}}`,
      url: `k8s/ns/x/pods/y?labels=${encodeURIComponent('a=b')}`,
    },
    {
      query: `k8s:Pod:{"namespace":"x","labels":{"a":"b"}}`,
      url: `k8s/ns/x/pods?labels=${encodeURIComponent('a=b')}`,
    },
    { query: `k8s:Pod.v1:{"namespace":"x","name":"y"}`, url: `k8s/ns/x/pods/y` },
    { query: `k8s:Pod.v1:{"namespace":"x"}`, url: `k8s/ns/x/pods` },
    {
      query: `k8s:Pod.v1:{"labels":{"a":"b"}}`,
      url: `search/all-namespaces?labels=${encodeURIComponent('a=b')}&kind=core~v1~Pod`,
    },
    {
      query: `k8s:Pod.v1:{"namespace":"x","labels":{"a":"b"}}`,
      url: `k8s/ns/x/pods?labels=${encodeURIComponent('a=b')}`,
    },

    // Variations on korrel8r class spec.
    { query: `k8s:Role:{"namespace":"x", "name":"y"}`, url: `k8s/ns/x/roles/y` },
    { query: `k8s:Role.:{"namespace":"x", "name":"y"}`, url: `k8s/ns/x/roles/y` },
    { query: `k8s:Role.v1:{"namespace":"x", "name":"y"}`, url: `k8s/ns/x/roles/y` },
    { query: `k8s:Role.v1.:{"namespace":"x", "name":"y"}`, url: `k8s/ns/x/roles/y` },
    {
      query: `k8s:Role.v1.rbac.authorization.k8s.io:{"namespace":"x", "name":"y"}`,
      url: `k8s/ns/x/roles/y`,
    },
    { query: `k8s:Pod:{}`, url: 'k8s/all-namespaces/pods' },
  ])('converts $query to $url', ({ url, query }) => {
    expect(K8sNode.fromQuery(query).toURL()).toEqual(url);
  });

  it.each([
    { query: `foo:bar:baz`, err: 'Expected k8s query' },
    { query: `k8s:Pod`, err: 'Expected k8s query' },
    { query: `k8s:nosuch:{}`, err: 'Unknown k8s kind:' },
    { query: `k8s:Role.v1.bad.group:{}`, err: `Unknown k8s kind:` },
  ])('raises error on $query', ({ query, err }) =>
    expect(() => {
      K8sNode.fromQuery(query);
    }).toThrow(err),
  );
});

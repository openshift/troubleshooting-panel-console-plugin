import { LogDomain } from '../korrel8r/log';
import { Constraint, Query, URIRef } from '../korrel8r/types';

beforeAll(() => {
  // Mock API pod resource for pod log queries.
  const resources = {
    consoleVersion: 'x.y.z',
    models: [
      {
        kind: 'Pod',
        apiVersion: 'v1',
        path: 'pods',
        verbs: ['watch'],
      },
    ],
  };
  localStorage.setItem('bridge/api-discovery-resources', JSON.stringify(resources));
  window['SERVER_FLAGS'] = { consoleVersion: 'x.y.z' };
});

describe('LogDomain.linkToQuery', () => {
  it.each([
    {
      url: `monitoring/logs?q=${encodeURIComponent(
        '{kubernetes_namespace_name="default",kubernetes_pod_name="foo"}',
      )}&tenant=infrastructure`,
      query:
        `log:infrastructure:{kubernetes_namespace_name="default"` + `,kubernetes_pod_name="foo"}`,
    },
    {
      url: `monitoring/logs?q=${encodeURIComponent(
        '{kubernetes_namespace_name="default",' +
          'kubernetes_pod_name="foo",log_type="infrastructure"}',
      )}`,
      query:
        `log:infrastructure:{kubernetes_namespace_name="default",` +
        `kubernetes_pod_name="foo",log_type="infrastructure"}`,
    },
    {
      url: `monitoring/logs?q=${encodeURIComponent(
        '{kubernetes_namespace_name="default",kubernetes_pod_name="foo"}',
      )}&tenant=infrastructure`,
      query:
        `log:infrastructure:{kubernetes_namespace_name="default",` + `kubernetes_pod_name="foo"}`,
    },
    {
      url: `monitoring/logs?q=${encodeURIComponent(
        '{kubernetes_namespace_name="default",kubernetes_pod_name="foo",log_type="infrastructure"}',
      )}&tenant=infrastructure`,
      query:
        `log:infrastructure:{kubernetes_namespace_name="default",` +
        `kubernetes_pod_name="foo",log_type="infrastructure"}`,
    },
    {
      url: `/k8s/ns/foo/pods/bar/aggregated-logs`,
      query: `log:application:{kubernetes_namespace_name="foo",kubernetes_pod_name="bar"}`,
    },
    {
      url: `/k8s/ns/kube/pods/bar/aggregated-logs`,
      query: `log:infrastructure:{kubernetes_namespace_name="kube",kubernetes_pod_name="bar"}`,
    },
    {
      url: '/monitoring/logs?q=%7Bkubernetes_namespace_name%3D%22openshift-image-registry%22%7D%7Cjson%7Ckubernetes_labels_docker_registry%3D%22default%22&tenant=infrastructure',
      query:
        'log:infrastructure:{kubernetes_namespace_name="openshift-image-registry"}|json|kubernetes_labels_docker_registry="default"',
    },
  ])('$url', ({ url, query }) =>
    expect(new LogDomain().linkToQuery(new URIRef(url))).toEqual(Query.parse(query)),
  );
});

describe('LogDomain.queryToLink', () => {
  it.each([
    {
      // LogQL query
      query: `log:infrastructure:{kubernetes_namespace_name="default",kubernetes_pod_name="foo"}`,
      q: '{kubernetes_namespace_name="default",kubernetes_pod_name="foo"}',
      tenant: 'infrastructure',
    },
    {
      // k8s Pod query
      query: 'log:infrastructure:{"namespace":"default","name":"foo"}',
      q: '{kubernetes_namespace_name="default",kubernetes_pod_name="foo"}',
      tenant: 'infrastructure',
    },
    {
      // k8s Pod query with labels
      query: 'log:infrastructure:{"namespace":"default","name":"foo","labels":{"a":"b","c":"d"}}',
      q: '{kubernetes_namespace_name="default",kubernetes_pod_name="foo"}|json|kubernetes_labels_a="b"|kubernetes_labels_c="d"',
      tenant: 'infrastructure',
    },
    {
      // k8s partial query
      query: 'log:infrastructure:{"namespace":"default","labels":{}}',
      q: '{kubernetes_namespace_name="default"}',
      tenant: 'infrastructure',
    },
    {
      // k8s partial query
      query:
        'log:infrastructure:{"namespace":"openshift-monitoring","labels":{"app":"cluster-monitoring-operator"}}',
      q: '{kubernetes_namespace_name="openshift-monitoring"}|json|kubernetes_labels_app="cluster-monitoring-operator"',
      tenant: 'infrastructure',
    },

    {
      query: 'log:application:{}',
      q: '{}',
      tenant: 'application',
    },
  ])('$query', ({ query, q, tenant }) => {
    const got = new LogDomain().queryToLink(
      Query.parse(query),
      Constraint.fromAPI({
        start: '2025-03-25T10:00:00.000Z',
        end: '2025-03-25T22:00:00.000Z',
      }),
    );
    const want = new URIRef('monitoring/logs', {
      q,
      tenant,
      start: 1742896800000,
      end: 1742940000000,
    });
    expect(got.toString()).toEqual(want.toString());
  });
});

describe('expected errors', () => {
  it.each([
    {
      url: 'monitoring/log',
      expected: 'invalid link for domain log: monitoring/log',
    },
    {
      url: 'monitoring/logs?q={kubernetes_namespace_name="default",kubernetes_pod_name="foo"}',
      expected:
        'invalid link for domain log: monitoring/logs?q=%7Bkubernetes_namespace_name%3D%22default%22%2Ckubernetes_pod_name%3D%22foo%22%7D',
    },
  ])('error from url: $url', ({ url, expected }) => {
    expect(() => new LogDomain().linkToQuery(new URIRef(url))).toThrow(expected);
  });

  it.each([
    {
      query: 'foo:bar:baz',
      expected: 'invalid query for domain log: foo:bar:baz: unknown class',
    },
    {
      query: 'log:incorrect:{}',
      expected: 'invalid query for domain log: log:incorrect:{}: unknown class',
    },
  ])('error from query: $query', ({ query, expected }) => {
    expect(() => new LogDomain().queryToLink(Query.parse(query))).toThrow(expected);
  });
});

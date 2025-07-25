import { LogDomain } from '../korrel8r/log';
import { Constraint, Query, URIRef } from '../korrel8r/types';

describe('LogDomain.fromURL', () => {
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

describe('LogDomain.fromQuery', () => {
  it.each([
    {
      url: `monitoring/logs?q=${encodeURIComponent(
        '{kubernetes_namespace_name="default",kubernetes_pod_name="foo"}',
      )}&tenant=infrastructure&start=1742896800000&end=1742940000000`,
      query: `log:infrastructure:{kubernetes_namespace_name="default",kubernetes_pod_name="foo"}`,
      constraint: Constraint.fromAPI({
        start: '2025-03-25T10:00:00.000Z',
        end: '2025-03-25T22:00:00.000Z',
      }),
    },
    {
      url: `monitoring/logs?q=${encodeURIComponent(
        '{kubernetes_namespace_name="default",log_type="infrastructure"}',
      )}&tenant=infrastructure&start=1742896800000&end=1742940000000`,
      query: 'log:infrastructure:{kubernetes_namespace_name="default",log_type="infrastructure"}',
      constraint: Constraint.fromAPI({
        start: '2025-03-25T10:00:00.000Z',
        end: '2025-03-25T22:00:00.000Z',
      }),
    },
  ])('$query', ({ url, query, constraint }) =>
    expect(new LogDomain().queryToLink(Query.parse(query), constraint)).toEqual(new URIRef(url)),
  );
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

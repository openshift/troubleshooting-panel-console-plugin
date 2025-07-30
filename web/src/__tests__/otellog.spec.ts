import { OtellogDomain } from '../korrel8r/otellog';
import { Constraint, Query, URIRef } from '../korrel8r/types';

describe('OtellogDomain.fromURL', () => {
  it.each([
    {
      url: `monitoring/logs?q=${encodeURIComponent(
        '{kubernetes_namespace_name="default",kubernetes_pod_name="foo"}',
      )}&tenant=infrastructure`,
      query:
        `otellog:infrastructure:{kubernetes_namespace_name="default"` +
        `,kubernetes_pod_name="foo"}`,
    },
    {
      url: `monitoring/logs?q=${encodeURIComponent(
        '{kubernetes_namespace_name="default",' +
          'kubernetes_pod_name="foo",log_type="infrastructure"}',
      )}`,
      query:
        `otellog:infrastructure:{kubernetes_namespace_name="default",` +
        `kubernetes_pod_name="foo",log_type="infrastructure"}`,
    },
    {
      url: `monitoring/logs?q=${encodeURIComponent(
        '{kubernetes_namespace_name="default",kubernetes_pod_name="foo"}',
      )}&tenant=infrastructure`,
      query:
        `otellog:infrastructure:{kubernetes_namespace_name="default",` +
        `kubernetes_pod_name="foo"}`,
    },
    {
      url: `monitoring/logs?q=${encodeURIComponent(
        '{kubernetes_namespace_name="default",kubernetes_pod_name="foo",log_type="infrastructure"}',
      )}&tenant=infrastructure`,
      query:
        `otellog:infrastructure:{kubernetes_namespace_name="default",` +
        `kubernetes_pod_name="foo",log_type="infrastructure"}`,
    },
    {
      url: `/k8s/ns/foo/pods/bar/aggregated-logs`,
      query: `otellog:application:{kubernetes_namespace_name="foo",kubernetes_pod_name="bar"}`,
    },
    {
      url: `/k8s/ns/kube/pods/bar/aggregated-logs`,
      query: `otellog:infrastructure:{kubernetes_namespace_name="kube",kubernetes_pod_name="bar"}`,
    },
    {
      url: '/monitoring/logs?q=%7Bkubernetes_namespace_name%3D%22openshift-image-registry%22%7D%7Cjson%7Ckubernetes_labels_docker_registry%3D%22default%22&tenant=infrastructure',
      query:
        'otellog:infrastructure:{kubernetes_namespace_name="openshift-image-registry"}|json|kubernetes_labels_docker_registry="default"',
    },
  ])('$url', ({ url, query }) =>
    expect(new OtellogDomain().linkToQuery(new URIRef(url))).toEqual(Query.parse(query)),
  );
});

describe('OtellogDomain.fromQuery', () => {
  it.each([
    {
      url: `monitoring/logs?q=${encodeURIComponent(
        '{kubernetes_namespace_name="default",kubernetes_pod_name="foo"}',
      )}&tenant=infrastructure&start=1742896800000&end=1742940000000`,
      // eslint-disable-next-line max-len
      query: `otellog:infrastructure:{kubernetes_namespace_name="default",kubernetes_pod_name="foo"}`,
      constraint: Constraint.fromAPI({
        start: '2025-03-25T10:00:00.000Z',
        end: '2025-03-25T22:00:00.000Z',
      }),
    },
    {
      url: `monitoring/logs?q=${encodeURIComponent(
        '{kubernetes_namespace_name="default",log_type="infrastructure"}',
      )}&tenant=infrastructure&start=1742896800000&end=1742940000000`,
      query:
        'otellog:infrastructure:{kubernetes_namespace_name="default",log_type="infrastructure"}',
      constraint: Constraint.fromAPI({
        start: '2025-03-25T10:00:00.000Z',
        end: '2025-03-25T22:00:00.000Z',
      }),
    },
  ])('$query', ({ url, query, constraint }) =>
    expect(new OtellogDomain().queryToLink(Query.parse(query), constraint)).toEqual(
      new URIRef(url),
    ),
  );
});

describe('expected errors', () => {
  it.each([
    {
      url: 'monitoring/log',
      expected: 'domain otellog: invalid link: monitoring/log',
    },
    {
      url: 'monitoring/logs?q={kubernetes_namespace_name="default",kubernetes_pod_name="foo"}',
      expected:
        'domain otellog: invalid link: monitoring/logs?q=%7Bkubernetes_namespace_name%3D%22default%22%2Ckubernetes_pod_name%3D%22foo%22%7D',
    },
  ])('error from url: $url', ({ url, expected }) => {
    expect(() => new OtellogDomain().linkToQuery(new URIRef(url))).toThrow(expected);
  });

  it.each([
    {
      query: 'foo:bar:baz',
      expected: 'domain otellog: invalid query, unknown class: foo:bar:baz',
    },
    {
      query: 'log:incorrect:{}',
      expected: 'domain otellog: invalid query, unknown class: log:incorrect:{}',
    },
  ])('error from query: $query', ({ query, expected }) => {
    expect(() => new OtellogDomain().queryToLink(Query.parse(query))).toThrow(expected);
  });
});

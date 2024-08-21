import { LogNode } from '../korrel8r/log';

describe('LogNode.fromURL', () => {
  it.each([
    {
      url: `monitoring/logs?q=${encodeURIComponent(
        '{kubernetes_namespace_name="default",kubernetes_pod_name="foo"}',
      )}&tenant=infrastructure`,
      query:
        `log:infrastructure:{kubernetes_namespace_name="default"` +
        `,kubernetes_pod_name="foo"}|json`,
    },
    {
      url: `monitoring/logs?q=${encodeURIComponent(
        '{kubernetes_namespace_name="default",' +
          'kubernetes_pod_name="foo",log_type="infrastructure"}',
      )}`,
      query:
        `log:infrastructure:{kubernetes_namespace_name="default",` +
        `kubernetes_pod_name="foo",log_type="infrastructure"}|json`,
    },
    {
      url: `monitoring/logs?q=${encodeURIComponent(
        '{kubernetes_namespace_name="default",kubernetes_pod_name="foo"}|json',
      )}&tenant=infrastructure`,
      query:
        `log:infrastructure:{kubernetes_namespace_name="default",` +
        `kubernetes_pod_name="foo"}|json`,
    },
    {
      url: `monitoring/logs?q=${encodeURIComponent(
        '{kubernetes_namespace_name="default",kubernetes_pod_name="foo",log_type="infrastructure"}|json',
      )}&tenant=infrastructure`,
      query:
        `log:infrastructure:{kubernetes_namespace_name="default",` +
        `kubernetes_pod_name="foo",log_type="infrastructure"}|json`,
    },
    {
      url: `/k8s/ns/foo/pods/bar/aggregated-logs`,
      query: `log:application:{kubernetes_namespace_name="foo",kubernetes_pod_name="bar"}|json`,
    },
    {
      url: `/k8s/ns/kube/pods/bar/aggregated-logs`,
      query: `log:infrastructure:{kubernetes_namespace_name="kube",kubernetes_pod_name="bar"}|json`,
    },
  ])('$url', ({ url, query }) => expect(LogNode.fromURL(url)?.toQuery()).toEqual(query));
});

describe('LogNode.fromQuery', () => {
  it.each([
    {
      query:
        `log:infrastructure:{kubernetes_namespace_name="default",` +
        `kubernetes_pod_name="foo"}|json`,
      url: `monitoring/logs?q=${encodeURIComponent(
        '{kubernetes_namespace_name="default",kubernetes_pod_name="foo"}|json',
      )}&tenant=infrastructure`,
    },
    {
      query: 'log:infrastructure:{kubernetes_namespace_name="default",log_type="infrastructure"}',
      url: `monitoring/logs?q=${encodeURIComponent(
        '{kubernetes_namespace_name="default",log_type="infrastructure"}|json',
      )}&tenant=infrastructure`,
    },
  ])('$query', ({ url, query }) => expect(LogNode.fromQuery(query)?.toURL()).toEqual(url));
});

describe('expected errors', () => {
  it.each([
    {
      url: 'monitoring/log',
      expected: 'Expected log URL: monitoring/log',
    },
    {
      url: 'monitoring/logs?q={kubernetes_namespace_name="default",kubernetes_pod_name="foo"}|json',
      expected: 'No log class found in URL',
    },
  ])('error from url: $url', ({ url, expected }) => {
    expect(() => LogNode.fromURL(url)).toThrow(expected);
  });

  it.each([
    {
      query: 'foo:bar:baz',
      expected: 'Expected log query: foo:bar:baz',
    },
    {
      query: 'log:incorrect:{}',
      expected: 'Expected log class in query',
    },
  ])('error from query: $query', ({ query, expected }) => {
    expect(() => LogNode.fromQuery(query)).toThrow(expected);
  });
});

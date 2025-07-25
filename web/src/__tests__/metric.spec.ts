import { MetricDomain } from '../korrel8r/metric';
import { Query, URIRef } from '../korrel8r/types';

/**
 * Bad deployment is the suggested deployment from korrel8r to show its functionality within the
 * logging plugin. https://korrel8r.github.io/korrel8r/#troubleshooting-no-related-logs
 *
 */
describe('metric', () => {
  const metric = new MetricDomain();

  describe('query-link round trip', () => {
    it.each([
      {
        query:
          'metric:metric:max_over_time(kube_pod_container_status_waiting_reason{job="kube-state-metrics",namespace=~"(openshift-.*|kube-.*|default)",reason="CrashLoopBackOff"}[5m]) <= 1',
        link: 'monitoring/query-browser?query0=max_over_time%28kube_pod_container_status_waiting_reason%7Bjob%3D%22kube-state-metrics%22%2Cnamespace%3D%7E%22%28openshift-.*%7Ckube-.*%7Cdefault%29%22%2Creason%3D%22CrashLoopBackOff%22%7D%5B5m%5D%29+%3C%3D+1',
      },
      {
        // Verify issue: https://github.com/openshift/troubleshooting-panel-console-plugin/issues/127
        query:
          'metric:metric:(1 - sum(node_memory_MemFree_bytes + node_memory_Buffers_bytes + node_memory_Cached_bytes and on (instance) label_replace(kube_node_role{role="master"}, "instance", "$1", "node", "(.+)")) / sum(node_memory_MemTotal_bytes and on (instance) label_replace(kube_node_role{role="master"}, "instance", "$1", "node", "(.+)"))) * 100 > 60',
        link: 'monitoring/query-browser?query0=%281+-+sum%28node_memory_MemFree_bytes+%2B+node_memory_Buffers_bytes+%2B+node_memory_Cached_bytes+and+on+%28instance%29+label_replace%28kube_node_role%7Brole%3D%22master%22%7D%2C+%22instance%22%2C+%22%241%22%2C+%22node%22%2C+%22%28.%2B%29%22%29%29+%2F+sum%28node_memory_MemTotal_bytes+and+on+%28instance%29+label_replace%28kube_node_role%7Brole%3D%22master%22%7D%2C+%22instance%22%2C+%22%241%22%2C+%22node%22%2C+%22%28.%2B%29%22%29%29%29+*+100+%3E+60',
      },
    ])('', ({ query, link }) => {
      const q = Query.parse(query);
      expect(metric.queryToLink(q).toString()).toEqual(link);
      expect(metric.linkToQuery(new URIRef(link))).toEqual(q);
    });
  });

  describe('linkToQuery errors', () => {
    it.each([
      {
        url: 'foobar',
        error: new TypeError('invalid link for domain metric: foobar'),
      },
      {
        url: 'monitoring/query-browser',
        error: 'invalid link for domain metric: monitoring/query-browser',
      },
    ])('$url', ({ url, error }) => {
      expect(() => metric.linkToQuery(new URIRef(url))).toThrow(error);
    });
  });

  describe('queryToLink errors', () => {
    it.each([
      {
        query: 'wrongdomain:metric:foo',
        error: 'invalid query for domain metric: wrongdomain:metric:foo',
      },
      {
        query: 'metric:badclass:foo',
        error: 'invalid class for domain metric: badclass',
      },
    ])('$query', ({ query, error }) => {
      expect(() => metric.queryToLink(Query.parse(query))).toThrow(error);
    });
  });
});

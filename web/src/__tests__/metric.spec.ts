import { Query, URIRef } from '../korrel8r/types';
import { MetricDomain } from '../korrel8r/metric';

/**
 * Bad deployment is the suggested deployment from korrel8r to show its functionality within the
 * logging plugin. https://korrel8r.github.io/korrel8r/#troubleshooting-no-related-logs
 *
 */
describe('Test MetricNode Parsing', () => {
  it('Query => URL => Query', () => {
    const query =
      'metric:metric:max_over_time(kube_pod_container_status_waiting_reason{job="kube-state-metrics",namespace=~"(openshift-.*|kube-.*|default)",reason="CrashLoopBackOff"}[5m]) <= 1';
    const expectedKorrel8rURL =
      'monitoring/query-browser?query0=max_over_time(kube_pod_container_status_waiting_reason{job="kube-state-metrics",namespace=~"(openshift-.*|kube-.*|default)",reason="CrashLoopBackOff"}[5m]) <= 1';
    const d = new MetricDomain();
    const actualKorrel8rURL = d.queryToLink(Query.parse(query));
    expect(actualKorrel8rURL).toEqual(expectedKorrel8rURL);
    expect(d.linkToQuery(new URIRef(actualKorrel8rURL))).toEqual(Query.parse(query));
  });

  it('URL => Query => URL', () => {
    const url =
      'monitoring/query-browser?query0=max_over_time(kube_pod_container_status_waiting_reason{job="kube-state-metrics",namespace=~"(openshift-.*|kube-.*|default)",reason="CrashLoopBackOff"}[5m]) <= 1';
    const expectedQuery =
      'metric:metric:max_over_time(kube_pod_container_status_waiting_reason{job="kube-state-metrics",namespace=~"(openshift-.*|kube-.*|default)",reason="CrashLoopBackOff"}[5m]) <= 1';
    const d = new MetricDomain();
    const actualQuery = d.linkToQuery(new URIRef(url));
    expect(actualQuery).toEqual(Query.parse(expectedQuery));
    expect(d.queryToLink(Query.parse(expectedQuery))).toEqual(url);
  });

  describe('Test url to query parsing with expected errors', () => {
    [
      {
        url: 'foobar',
        expected: new TypeError('domain metric: invalid link: foobar'),
      },
      {
        url: 'monitoring/query-browser',
        expected: 'domain metric: invalid link: monitoring/query-browser',
      },
    ].forEach(({ url, expected }) => {
      it(`converts from ${url}`, () => {
        expect(() => new MetricDomain().linkToQuery(new URIRef(url))).toThrow(expected);
      });
    });
  });

  it('Test query to url parsing with expected errors', () => {
    [
      {
        query: 'wrongdomain:metric:foo',
        expected: 'domain metric: invalid query, wrong domain: wrongdomain:metric:foo',
      },
      {
        query: 'metric:badclass:foo',
        expected: 'domain metric: invalid class: badclass',
      },
    ].forEach(({ query, expected }) => {
      expect(() => new MetricDomain().queryToLink(Query.parse(query))).toThrow(expected);
    });
  });
});

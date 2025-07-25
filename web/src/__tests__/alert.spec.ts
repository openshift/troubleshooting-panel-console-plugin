import { AlertDomain } from '../korrel8r/alert';
import { Query, URIRef } from '../korrel8r/types';

describe('AlertNode.fromURL', () => {
  it.each([
    {
      url:
        'monitoring/alerts/12345?prometheus=openshift-monitoring/k8s&severity=warning&alertname=KubePodCrashLooping&' +
        'container=bad-deployment&endpoint=https-main&job=kube-state-metrics&namespace=default&pod=bad-deployment&' +
        'reason=CrashLoopBackOff&service=kube-state-metrics&uid=00000000-0000-0000-0000-000000000000',
      query:
        'alert:alert:{"prometheus":"openshift-monitoring/k8s","severity":"warning","alertname":"KubePodCrashLooping","container":"bad-deployment",' +
        '"endpoint":"https-main","job":"kube-state-metrics","namespace":"default","pod":"bad-deployment",' +
        '"reason":"CrashLoopBackOff","service":"kube-state-metrics","uid":"00000000-0000-0000-0000-000000000000"}',
    },
    { url: 'monitoring/alerts', query: 'alert:alert:{}' },
    {
      url: 'monitoring/alerts?alerts=alertname%3DKubePodCrashLooping%2Ccontainer%3Dbad-deployment%2Cnamespace%3Ddefault%2Cpod%3Dbad-pod',
      query:
        'alert:alert:{"alertname":"KubePodCrashLooping","container":"bad-deployment","namespace":"default","pod":"bad-pod"}',
    },
    {
      url: 'monitoring/alerts/12345',
      query: 'alert:alert:{"alertname":"FooAlert"}',
    },
    {
      url: 'monitoring/alertrules/12345',
      query: 'alert:alert:{"alertname":"FooAlert"}',
    },
    {
      url: 'monitoring/alertrules/12345?alertname=BarAlert',
      query: 'alert:alert:{"alertname":"BarAlert"}',
    },
  ])('converts $url', ({ url, query }) => {
    const domain = new AlertDomain(new Map([['12345', 'FooAlert']]));
    expect(domain.linkToQuery(new URIRef(url)).toString()).toEqual(query);
  });
});

describe('AlertNode.fromURL raises error', () => {
  it.each([
    {
      url: 'monitoring/alertrules/999',
      error: 'invalid link for domain alert: monitoring/alertrules/999: cannot find alertname',
    },
  ])('converts $url', ({ url, error }) => {
    expect(() => new AlertDomain().linkToQuery(new URIRef(url))).toThrow(error);
  });
});

describe('AlertDomain.fromQuery', () => {
  it.each([
    {
      query:
        'alert:alert:{"alertname":"KubePodCrashLooping","container":"bad-deployment","namespace":"default","pod":"bad-deployment"}',
      url: 'monitoring/alerts?alerts=alertname%3DKubePodCrashLooping%2Ccontainer%3Dbad-deployment%2Cnamespace%3Ddefault%2Cpod%3Dbad-deployment',
    },
    { query: 'alert:alert:{}', url: 'monitoring/alerts' },
  ])('converts $query', ({ url, query }) => {
    expect(new AlertDomain().queryToLink(Query.parse(query))).toEqual(new URIRef(url));
  });

  it('Query => URL => Query', () => {
    const query =
      'alert:alert:{"alertname":"KubePodCrashLooping","container":"bad-deployment","namespace":"default","pod":"bad-pod"}';
    const got =
      'monitoring/alerts?alerts=alertname%3DKubePodCrashLooping%2Ccontainer%3Dbad-deployment%2Cnamespace%3Ddefault%2Cpod%3Dbad-pod';
    const want = new AlertDomain().queryToLink(Query.parse(query));
    expect(want).toEqual(new URIRef(got));
    expect(new AlertDomain().linkToQuery(want)).toEqual(Query.parse(query));
  });
});

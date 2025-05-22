import { URIRef, Query } from '../korrel8r/types';
import { AlertDomain } from '../korrel8r/alert';

describe('AlertNode.fromURL', () => {
  it.each([
    {
      url:
        'monitoring/alerts/12345?prometheus=openshift-monitoring/k8s&severity=warning&alertname=KubePodCrashLooping&' +
        'container=bad-deployment&endpoint=https-main&job=kube-state-metrics&namespace=default&pod=bad-deployment&' +
        'reason=CrashLoopBackOff&service=kube-state-metrics&uid=00000000-0000-0000-0000-000000000000',
      query:
        'alert:alert:{"severity":"warning","alertname":"KubePodCrashLooping","container":"bad-deployment",' +
        '"endpoint":"https-main","job":"kube-state-metrics","namespace":"default","pod":"bad-deployment",' +
        '"reason":"CrashLoopBackOff","service":"kube-state-metrics","uid":"00000000-0000-0000-0000-000000000000"}',
    },
    { url: 'monitoring/alerts', query: 'alert:alert:{}' },
    {
      url: 'monitoring/alerts?alerts=alertname%3DKubePodCrashLooping%2Ccontainer%3Dbad-deployment%2Cnamespace%3Ddefault%2Cpod%3Dbad-pod',
      query:
        'alert:alert:{"alertname":"KubePodCrashLooping","container":"bad-deployment","namespace":"default","pod":"bad-pod"}',
    },
  ])('converts $url', ({ url, query }) =>
    expect(new AlertDomain().linkToQuery(new URIRef(url))).toEqual(Query.parse(query)),
  );
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
    expect(new AlertDomain().queryToLink(Query.parse(query))).toEqual(url);
  });

  it('Query => URL => Query', () => {
    const query =
      'alert:alert:{"alertname":"KubePodCrashLooping","container":"bad-deployment","namespace":"default","pod":"bad-pod"}';
    const got =
      'monitoring/alerts?alerts=alertname%3DKubePodCrashLooping%2Ccontainer%3Dbad-deployment%2Cnamespace%3Ddefault%2Cpod%3Dbad-pod';
    const want = new AlertDomain().queryToLink(Query.parse(query));
    expect(want).toEqual(got);
    expect(new AlertDomain().linkToQuery(new URIRef(want))).toEqual(Query.parse(query));
  });
});

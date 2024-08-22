import { AlertNode } from '../korrel8r/alert';

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
  ])('converts $url', ({ url, query }) => expect(AlertNode.fromURL(url).toQuery()).toEqual(query));

  it('Test url to query parsing removes extraneous query parameters', () => {
    const url =
      'monitoring/alerts/12345?prometheus=openshift-monitoring/k8s&severity=warning&alertname=KubePodCrashLooping&' +
      'container=bad-deployment&endpoint=https-main&job=kube-state-metrics&namespace=default&' +
      'pod=bad-deployment-000000000-00000&reason=CrashLoopBackOff&service=kube-state-metrics&uid=00000000-0000-0000-0000-000000000000';
    const expectedKorrel8rQuery =
      'alert:alert:{"severity":"warning","alertname":"KubePodCrashLooping","container":"bad-deployment",' +
      '"endpoint":"https-main","job":"kube-state-metrics","namespace":"default","pod":"bad-deployment-000000000-00000",' +
      '"reason":"CrashLoopBackOff","service":"kube-state-metrics","uid":"00000000-0000-0000-0000-000000000000"}';
    expect(AlertNode.fromURL(url)?.toQuery()).toEqual(expectedKorrel8rQuery);
  });

  // Errors
  it.each([{ url: 'monitoring/alert', expected: 'Expected alert URL' }])(
    `$url throws`,
    ({ url, expected }) => {
      expect(() => AlertNode.fromURL(url)).toThrow(expected);
    },
  );
});

describe('AlertNode.fromQuery', () => {
  it.each([
    {
      query:
        'alert:alert:{"alertname":"KubePodCrashLooping","container":"bad-deployment","namespace":"default","pod":"bad-deployment"}',
      url: 'monitoring/alerts?alerts=alertname%3DKubePodCrashLooping%2Ccontainer%3Dbad-deployment%2Cnamespace%3Ddefault%2Cpod%3Dbad-deployment',
    },
    { query: 'alert:alert:{}', url: 'monitoring/alerts' },
  ])('converts $query', ({ url, query }) => {
    expect(AlertNode.fromQuery(query).toURL()).toEqual(url);
  });

  it('Query => URL => Query', () => {
    const query =
      'alert:alert:{"alertname":"KubePodCrashLooping","container":"bad-deployment","namespace":"default","pod":"bad-pod"}';
    const expectedKorrel8rURL =
      'monitoring/alerts?alerts=alertname%3DKubePodCrashLooping%2Ccontainer%3Dbad-deployment%2Cnamespace%3Ddefault%2Cpod%3Dbad-pod';
    const actualKorrel8rURL = AlertNode.fromQuery(query)?.toURL();
    expect(actualKorrel8rURL).toEqual(expectedKorrel8rURL);
    expect(AlertNode.fromURL(actualKorrel8rURL)?.toQuery()).toEqual(query);
  });

  it.each([
    { query: 'alert:aler', expected: 'Expected alert query: alert:aler' },
    { query: 'alert:alert:', expected: 'Expected alert query' },
  ])('$query throws', ({ query, expected }) => {
    expect(() => AlertNode.fromQuery(query)).toThrow(expected);
  });
});

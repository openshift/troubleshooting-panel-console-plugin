import { Korrel8rNodeFactory } from '../korrel8r/node-factory';

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
    ],
  };
  localStorage.setItem('bridge/api-discovery-resources', JSON.stringify(resources));
  window['SERVER_FLAGS'] = { consoleVersion: 'x.y.z' };
});

const testdata = [
  {
    query:
      'alert:alert:{"alertname":"KubePodCrashLooping","container":"bad-deployment","namespace":"default","pod":"bad-deployment"}',
    url: 'monitoring/alerts?alerts=alertname%3DKubePodCrashLooping%2Ccontainer%3Dbad-deployment%2Cnamespace%3Ddefault%2Cpod%3Dbad-deployment',
  },
  {
    query: 'k8s:Pod.v1.:{"namespace":"default","name":"bad-deployment-000000000-00000"}',
    url: 'k8s/ns/default/pods/bad-deployment-000000000-00000',
  },
  {
    query: 'netflow:network:{SrcK8S_Type="Pod",SrcK8S_Namespace="myNamespace"}',
    url: `netflow-traffic?tenant=network&filters=${encodeURIComponent(
      'src_kind=Pod;src_namespace=myNamespace',
    )}`,
  },
  {
    url:
      `observe/traces/1599dfd76bc896101a9811857ae3c3c9?` +
      `namespace=openshift-tracing&name=platform&tenant=platform`,
    query: `trace:span:{trace:id="1599dfd76bc896101a9811857ae3c3c9"}`,
  },
  {
    url: `monitoring/logs?q=${encodeURIComponent(
      '{kubernetes_namespace_name="default",log_type="infrastructure"}',
    )}&tenant=infrastructure`,
    query: 'log:infrastructure:{kubernetes_namespace_name="default",log_type="infrastructure"}',
  },
];

describe('Korrel8rNodeFactory.fromURL', () => {
  it.each(testdata)('converts $url', ({ url, query }) =>
    expect(Korrel8rNodeFactory.fromURL(url).toQuery()).toEqual(query),
  );
});

describe('Korrel8rNodeFactory.fromQuery', () => {
  it.each(testdata)('converts $query', ({ url, query }) => {
    expect(Korrel8rNodeFactory.fromQuery(query).toURL()).toEqual(url);
  });
});

import { allDomains } from '../korrel8r/all-domains';
import { Constraint, Domains, Query, URIRef } from '../korrel8r/types';

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

it.each([
  {
    url: 'monitoring/alerts?alerts=alertname%3DKubePodCrashLooping%2Ccontainer%3Dbad-deployment%2Cnamespace%3Ddefault%2Cpod%3Dbad-deployment',
    query:
      'alert:alert:{"alertname":"KubePodCrashLooping","container":"bad-deployment","namespace":"default","pod":"bad-deployment"}',
    constraint: {
      start: null,
      end: null,
    },
  },
  {
    url: 'k8s/ns/default/pods/bad-deployment-000000000-00000',
    query: 'k8s:Pod.v1:{"namespace":"default","name":"bad-deployment-000000000-00000"}',
    constraint: {
      start: null,
      end: null,
    },
  },
  {
    url: `netflow-traffic?tenant=network&filters=${encodeURIComponent(
      'src_kind=Pod;src_namespace=myNamespace',
    )}&startTime=1742896800&endTime=1742940000`,
    query: 'netflow:network:{SrcK8S_Type="Pod",SrcK8S_Namespace="myNamespace"}',
    constraint: {
      start: '2025-03-25T10:00:00.000Z',
      end: '2025-03-25T22:00:00.000Z',
    },
  },
  {
    url:
      `observe/traces/1599dfd76bc896101a9811857ae3c3c9?` +
      `namespace=openshift-tracing&name=platform&tenant=platform&start=1742896800000`,
    query: `trace:span:{trace:id="1599dfd76bc896101a9811857ae3c3c9"}`,
    constraint: {
      start: '2025-03-25T10:00:00.000Z',
    },
  },
  {
    url: `monitoring/logs?q=${encodeURIComponent(
      '{kubernetes_namespace_name="default",log_type="infrastructure"}',
    )}&tenant=infrastructure&start=1742896800000&end=1742940000000`,
    query: 'log:infrastructure:{kubernetes_namespace_name="default",log_type="infrastructure"}',
    constraint: {
      start: '2025-03-25T10:00:00.000Z',
      end: '2025-03-25T22:00:00.000Z',
    },
  },
  {
    url: 'monitoring/logs?q=%7Bkubernetes_namespace_name%3D%22openshift-image-registry%22%7D%7Cjson%7Ckubernetes_labels_docker_registry%3D%22default%22&tenant=infrastructure',
    query:
      'log:infrastructure:{kubernetes_namespace_name="openshift-image-registry"}|json|kubernetes_labels_docker_registry="default"',
  },
])('convert URL<=>link', ({ url, query, constraint }) => {
  const d = new Domains(...allDomains);
  expect(d.linkToQuery(new URIRef(url))).toEqual(Query.parse(query));
  expect(d.queryToLink(Query.parse(query), Constraint.fromAPI(constraint))).toEqual(
    new URIRef(url),
  );
});

import { NetflowNode } from '../korrel8r/netflow';

// Korrel8r queries contain less information than console URLs.
// Round-trip conversion is not always equal.
// The following pairs _can_ round trip, and are testsed in both directions.
// The tests for fromURL and fromQuery test asymmetric cases.
const roundTrip = [
  {
    query: 'netflow:network:{SrcK8S_Type="Pod",SrcK8S_Namespace="myNamespace"}',
    url: `netflow-traffic?tenant=network&filters=${encodeURIComponent(
      'src_kind=Pod;src_namespace=myNamespace',
    )}`,
  },
  {
    url: 'netflow-traffic?tenant=network&filters=src_namespace%3Dnetobserv',
    query: 'netflow:network:{SrcK8S_Namespace="netobserv"}',
  },
  {
    query: 'netflow:network:{SrcK8S_Type!="Pod",SrcK8S_Namespace!="myNamespace"}',
    url: `netflow-traffic?tenant=network&filters=${encodeURIComponent(
      'src_kind!=Pod;src_namespace!=myNamespace',
    )}`,
  },
];

describe('NetflowNode.fromQuery', () => {
  it.each([
    ...roundTrip,
    {
      // Ignores unknown keys
      query: 'netflow:network:{InvalidKey="Pod",SrcK8S_Namespace="foo"}',
      url: `netflow-traffic?tenant=network&filters=${encodeURIComponent('src_namespace=foo')}`,
    },
  ])(`from $query`, ({ query, url }) => expect(NetflowNode.fromQuery(query).toURL()).toEqual(url));
});

describe('NetflowNode.fromURL', () => {
  it.each([
    ...roundTrip,
    {
      url: `netflow-traffic?tenant=network&filters=${encodeURIComponent(
        'src_namespace=netobserv',
      )}&limit=5&match=all`,
      query: 'netflow:network:{SrcK8S_Namespace="netobserv"}',
    },
    {
      url: 'netflow-traffic?timeRange=300&limit=5&match=all&packetLoss=all&recordType=flowLog&filters=flow_layer%3Dapp%3Bdst_kind%3DPod%3Bsrc_kind%3DPod&bnf=false',
      query: 'netflow:network:{DstK8S_Type="Pod",SrcK8S_Type="Pod"}',
    },
  ])(`from $url`, ({ query, url }) => expect(NetflowNode.fromURL(url).toQuery()).toEqual(query));
});

describe('', () => {
  it.each([
    {
      url: 'netflow-traffi',
      expected: 'Expected netflow URL: netflow-traffi',
    },
  ])('expect error fromURL($url)', ({ url, expected }) => {
    expect(() => NetflowNode.fromURL(url)).toThrow(expected);
  });

  it.each([
    {
      query: 'netflo',
      expected: 'Expected netflow query: netflo',
    },
    {
      query: 'netflow:',
      expected: 'Expected netflow query: netflow:',
    },
    {
      query: 'netflow:incorrect:{}',
      expected: 'Expected class netflow:network in query: netflow:incorrect:{}',
    },
    {
      query: 'netflow:network:{SrcK8S_Type="Pod"=wrong}',
      expected: 'Expected filter to be key="value": SrcK8S_Type="Pod"=wrong',
    },
    {
      query: 'netflow:network:{SrcK8S_Type}',
      expected: 'Expected filter to be key="value": SrcK8S_Type',
    },
  ])('expect error fromQuery($query)', ({ query, expected }) => {
    expect(() => NetflowNode.fromQuery(query)).toThrow(expected);
  });
});

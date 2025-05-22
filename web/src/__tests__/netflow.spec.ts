import { NetflowDomain } from '../korrel8r/netflow';
import { Constraint, Query, URIRef } from '../korrel8r/types';

// Korrel8r queries contain less information than console URLs.
// Round-trip conversion is not always equal.
// The following pairs _can_ round trip, and are testsed in both directions.
// The tests for fromURL and fromQuery test asymmetric cases.
const roundTrip = [
  {
    query: 'netflow:network:{SrcK8S_Type="Pod",SrcK8S_Namespace="myNamespace"}',
    url: `netflow-traffic?tenant=network&filters=${encodeURIComponent(
      'src_kind=Pod;src_namespace=myNamespace',
    )}&startTime=1742896800&endTime=1742940000`,
    constraint: {
      start: '2025-03-25T10:00:00.000Z',
      end: '2025-03-25T22:00:00.000Z',
    },
  },
  {
    url: 'netflow-traffic?tenant=network&filters=src_namespace%3Dnetobserv&startTime=1742896800&endTime=1742940000',
    query: 'netflow:network:{SrcK8S_Namespace="netobserv"}',
    constraint: {
      start: '2025-03-25T10:00:00.000Z',
      end: '2025-03-25T22:00:00.000Z',
    },
  },
  {
    url: 'netflow-traffic?tenant=network&filters=src_namespace%3Dnetobserv',
    query: 'netflow:network:{SrcK8S_Namespace="netobserv"}',
  },
];

describe('NetflowNode.fromQuery', () => {
  it.each([
    ...roundTrip,
    {
      url: `netflow-traffic?tenant=network&filters=${encodeURIComponent(
        'src_namespace=foo',
      )}&startTime=1742896800&endTime=1742940000`,
      query: 'netflow:network:{InvalidKey="Pod",SrcK8S_Namespace="foo"}',
      constraint: {
        start: '2025-03-25T10:00:00.000Z',
        end: '2025-03-25T22:00:00.000Z',
      },
    },
  ])(`from $query`, ({ query, url, constraint }) =>
    expect(
      new NetflowDomain().queryToLink(Query.parse(query), Constraint.fromAPI(constraint)),
    ).toEqual(url),
  );
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
  ])(`from $url`, ({ query, url }) =>
    expect(new NetflowDomain().linkToQuery(new URIRef(url))).toEqual(Query.parse(query)),
  );
});

describe('', () => {
  it.each([
    {
      url: 'netflow-traffi',
      expected: 'domain netflow: invalid link: netflow-traffi',
    },
  ])('expect error fromURL($url)', ({ url, expected }) => {
    expect(() => new NetflowDomain().linkToQuery(new URIRef(url))).toThrow(expected);
  });

  it.each([
    {
      query: 'netflo',
      expected: 'invalid query: netflo',
    },
    {
      query: 'netflow:incorrect:{}',
      expected: 'invalid query, unknown class: netflow:incorrect:{}',
    },
    {
      query: 'netflow:network:{SrcK8S_Type="Pod"=wrong}',
      expected: 'domain netflow: invalid query: netflow:network:{SrcK8S_Type="Pod"=wrong}',
    },
    {
      query: 'netflow:network:{SrcK8S_Type}',
      expected: 'domain netflow: invalid query: netflow:network:{SrcK8S_Type}',
    },
  ])('expect error fromQuery($query)', ({ query, expected }) => {
    expect(() => new NetflowDomain().queryToLink(Query.parse(query))).toThrow(expected);
  });
});

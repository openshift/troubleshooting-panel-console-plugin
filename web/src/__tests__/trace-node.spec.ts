import { TraceNode } from '../korrel8r/trace';

const tempo = 'namespace=openshift-tracing&name=platform&tenant=platform';

const roundtrip = [
  {
    url: `observe/traces?${tempo}`,
    query: `trace:span:{}`,
  },
  {
    url: `observe/traces?${tempo}&q=%7Bresource.service.name%3D%22article-service%22%7D`,
    query: `trace:span:{resource.service.name="article-service"}`,
  },
  {
    url: `observe/traces/1599dfd76bc896101a9811857ae3c3c9?${tempo}`,
    query: `trace:span:{trace:id="1599dfd76bc896101a9811857ae3c3c9"}`,
  },
];

describe('TraceNode.fromURL', () => {
  it.each([
    ...roundtrip,
    {
      url: `observe/traces`,
      query: `trace:span:{}`,
    },
  ])('$url', ({ url, query }) => expect(TraceNode.fromURL(url)?.toQuery()).toEqual(query));
});

describe('TraceNode.fromQuery', () => {
  it.each([
    ...roundtrip,
    {
      query: `trace:span:{resource.service.name="shop-backend"}`,
      url: `observe/traces?${tempo}&q=%7Bresource.service.name%3D%22shop-backend%22%7D`,
    },
  ])('$query', ({ query, url }) => {
    expect(TraceNode.fromQuery(query).toURL()).toEqual(url);
  });
});

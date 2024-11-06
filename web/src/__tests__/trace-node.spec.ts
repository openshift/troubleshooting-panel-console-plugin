import { TraceNode } from '../korrel8r/trace';

const roundtrip = [
  {
    url:
      `observe/traces?name=platform&namespace=openshift-tracing&tenant=platform&` +
      `q=${encodeURIComponent('{resource.service.name = "article-service"}')}`,
    query: `trace:trace:{resource.service.name = "article-service"}`,
  },
];

describe('TraceNode.fromURL', () => {
  it.each(roundtrip)('$url', ({ url, query }) =>
    expect(TraceNode.fromURL(url)?.toQuery()).toEqual(query),
  );
});

describe('TraceNode.fromQuery', () => {
  it.each(roundtrip)('$query', ({ query, url }) =>
    expect(TraceNode.fromQuery(query)?.toURL()).toEqual(url),
  );

  it('Query => URL => Query', () => {
    const query = 'trace:trace:{resource.service.name="shop-backend"}';
    const expectedKorrel8rURL =
      'observe/traces?name=platform&namespace=openshift-tracing&tenant=platform&' +
      'q=%7Bresource.service.name%3D%22shop-backend%22%7D';
    const actualKorrel8rURL = TraceNode.fromQuery(query)?.toURL();
    expect(actualKorrel8rURL).toEqual(expectedKorrel8rURL);
    expect(TraceNode.fromURL(actualKorrel8rURL)?.toQuery()).toEqual(query);
  });
});

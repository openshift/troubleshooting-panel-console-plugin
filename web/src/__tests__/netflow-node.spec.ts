import { NetflowNode } from '../korrel8r/netflow';

/**
 * Use example query from korrel8r docs
 *
 * https://github.com/korrel8r/korrel8r/blob/main/pkg/domains/netflow/netflow.go
 */
describe('Test NetflowNode Parsing', () => {
  it('URL => Query => URL => Query', () => {
    const url =
      'netflow-traffic?q={SrcK8S_Type="Pod", SrcK8S_Namespace="myNamespace"}|json&tenant=network&timeRange=300&limit=5&filters=src_kind="Pod";src_namespace="myNamespace"';
    const expectedQuery = 'netflow:network:{SrcK8S_Type="Pod", SrcK8S_Namespace="myNamespace"}';
    const actualQuery = NetflowNode.fromURL(url)?.toQuery();

    // The original URL contains extra parameters that we don't want to match on, so do an extra
    // loop to check that the query is the same
    const intermediaryURL = NetflowNode.fromQuery(expectedQuery)?.toURL();
    const secondaryQuery = NetflowNode.fromURL(intermediaryURL)?.toQuery();
    expect(actualQuery).toEqual(expectedQuery);
    expect(actualQuery).toEqual(secondaryQuery);
  });
  it('URL => Query => URL => Query', () => {
    const url =
      'netflow-traffic?q={SrcK8S_Namespace="netobserv"}|json&tenant=network&filters=src_namespace="netobserv"';
    const expectedQuery = 'netflow:network:{SrcK8S_Namespace="netobserv"}';
    const actualQuery = NetflowNode.fromURL(url)?.toQuery();

    // The original URL contains extra parameters that we don't want to match on, so do an extra
    // loop to check that the query is the same
    const intermediaryURL = NetflowNode.fromQuery(expectedQuery)?.toURL();
    const secondaryQuery = NetflowNode.fromURL(intermediaryURL)?.toQuery();
    expect(actualQuery).toEqual(expectedQuery);
    expect(actualQuery).toEqual(secondaryQuery);
  });

  it('Query => URL => Query', () => {
    const query = 'netflow:network:{SrcK8S_Type="Pod", SrcK8S_Namespace="myNamespace"}';
    const expectedURL =
      'netflow-traffic?q={SrcK8S_Type="Pod", SrcK8S_Namespace="myNamespace"}|json&tenant=network&filters=src_kind="Pod";src_namespace="myNamespace"';
    const actualURL = NetflowNode.fromQuery(query)?.toURL();
    expect(actualURL).toEqual(expectedURL);
    expect(NetflowNode.fromURL(actualURL)?.toQuery()).toEqual(query);
  });

  it('Test Query negation parsing', () => {
    const query = 'netflow:network:{SrcK8S_Type!="Pod", SrcK8S_Namespace!="myNamespace"}';
    const expectedURL =
      'netflow-traffic?q={SrcK8S_Type!="Pod", SrcK8S_Namespace!="myNamespace"}|json&tenant=network&filters=src_kind!="Pod";src_namespace!="myNamespace"';
    const actualURL = NetflowNode.fromQuery(query)?.toURL();
    expect(actualURL).toEqual(expectedURL);
    expect(NetflowNode.fromURL(actualURL)?.toQuery()).toEqual(query);
  });

  it('Test url to query parsing with expected errors', () => {
    [
      {
        url: 'netflow-traffi',
        expected: 'Expected url to start with netflow-traffic',
      },
      {
        url: 'netflow-traffic',
        expected: 'Expected URL to contain query parameters',
      },
      {
        url: 'netflow-traffic?',
        expected: 'Expected URL to contain query parameters',
      },
      {
        url: 'netflow-traffic?q={SrcK8S_Type="Pod", SrcK8S_Namespace="myNamespace"}|json',
        expected: 'Expected query to contain netflow class',
      },
      {
        url: 'netflow-traffic?tenant=network',
        expected: 'Expected more than 0 relevant query parameters',
      },
    ].forEach(({ url, expected }) => {
      expect(() => NetflowNode.fromURL(url)).toThrow(expected);
    });
  });

  it('Test query to url parsing with expected errors', () => {
    [
      {
        query: 'netflo',
        expected: 'Expected query to start with netflow:',
      },
      {
        query: 'netflow:',
        expected: 'Expected query to contain class',
      },
      {
        query: 'netflow:incorrect',
        expected: 'Expected netflow class to be network',
      },
      {
        query: 'netflow:network:',
        expected: 'Expected more than 0 relevant query parameters',
      },
      {
        query: 'netflow:network:{}',
        expected: 'Expected more than 0 relevant query parameters',
      },
      {
        query: 'netflow:network:{SrcK8S_Type="Pod"=wrong}',
        expected: 'Expected filter to be in the format key=value',
      },
      {
        query: 'netflow:network:{SrcK8S_Type}',
        expected: 'Expected filter to be in the format key=value',
      },
      {
        query: 'netflow:network:{InvalidKey="Pod"}',
        expected: 'Unknown filter key: InvalidKey',
      },
    ].forEach(({ query, expected }) => {
      expect(() => NetflowNode.fromQuery(query)).toThrow(expected);
    });
  });
});

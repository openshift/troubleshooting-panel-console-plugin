import { Korrel8rNode } from './korrel8r.types';
import { parseQuery, parseURL } from './query-url';

// URL formats:
// Get all spans in a single trace:
//   observe/traces/<trace-id>
// Search for get selected spans
//   observe/traces/?namespace=<tempoNamespace>&name=<tempoName>&tenant=<tempoTenant>&q=<traceQL>

// TODO hard-coded tempo location, need to make this configurable between console & korrel8r.
// Get from the console page environment (change from using URL as context?)
const [tempoNamespace, tempoName, tempoTenant] = ['openshift-tracing', 'platform', 'platform'];

export class TraceNode extends Korrel8rNode {
  query: string;
  url: string;

  constructor(url: string, query: string) {
    super();
    this.query = query;
    this.url = url;
  }

  static fromURL(url: string): Korrel8rNode {
    const [urlPath, params] = parseURL('trace', 'observe/traces', url);
    const traceID = urlPath.match(/observe\/traces\/([0-9a-fA-F]{32})(\/.*)?$/)?.[1];
    const traceQL = traceID ? `{trace:id="${traceID}"}` : params.get('q') || '{}';
    return new TraceNode(url, `trace:span:${traceQL}`);
  }

  static fromQuery(query: string): Korrel8rNode {
    const traceQL = parseQuery('trace', query)?.[1] || '';
    const traceID = traceQL.match(/\{ *trace:id *= *"([0-9a-fA-F]{32})" *\}/)?.[1] || '';
    const q = traceID || traceQL.match(/\{ *\}/) ? '' : `&q=${encodeURIComponent(traceQL)}`;
    return new TraceNode(
      `observe/traces${
        traceID && `/${traceID}`
      }?namespace=${tempoNamespace}&name=${tempoName}&tenant=${tempoTenant}${q}`,
      query,
    );
  }

  toURL(): string {
    return this.url;
  }

  toQuery(): string {
    return this.query;
  }
}

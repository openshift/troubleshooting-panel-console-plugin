/** Type-safe versions of the Korrel8r API types. */
import * as api from './client';

export class Class {
  constructor(public domain: string, public name: string) {}

  query(selector: string) {
    return new Query(this, selector);
  }

  // Parse a full class name "domain:className".
  // @throws {TypeError} if it is not a valid Korrel8r class name.
  static parse(fullName: string): Class {
    const m = fullName?.match(/^([^:]+):([^:]+)$/);
    if (!m) throw new TypeError(`invalid class: ${fullName}`);
    return new Class(m[1], m[2]);
  }

  toString(): string {
    return `${this.domain}:${this.name}`;
  }
}

export class Query {
  class: Class;
  selector: string;

  constructor(c: Class, selector: string) {
    this.class = c;
    this.selector = selector;
  }

  // Parse a full query name "domain:class:selector".
  // @throws (TypeError) if it is not a valid Korrel8r query.
  static parse(query: string): Query {
    const m = query.match(/^([^:]+):([^:]+):(.+)$/);
    if (!m) throw new TypeError(`invalid query: ${query}`);
    return new Query(new Class(m[1], m[2]), m[3]);
  }

  // Convert tog string.
  toString(): string {
    return `${this.class}:${this.selector}`;
  }
}

// Parse a date, return undefined if not valid rather than NaN or an invalid Date.
const parseDate = (s: string): Date | undefined => {
  const d = new Date(s);
  return d?.valueOf() ? d : undefined;
};

// Parse a number, return undefined if invalid, rather than NaN.
const parseNumber = (s: string): number | undefined => (s && Number(s)) || undefined;

export class Constraint {
  public start?: Date;
  public end?: Date;
  public limit?: number;
  /** NOTE timeout is in nanoseconds */
  public timeoutNS?: number;

  constructor(args: Partial<Constraint> = {}) {
    Object.assign(this, args);
  }

  static fromAPI(ac: api.Constraint): Constraint {
    return new Constraint({
      start: parseDate(ac?.start),
      end: parseDate(ac?.end),
      limit: ac?.limit || undefined,
      timeoutNS: parseNumber(ac?.timeout),
    });
  }

  toAPI(): api.Constraint {
    return {
      start: this?.start?.toISOString() || undefined,
      end: this?.end?.toISOString() || undefined,
      limit: this?.limit || undefined,
      timeout: this?.timeoutNS?.toString() || undefined,
    };
  }

  /** Return the timeout in seconds, with a fractional part */
  timeout(): number {
    return this.timeoutNS / (1000 * 1000) || undefined;
  }
}

// Domain converts between Korrel8r queries and URLs for a Korrel8r domain.
export abstract class Domain {
  constructor(public name: string) {}

  /** Construct a Class object for this domain.
   * @throw {TypeError} if the name is not valid.
   */
  abstract class(name: string): Class | undefined;

  // Convert a URI reference to a Query.
  // @throws {TypeError} if the conversion fails.
  abstract linkToQuery(link: URIRef): Query;

  // Convert a Query to a relative URI reference.
  // @throws {TypeError} if the conversion fails.
  abstract queryToLink(query: Query, constraint?: Constraint): string;

  protected error(msg: string): TypeError {
    return new TypeError(`domain ${this.name}: ${msg}`);
  }
  protected badClass(name: string, msg?: string): TypeError {
    return this.error(`invalid class${msg ? ', ' + msg : ''}: ${name}`);
  }
  protected badQuery(q: Query, msg?: string): TypeError {
    return this.error(`invalid query${msg ? ', ' + msg : ''}: ${q}`);
  }
  protected badLink(link: URIRef, msg?: string): TypeError {
    return this.error(`invalid link${msg ? ', ' + msg : ''}: ${link}`);
  }

  protected checkQuery(q: Query): Query {
    if (q.class.domain != this.name) throw this.badQuery(q, 'wrong domain');
    q.class = this.class(q.class.name); // Validate and normalize
    return q;
  }
}

// URIRef is a relative URI reference.
// This is the `path?query#hash` part of a URL, with no `scheme://authority` part.
// Korrel8r queries are translated into links of this form.
export class URIRef {
  pathname: string;
  searchParams: URLSearchParams;
  hash: string;

  // Parse a URI reference.
  // @param link: a URI reference string to parse.
  // @param moreParams: additional searchParams to add.
  //   Replaces parameters parsed from the string if names match.
  // @throws {TypeError} if invalid.
  constructor(link: string, moreParams?: object) {
    // Use the URL Parser. It requires an absolute base URL so use a dummy.
    const url = new URL(link, 'http://invalid');
    if (link?.at(0) == '/') {
      this.pathname = url.pathname; // absolute
    } else {
      this.pathname = url.pathname.slice(1); // relative
    }
    this.searchParams = url.searchParams;
    this.hash = url.hash;
    if (moreParams) {
      for (const [k, v] of Object.entries(moreParams)) {
        if (k && v) {
          this.searchParams.append(k, v);
        }
      }
    }
  }

  // Resolve the URIRef against a base URL, return a URL.
  // @throw {TypeError} same as `new URL`
  resolve(base: string): URL {
    return new URL(this.toString(), base);
  }

  toString(): string {
    const search = this.searchParams.toString();
    return `${this.pathname}${search && '?'}${search}${this.hash}`;
  }
}

// Encode an object as a comma-separated, key=value list: 'key=value,key=value...'. No URI encoding.
export const keyValueList = (obj: { [key: string]: string }): string => {
  return Object.keys(obj || {})
    .map((k) => `${k}=${obj[k]}`)
    .join(',');
};

// Parse a key-value list: 'key=value,key=value...'
export const parseKeyValueList = (list: string): { [key: string]: string } => {
  const obj = {};
  if (list) {
    list.split(',').forEach((kv: string) => {
      const [k, v] = kv?.split('=') || [];
      if (k && v) obj[k] = v;
    });
  }
  return obj;
};

// Domains is a set domains used to convert between Query and Link.
// Conversion succeeds if it succees on any domain in the set.
export class Domains {
  domains: Map<string, Domain>;

  constructor(...domains: Domain[]) {
    this.domains = new Map<string, Domain>();
    for (const d of domains) this.set(d);
  }

  // Add a domain to the set.
  set(domain: Domain) {
    this.domains.set(domain.name, domain);
  }

  // Get a domain by name.
  get(name: string): Domain {
    return this.domains.get(name);
  }

  // Convert URI Reference to korrel8r query, try all available domains.
  // See {@link Domain#linkToQuery}
  // @throws {TypeError} if the url cannot be converted.
  linkToQuery(link: URIRef): Query {
    for (const domain of this.domains.values()) {
      try {
        return domain.linkToQuery(link);
      } catch (_) {
        true;
      }
    }
    throw new TypeError(`cannot convert link: ${link}`);
  }

  // Convert a korrel8r query to a relative URI Reference, try all available domains.
  // See {@link Domain#queryToLink}
  // @throws {TypeError} if the query cannot be converted.
  queryToLink(query: Query, constraint?: Constraint): string {
    const domain = this.get(query?.class?.domain);
    if (!domain) throw new TypeError(`unknown domain in query: ${query.toString()}`);
    return domain.queryToLink(query, constraint);
  }
}

/** Integer unix millisecond timestamp. */
export const unixMilliseconds = (d: Date | undefined): number | undefined => {
  return d?.getTime() || undefined;
};

/** Integer unix seconds timestamp. */
export const unixSeconds = (d: Date | undefined): number | undefined => {
  return Math.floor(unixMilliseconds(d) / 1000) || undefined;
};

export class Node {
  id: string;
  count: number;
  class: Class;
  queries: Array<QueryCount>;
  error: Error;

  /** Construct a type-safe node from an API node.
   *  Does not throw, sets the `error` field on error.
   */
  constructor(node: api.Node) {
    this.id = node.class;
    this.count = node.count;
    try {
      this.class = Class.parse(node.class);
    } catch (e) {
      this.error = e;
    }
    this.queries = QueryCount.array(node.queries ?? []);
  }
}

export class Edge {
  constructor(public start: Node, public goal: Node, public rules: Rule[] = []) {}
}

export class QueryCount {
  query: Query;
  count: number;
  error: Error;

  /**
   * Sets #error if the query cannot be converted to a link. Does not throw.
   */
  constructor(qc: api.QueryCount) {
    try {
      this.count = qc.count;
      this.query = Query.parse(qc.query);
    } catch (e) {
      this.error = e;
    }
  }

  /** Highest count first, errors last */
  static compare(a: QueryCount, b: QueryCount): number {
    let d = (b.error ? 1 : 0) - (a.error ? 1 : 0);
    if (d === 0) d = b.count - a.count;
    return d;
  }

  static array(a: api.QueryCount[]): QueryCount[] {
    return (
      a?.map((qc: api.QueryCount): QueryCount => new QueryCount(qc))?.sort(QueryCount.compare) ?? []
    );
  }
}

export class Rule {
  name: string;
  queries: QueryCount[];

  constructor(r: api.Rule) {
    this.name = r.name;
    this.queries = QueryCount.array(r.queries);
  }

  static array(a: api.Rule[]) {
    return a?.map((r) => new Rule(r)) ?? [];
  }
}

export class Graph {
  nodes: Array<Node>;
  edges: Array<Edge>;

  private nodeByClass: Map<string, Node>;

  constructor(graph: api.Graph) {
    this.nodeByClass = new Map();
    this.nodes = (graph?.nodes ?? []).map((n) => {
      const node = new Node(n);
      this.nodeByClass[n.class] = node;
      return node;
    });
    this.edges = (graph?.edges ?? [])
      .map((e) => new Edge(this.node(e.start), this.node(e.goal), Rule.array(e.rules)))
      .filter((e) => e.start && e.goal);
  }

  node(id: string): Node {
    return this.nodeByClass[id];
  }
}

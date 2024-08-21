import { NodeError } from './korrel8r.types';

// Return URL path and query parameters. Throw if URL does not match pattern.
export const parseURL = (
  domain: string,
  pattern: string,
  url: string,
): [path: string, params: URLSearchParams] => {
  if (pattern && !url.match(new RegExp(`(${pattern})([/?]|$)`))) {
    throw new NodeError(`Expected ${domain} URL: ${url}`);
  }
  try {
    const u = new URL(url, 'http://dummy'); // Need dummy scheme & host for URL parser.
    return [u.pathname, u.searchParams];
  } catch (err) {
    throw new NodeError(`Expected ${domain} URL: {err.message}: ${url}`);
  }
};

// Return the short class name and data section of the query. Throw if it doesn't match the domain.
export const parseQuery = (domain: string, query: string): [clazz: string, data: string] => {
  const [, domain2, clazz, data] = query.match(/^([^:]+):([^:]+):(.+)$/) ?? [];
  if (domain2 != domain) throw new NodeError(`Expected ${domain} query: ${query}`);
  return [clazz, data];
};

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

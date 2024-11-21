import { Korrel8rNode } from './korrel8r.types';

export class InvalidNode extends Korrel8rNode {
  query: string;
  url: string;

  constructor(url: string, query: string) {
    super();
    this.query = query;
    this.url = url;
  }

  static fromURL(url: string): Korrel8rNode {
    return new InvalidNode(url, '');
  }

  static fromQuery(query: string): Korrel8rNode {
    return new InvalidNode('', query);
  }

  toURL(): string {
    return this.url;
  }

  toQuery(): string {
    return this.query;
  }
}

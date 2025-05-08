// Type declarations to assist with Express
declare module 'express' {
  export interface Request {
    body: any;
  }
  export interface Response {
    status(code: number): Response;
    json(body: any): Response;
  }
}

declare module 'cors' {
  function cors(): any;
  export = cors;
}

declare module 'body-parser' {
  namespace bodyParser {
    export function json(options?: any): any;
  }
  export = bodyParser;
} 
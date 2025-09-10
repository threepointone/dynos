import { WorkerEntrypoint } from "cloudflare:workers";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    const worker = env.LOADER.get(`${url.pathname}-${Math.random()}`, () => {
      return {
        compatibilityDate: "2025-06-01",
        compatibilityFlags: ["nodejs_compat"],
        mainModule: "foo.js",
        modules: {
          "foo.js": `
          // import node builtins
          import util from "node:util";
          
          console.log("test util.isDeepStrictEqual", util.isDeepStrictEqual({
            a: 1,
            b: 2,
            c: 3,
          }, {
            a: 1,
            b: 2,
            c: 3,
          }));

          // import other modules
          import bar from "./bar.js";
          console.log('imported bar', bar);

          // use bindings
          import { env } from "cloudflare:workers";

          // text bindings work
          console.log("env.TEXT", env.TEXT);

          // json bindings work
          console.log("env.JSON", env.JSON);

          // can call services... soon


          export default {
              async fetch(req) {                 
                // fetches can be controlled by the worker
                const response1 = await fetch("http://example.com");
                console.log("response from example.com", (await response1.text()).substring(0, 100) + "...");

                const response2 = await fetch("http://example.com/sub-path");
                console.log("response from example.com/sub-path", await response2.text());

                return new Response('Hello from ${url.pathname}!'); 
              }
            }`,
          // define other modules
          "bar.js": `
          export default 123;`,
        },
        env: {
          TEXT: `A string from the env ${Math.random()}`,
          JSON: {
            d: 123,
            e: "string",
            f: true,
            g: null,
            h: undefined,
          },
          // GreeterLoopback: env.GreeterLoopback,
        },
        globalOutbound: env.globalOutbound,
      };
    });

    // Now you can get its entrypoint.
    const defaultEntrypoint = worker.getEntrypoint();
    return await defaultEntrypoint.fetch(request);
  },
};

export const globalOutbound = {
  fetch: async (
    input: string | URL | Request,
    init?: RequestInit<CfProperties<unknown>> | undefined
  ): Promise<Response> => {
    const url = new URL(
      typeof input === "string"
        ? input
        : typeof input === "object" && "url" in input
        ? input.url
        : input.toString()
    );
    if (url.hostname === "example.com" && url.pathname === "/sub-path") {
      return new Response("Not allowed", { status: 403 });
    }
    return fetch(input, init);
  },
};

export class GreeterLoopback extends WorkerEntrypoint {
  async greet(name: string) {
    return `${this.ctx.props.greeting}, ${name}!`;
  }
}

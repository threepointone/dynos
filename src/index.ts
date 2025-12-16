import { WorkerEntrypoint } from "cloudflare:workers";

// inline this until enable_ctx_exports is supported by default
declare global {
  interface ExecutionContext<Props = unknown> {
    readonly exports: Cloudflare.Exports;
    readonly props: Props;
  }

  interface DurableObjectState<Props = unknown> {
    readonly exports: Cloudflare.Exports;
    readonly props: Props;
  }
}

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

          console.log("> All of this is logged from inside an 'evaled' dynamic worker");
          
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
          import { env, WorkerEntrypoint } from "cloudflare:workers";

          // text bindings work
          console.log("env.TEXT", env.TEXT);

          // json bindings work
          console.log("env.JSON", env.JSON);

          // can call services... soon

          export class SomeFunctions extends WorkerEntrypoint {
            async multiply(a, b) {
              return a * b;
            }
          }

          export default {
              async fetch(req) {                 
                // fetches can be controlled by the worker
                const response1 = await fetch("http://example.com");
                console.log("response from example.com", (await response1.text()).substring(0, 100) + "...");

                const response2 = await fetch("http://example.com/sub-path");
                console.log("response from example.com/sub-path", await response2.text());

                // call exposed functions 

                console.log("exposed.addNumbers(1, 2)", await env.exposed.addNumbers(1, 2));

                console.log("exposed.spongeBobText('Hello, world!')", await env.exposed.spongeBobText("Hello, world!"));

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
          exposed: ctx.exports.ExposeSomeFunctions({
            // you could also pass props here that will be available as this.props inside the class
          }),
        },
        // null blocks all outgoing fetches
        // globalOutbound: null,

        globalOutbound: env.GlobalOutbound,
      };
    });

    // Now you can get its entrypoint.
    const defaultEntrypoint = worker.getEntrypoint();

    // or you can get the entrypoint for a specific class
    const someFunctionsEntrypoint = worker.getEntrypoint("SomeFunctions");

    console.log(
      "someFunctionsEntrypoint",
      // @ts-expect-error - we need a better way to type this
      await someFunctionsEntrypoint.multiply(2, 3)
    );

    // we use fetch here, but you could also just define a WorkerEntrypoint and call rpc functions on it
    return await defaultEntrypoint.fetch(request);
  },
};

export class ExposeSomeFunctions extends WorkerEntrypoint {
  async addNumbers(a: number, b: number) {
    return a + b;
  }
  async spongeBobText(text: string) {
    let result = "";
    for (const char of text) {
      result += Math.random() > 0.5 ? char.toUpperCase() : char.toLowerCase();
    }
    return result;
  }
}

export class GlobalOutbound extends WorkerEntrypoint {
  async fetch(
    input: string | URL | Request,
    init?: RequestInit<CfProperties<unknown>> | undefined
  ): Promise<Response> {
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
  }
}

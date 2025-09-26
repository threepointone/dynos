# Dynos - Dynamic Workers in Cloudflare

A demonstration of Cloudflare's new **Worker Loaders** feature, showcasing how to dynamically create and execute workers at runtime. This project explores the capabilities of creating workers on-demand with custom modules, environment bindings, and service integrations.

## 🚀 Features

- **Dynamic Worker Creation**: Create workers programmatically using the `LOADER` binding
- **Custom Module System**: Define and import custom JavaScript modules within dynamic workers
- **Environment Bindings**: Pass environment variables, JSON objects, and service bindings to dynamic workers
- **Service Integration**: Expose functions and services that can be called from within dynamic workers
- **Network Control**: Implement custom fetch behavior with global outbound controls
- **Node.js Compatibility**: Full Node.js built-in module support within dynamic workers

## 🏗️ Architecture

This project consists of:

1. **Main Worker** (`src/index.ts`): The primary worker that creates and manages dynamic workers
2. **Worker Loader**: Uses Cloudflare's `LOADER` binding to instantiate workers on-demand
3. **Service Exports**: Exposes utility functions that can be called from dynamic workers
4. **Global Outbound**: Custom fetch implementation for controlling network requests

## 🛠️ Setup

```bash
npm install
npm start
```

## 📖 How It Works

### Dynamic Worker Creation

The main worker creates dynamic workers using the `LOADER` binding:

```typescript
const worker = env.LOADER.get(`${url.pathname}-${Math.random()}`, () => {
  return {
    compatibilityDate: "2025-06-01",
    compatibilityFlags: ["nodejs_compat"],
    mainModule: "foo.js",
    modules: {
      "foo.js": `/* Your dynamic worker code */`,
      "bar.js": `/* Additional modules */`,
    },
    env: {
      TEXT: "Environment variable",
      JSON: {
        /* JSON binding */
      },
      exposed: ctx.exports.ExposeSomeFunctions(),
    },
  };
});
```

### Custom Modules

Dynamic workers can define and import custom modules:

```javascript
// Inside dynamic worker
import bar from "./bar.js";
import util from "node:util";

export default {
  async fetch(req) {
    // Worker logic here
    return new Response("Hello from dynamic worker!");
  },
};
```

### Service Integration

The main worker exposes services that can be called from dynamic workers:

```typescript
export class ExposeSomeFunctions extends WorkerEntrypoint {
  async addNumbers(a: number, b: number) {
    return a + b;
  }

  async spongeBobText(text: string) {
    // SpongeBob case transformation
    return text
      .split("")
      .map((char) =>
        Math.random() > 0.5 ? char.toUpperCase() : char.toLowerCase()
      )
      .join("");
  }
}
```

### Network Control

Global outbound controls allow customizing fetch behavior:

```typescript
export const globalOutbound = {
  fetch: async (input, init) => {
    const url = new URL(input);
    if (url.hostname === "example.com" && url.pathname === "/sub-path") {
      return new Response("Not allowed", { status: 403 });
    }
    return fetch(input, init);
  },
};
```

## 🔧 Configuration

The project uses several Cloudflare Workers features:

- **Worker Loaders**: For dynamic worker creation
- **Durable Objects**: For stateful operations
- **KV Storage**: For key-value data
- **Services**: For inter-worker communication
- **Migrations**: For database schema management

See `wrangler.jsonc` for complete configuration.

## 🧪 Testing

The dynamic workers demonstrate:

1. **Node.js Built-ins**: Using `util.isDeepStrictEqual()` and other Node.js modules
2. **Custom Modules**: Importing and using custom JavaScript modules
3. **Environment Access**: Reading environment variables and JSON bindings
4. **Service Calls**: Calling exposed functions from the main worker
5. **Network Requests**: Making controlled fetch requests
6. **Response Generation**: Creating custom HTTP responses

## 🤔 Use Cases

This technology enables:

- **Plugin Systems**: Dynamic code execution for extensible applications
- **User Scripts**: Safe execution of user-provided code
- **Microservices**: On-demand service creation
- **A/B Testing**: Dynamic feature toggling
- **Code Sandboxing**: Isolated execution environments

## 🔒 Security Considerations

- Dynamic workers run in isolated environments
- Network access can be controlled via global outbound
- Environment bindings provide controlled access to resources
- Service calls are authenticated and authorized

## 📄 License

ISC License - see package.json for details.

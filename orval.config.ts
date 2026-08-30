import { defineConfig } from 'orval'

const openApiSchema = process.env.OPENAPI_SCHEMA?.trim()

if (!openApiSchema) {
  throw new Error(
    'OPENAPI_SCHEMA is required. Point it to the backend-owned OpenAPI file or URL; no schema is bundled in Phase 1.',
  )
}

export default defineConfig({
  api: {
    input: {
      target: openApiSchema,
      filters: {
        mode: 'include',
        tags: [/^Volo/u],
      },
    },
    output: {
      target: './src/api/generated/endpoints.ts',
      schemas: './src/api/generated/models',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      prettier: true,
      override: {
        fetch: {
          includeHttpResponseReturnType: false,
        },
        query: {
          signal: false,
        },
        mutator: {
          path: './src/api/client.ts',
          name: 'apiFetch',
        },
      },
    },
  },
})

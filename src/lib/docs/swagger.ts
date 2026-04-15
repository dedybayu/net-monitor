import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = () => {
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api', // Lokasi API route Anda
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Next.js API Documentation',
        version: '1.0',
      },
    },
  });
  return spec;
};
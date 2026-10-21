import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';

/**
 * jest-openapi (openapi-validator 0.14) só valida documentos OpenAPI 2/3.0. O contrato é 3.1, mas evita construções
 * exclusivas de 3.1 (sem `null`, sem `oneOf`); aqui ele é convertido em memória para 3.0.3 sem mudar nenhum schema.
 */
export function loadSpecAs30(): Record<string, any> {
  const file = path.join(__dirname, '../../../../packages/contracts/openapi.yaml');
  const doc = yaml.load(fs.readFileSync(file, 'utf8')) as Record<string, any>;
  doc.openapi = '3.0.3';
  delete doc.info.summary;
  delete doc.jsonSchemaDialect;
  const walk = (node: any): void => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    // 3.1 permite `examples` (array) em schemas; 3.0 não.
    if (Array.isArray(node.examples) && (node.type || node.properties)) delete node.examples;
    if (Array.isArray(node.type)) node.type = node.type.find((t: string) => t !== 'null');
    if (node.$ref && Object.keys(node).length > 1) for (const k of Object.keys(node)) if (k !== '$ref') delete node[k];
    for (const v of Object.values(node)) walk(v);
  };
  walk(doc);
  return doc;
}

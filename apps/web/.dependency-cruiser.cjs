const path = require('path');

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'domain-clean-architecture-no-infra',
      comment:
        'ADR-002 §3: lib/** (salvo lib/infra/**) no puede importar @supabase/* ni openai. Deuda documentada: lib/supabase.ts y lib/openaiModels.ts eximidos por ruta.',
      severity: 'error',
      from: {
        path: '(?:^|/)lib/',
        pathNot: [
          '(?:^|/)lib/infra/',
          'supabase\\.ts$',
          'openaiModels\\.ts$'
        ]
      },
      to: {
        path: 'node_modules/(@supabase|openai)|^(@supabase|openai)'
      }
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules'
    },
    tsConfig: {
      fileName: path.resolve(__dirname, 'tsconfig.json')
    },
    tsPreCompilationDeps: true
  }
};

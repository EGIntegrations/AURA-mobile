import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'overview',
    'architecture',
    'mobile-app',
    'services-integrations',
    'backend-api-contract',
    'auth-security',
    'data-storage',
    'permissions-privacy',
    'deployment',
    'ci-cd',
    'operations',
    'troubleshooting',
    {
      type: 'category',
      label: 'Code Reference',
      items: ['code-reference/index', 'code-reference/generated-files'],
    },
    'legacy-archive',
  ],
};

export default sidebars;

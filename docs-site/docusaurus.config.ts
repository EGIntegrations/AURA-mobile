import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'AURA Documentation',
  tagline: 'Autism Understanding and Recognition Assistant platform docs',
  favicon: 'img/aura-icon.png',

  future: {
    v4: true,
  },

  url: 'https://aura-site-3l69adydm-egod21s-projects.vercel.app',
  baseUrl: '/',
  organizationName: 'EGIntegrations',
  projectName: 'AURA-mobile',

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/docs',
          editUrl:
            'https://github.com/EGIntegrations/AURA-mobile/tree/main/docs-site/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/aura-splash.png',
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'AURA Docs',
      logo: {
        alt: 'AURA logo',
        src: 'img/aura-icon.png',
      },
      items: [
        {to: '/docs/overview', label: 'Overview', position: 'left'},
        {to: '/docs/architecture', label: 'Architecture', position: 'left'},
        {to: '/docs/mobile-app', label: 'Mobile App', position: 'left'},
        {to: '/docs/backend-api-contract', label: 'API', position: 'left'},
        {to: '/docs/deployment', label: 'Deployment', position: 'left'},
        {
          href: 'https://github.com/EGIntegrations/AURA-mobile',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'AURA',
          items: [
            {label: 'System Overview', to: '/docs/overview'},
            {label: 'Operations', to: '/docs/operations'},
            {label: 'Troubleshooting', to: '/docs/troubleshooting'},
          ],
        },
        {
          title: 'Platform',
          items: [
            {label: 'Backend API Contract', to: '/docs/backend-api-contract'},
            {label: 'Auth and Security', to: '/docs/auth-security'},
            {label: 'Permissions and Privacy', to: '/docs/permissions-privacy'},
          ],
        },
        {
          title: 'Delivery',
          items: [
            {label: 'Deployment', to: '/docs/deployment'},
            {label: 'CI/CD', to: '/docs/ci-cd'},
            {label: 'Repository', href: 'https://github.com/EGIntegrations/AURA-mobile'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} EG Integrations. AURA Documentation.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;

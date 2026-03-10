import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';

import styles from './index.module.css';

const sections = [
  {
    title: 'System Overview',
    description: 'Architecture, runtime modes, and platform boundaries.',
    to: '/docs/overview',
  },
  {
    title: 'Backend API',
    description: 'Auth and AI proxy endpoints expected by the mobile app.',
    to: '/docs/backend-api-contract',
  },
  {
    title: 'Operations',
    description: 'CI/CD, deployment runbooks, rollback notes, and troubleshooting.',
    to: '/docs/operations',
  },
  {
    title: 'Code Reference',
    description: 'Generated export inventory with source links across active and legacy code.',
    to: '/docs/code-reference',
  },
];

export default function Home(): ReactNode {
  return (
    <Layout title="AURA Documentation Portal" description="AURA platform technical documentation">
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.kicker}>AURA Platform</p>
          <h1 className={styles.title}>Documentation Portal</h1>
          <p className={styles.subtitle}>
            Complete system documentation for the AURA mobile experience, backend contracts, and operations.
          </p>
          <div className={styles.ctaRow}>
            <Link className="button button--primary button--lg" to="/docs/overview">
              Start Reading
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/deployment">
              Deployment Guide
            </Link>
          </div>
        </div>
      </header>
      <main className={styles.main}>
        <section className={styles.sectionGrid}>
          {sections.map((section) => (
            <Link key={section.title} to={section.to} className={styles.card}>
              <h2>{section.title}</h2>
              <p>{section.description}</p>
            </Link>
          ))}
        </section>
      </main>
    </Layout>
  );
}

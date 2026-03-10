#!/usr/bin/env node
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const docsSiteRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(docsSiteRoot, '..');

const generatedDocPath = path.join(docsSiteRoot, 'docs', 'code-reference', 'generated-files.md');
const generatedJsonPath = path.join(docsSiteRoot, 'static', 'generated', 'code-reference.json');

const targets = [
  {scope: 'active', type: 'dir', value: 'src'},
  {scope: 'active', type: 'dir', value: 'docs'},
  {scope: 'active', type: 'dir', value: '.github/workflows'},
  {scope: 'active', type: 'file', value: 'App.tsx'},
  {scope: 'active', type: 'file', value: 'app.config.js'},
  {scope: 'active', type: 'file', value: 'app.json'},
  {scope: 'active', type: 'file', value: 'eas.json'},
  {scope: 'active', type: 'file', value: 'package.json'},
  {scope: 'active', type: 'file', value: 'tsconfig.json'},
  {scope: 'legacy', type: 'dir', value: 'legacy/swift-ios'},
  {scope: 'legacy', type: 'dir', value: 'AI'},
];

const allowedExtensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.md',
  '.mdx',
  '.yml',
  '.yaml',
  '.swift',
  '.plist',
  '.sh',
]);

function inferResponsibility(relativePath) {
  if (relativePath.startsWith('src/screens/')) {
    return 'Mobile UI screen implementation for an end-user workflow.';
  }
  if (relativePath.startsWith('src/services/')) {
    return 'Service-layer logic handling platform behavior and integrations.';
  }
  if (relativePath.startsWith('src/navigation/')) {
    return 'Navigation graph and screen routing logic.';
  }
  if (relativePath.startsWith('src/store/')) {
    return 'Client state management and state actions.';
  }
  if (relativePath.startsWith('src/types/')) {
    return 'Shared type contracts across app features.';
  }
  if (relativePath.startsWith('src/components/')) {
    return 'Reusable UI components.';
  }
  if (relativePath.startsWith('src/theme/')) {
    return 'Visual design tokens and typography settings.';
  }
  if (relativePath.startsWith('src/utils/')) {
    return 'Utility helpers used across the app.';
  }
  if (relativePath.startsWith('docs/')) {
    return 'Project documentation source material maintained in this repository.';
  }
  if (relativePath.startsWith('.github/workflows/')) {
    return 'CI workflow automation definition.';
  }
  if (relativePath.startsWith('legacy/swift-ios/')) {
    return 'Archived Swift iOS implementation and historical project artifacts.';
  }
  if (relativePath.startsWith('AI/')) {
    return 'Archived AI prototype logic from pre-React Native implementation.';
  }
  if (relativePath === 'app.json' || relativePath === 'app.config.js') {
    return 'Expo runtime/build configuration consumed by the mobile app.';
  }
  if (relativePath === 'eas.json') {
    return 'Expo Application Services build profile configuration.';
  }
  if (relativePath === 'package.json') {
    return 'Project dependency and script manifest.';
  }
  if (relativePath === 'App.tsx') {
    return 'Mobile application root entry and navigator bootstrap.';
  }
  return 'Repository source file used by the AURA platform.';
}

function extractExports(content) {
  const exports = new Set();

  const declarationRegex = /^\s*export\s+(?:default\s+)?(?:abstract\s+)?(class|function|interface|type|enum|const|let|var)\s+([A-Za-z0-9_]+)/gm;
  let match;
  while ((match = declarationRegex.exec(content)) !== null) {
    exports.add(match[2]);
  }

  const namedRegex = /^\s*export\s*\{\s*([^}]+)\s*\}/gm;
  while ((match = namedRegex.exec(content)) !== null) {
    const symbols = match[1]
      .split(',')
      .map((part) => part.trim())
      .map((part) => part.split(' as ')[0].trim())
      .filter(Boolean);

    symbols.forEach((symbol) => exports.add(symbol));
  }

  const defaultFunctionRegex = /^\s*export\s+default\s+function\s+([A-Za-z0-9_]+)/gm;
  while ((match = defaultFunctionRegex.exec(content)) !== null) {
    exports.add(match[1]);
  }

  return Array.from(exports).sort((a, b) => a.localeCompare(b));
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function collectFilesFromDirectory(absoluteDir) {
  const result = [];
  const entries = await fs.readdir(absoluteDir, {withFileTypes: true});

  for (const entry of entries) {
    const absolutePath = path.join(absoluteDir, entry.name);

    if (entry.isDirectory()) {
      result.push(...(await collectFilesFromDirectory(absolutePath)));
      continue;
    }

    const extension = path.extname(entry.name);
    if (allowedExtensions.has(extension)) {
      result.push(absolutePath);
    }
  }

  return result;
}

async function collectTargetFiles() {
  const files = [];

  for (const target of targets) {
    const absoluteTargetPath = path.join(repoRoot, target.value);
    if (!(await pathExists(absoluteTargetPath))) {
      continue;
    }

    if (target.type === 'file') {
      files.push({scope: target.scope, absolutePath: absoluteTargetPath});
      continue;
    }

    const directoryFiles = await collectFilesFromDirectory(absoluteTargetPath);
    directoryFiles.forEach((absolutePath) => {
      files.push({scope: target.scope, absolutePath});
    });
  }

  const seen = new Set();
  const unique = [];
  for (const entry of files) {
    const key = `${entry.scope}:${entry.absolutePath}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(entry);
  }

  unique.sort((a, b) => {
    if (a.scope !== b.scope) return a.scope.localeCompare(b.scope);
    return a.absolutePath.localeCompare(b.absolutePath);
  });

  return unique;
}

function makeRepositoryLink(relativePath) {
  const encodedPath = relativePath
    .split(path.sep)
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `https://github.com/EGIntegrations/AURA-mobile/blob/main/${encodedPath}`;
}

async function buildReference() {
  const collected = await collectTargetFiles();

  const files = [];
  for (const entry of collected) {
    const relativePath = path.relative(repoRoot, entry.absolutePath);
    const extension = path.extname(relativePath).toLowerCase();
    const content = await fs.readFile(entry.absolutePath, 'utf8');

    const exports = ['.ts', '.tsx', '.js', '.jsx'].includes(extension)
      ? extractExports(content)
      : [];

    files.push({
      scope: entry.scope,
      path: relativePath,
      responsibility: inferResponsibility(relativePath),
      exports,
      sourceLink: makeRepositoryLink(relativePath),
    });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    totalFiles: files.length,
    activeFiles: files.filter((file) => file.scope === 'active').length,
    legacyFiles: files.filter((file) => file.scope === 'legacy').length,
  };

  return {summary, files};
}

function buildMarkdown(reference) {
  const lines = [];
  lines.push('---');
  lines.push('title: Generated File Inventory');
  lines.push('sidebar_label: Generated Inventory');
  lines.push('---');
  lines.push('');
  lines.push('# Generated File Inventory');
  lines.push('');
  lines.push(`Generated at: \`${reference.summary.generatedAt}\``);
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | ---: |');
  lines.push(`| Total files | ${reference.summary.totalFiles} |`);
  lines.push(`| Active files | ${reference.summary.activeFiles} |`);
  lines.push(`| Legacy files | ${reference.summary.legacyFiles} |`);
  lines.push('');

  const grouped = {
    active: reference.files.filter((file) => file.scope === 'active'),
    legacy: reference.files.filter((file) => file.scope === 'legacy'),
  };

  for (const scope of ['active', 'legacy']) {
    const heading = scope === 'active' ? 'Active Source Coverage' : 'Legacy Archive Coverage';
    lines.push(`## ${heading}`);
    lines.push('');

    for (const file of grouped[scope]) {
      lines.push(`### \`${file.path}\``);
      lines.push('');
      lines.push(`- Scope: ${scope}`);
      lines.push(`- Responsibility: ${file.responsibility}`);
      lines.push(`- Source: [${file.path}](${file.sourceLink})`);

      if (file.exports.length > 0) {
        lines.push(`- Exports: ${file.exports.map((symbol) => `\`${symbol}\``).join(', ')}`);
      } else {
        lines.push('- Exports: none detected');
      }

      lines.push('');
    }
  }

  return `${lines.join('\n')}\n`;
}

async function ensureParentDirectory(filePath) {
  const directory = path.dirname(filePath);
  await fs.mkdir(directory, {recursive: true});
}

async function run() {
  const reference = await buildReference();
  const markdown = buildMarkdown(reference);

  await ensureParentDirectory(generatedJsonPath);
  await ensureParentDirectory(generatedDocPath);

  await fs.writeFile(generatedJsonPath, `${JSON.stringify(reference, null, 2)}\n`, 'utf8');
  await fs.writeFile(generatedDocPath, markdown, 'utf8');

  console.log(`Generated code reference for ${reference.summary.totalFiles} files.`);
}

run().catch((error) => {
  console.error('Failed to generate code reference:', error);
  process.exitCode = 1;
});

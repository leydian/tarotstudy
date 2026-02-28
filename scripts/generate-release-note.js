import fs from 'node:fs';
import path from 'node:path';

const version = process.argv[2];
if (!version) {
  console.error('Usage: node scripts/generate-release-note.js <version>');
  process.exit(1);
}

const rootDir = process.cwd();
const docsDir = path.join(rootDir, 'docs');
const templatePath = path.join(docsDir, 'RELEASE_TEMPLATE.md');
const targetPath = path.join(docsDir, `RELEASE_NOTES_${version}.md`);

if (!fs.existsSync(templatePath)) {
  console.error(`Template not found: ${templatePath}`);
  process.exit(1);
}
if (fs.existsSync(targetPath)) {
  console.error(`Release note already exists: ${targetPath}`);
  process.exit(1);
}

const template = fs.readFileSync(templatePath, 'utf8');
const content = `# Release Notes ${version}\n\n${template}`;
fs.writeFileSync(targetPath, content, 'utf8');

console.log(`Created: ${targetPath}`);

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { getTarotPredictedQuestionsByTopic } from '../apps/api/src/data/question-intents.js';

const root = process.cwd();
const learningPath = path.join(root, 'scripts', 'learning-leader-eval-set.json');
const yearlyPath = path.join(root, 'scripts', 'yearly-fortune-regression-cases.json');
const registryPath = path.join(root, 'scripts', 'qa-cases-registry.json');

function pick(list = [], count = 1, offset = 0) {
  if (!Array.isArray(list) || list.length === 0 || count <= 0) return [];
  const result = [];
  for (let i = 0; i < count; i += 1) {
    result.push(list[(offset + i) % list.length]);
  }
  return result;
}

function collectTopics(topicsByKey, prefix) {
  const merged = [];
  for (const [key, values] of Object.entries(topicsByKey || {})) {
    if (key === prefix || key.startsWith(`${prefix}__`)) {
      merged.push(...(Array.isArray(values) ? values : []));
    }
  }
  return merged;
}

function buildLearningCases(topics, offset) {
  const daily = collectTopics(topics, 'daily');
  const relationship = collectTopics(topics, 'relationship');
  const relationshipRepair = collectTopics(topics, 'relationship-repair');
  const career = collectTopics(topics, 'career');
  const finance = collectTopics(topics, 'finance');
  const study = collectTopics(topics, 'study');
  const health = collectTopics(topics, 'health');
  const choiceAB = collectTopics(topics, 'choice-a-b');
  const generalLife = collectTopics(topics, 'general');
  const rows = [];
  const oneCardPrompts = [
    ...pick(daily, 2, offset),
    ...pick(relationship, 1, offset),
    ...pick(career, 1, offset),
    ...pick(finance, 1, offset)
  ];
  for (const context of oneCardPrompts) {
    rows.push({ spreadId: 'one-card', level: 'beginner', context });
  }

  const threeCardPrompts = [
    ...pick(study, 1, offset),
    ...pick(relationshipRepair, 1, offset),
    ...pick(career, 1, offset + 2)
  ];
  for (const context of threeCardPrompts) {
    rows.push({ spreadId: 'three-card', level: 'intermediate', context });
  }

  const choicePrompts = pick(choiceAB, 3, offset);
  for (const context of choicePrompts) {
    rows.push({ spreadId: 'choice-a-b', level: 'intermediate', context });
  }

  const dailyPrompts = [...pick(daily, 2, offset + 2), ...pick(health, 1, offset)];
  for (const context of dailyPrompts) {
    rows.push({ spreadId: 'daily-fortune', level: 'beginner', context });
  }

  const weeklyPrompts = [
    ...pick(career, 1, offset + 3),
    ...pick(relationship, 1, offset + 2),
    ...pick(health, 1, offset + 2)
  ];
  for (const context of weeklyPrompts) {
    rows.push({ spreadId: 'weekly-fortune', level: 'beginner', context });
  }

  const monthlyPrompts = [
    ...pick(career, 1, offset + 4),
    ...pick(finance, 1, offset + 2),
    ...pick(study, 1, offset + 2)
  ];
  for (const context of monthlyPrompts) {
    rows.push({ spreadId: 'monthly-fortune', level: 'intermediate', context });
  }

  const yearlyPrompts = [
    ...pick(career, 1, offset + 5),
    ...pick(finance, 1, offset + 3),
    ...pick(relationship, 1, offset + 3)
  ];
  for (const context of yearlyPrompts) {
    rows.push({ spreadId: 'yearly-fortune', level: 'intermediate', context });
  }

  const celticPrompts = [
    ...pick(career, 1, offset + 6),
    ...pick(relationshipRepair, 1, offset + 4),
    ...pick(generalLife, 1, offset + 2)
  ];
  for (const context of celticPrompts) {
    rows.push({ spreadId: 'celtic-cross', level: 'intermediate', context });
  }

  return rows.slice(0, 30);
}

function buildYearlyCases(topics, offset) {
  const career = collectTopics(topics, 'career');
  const relationship = collectTopics(topics, 'relationship');
  const finance = collectTopics(topics, 'finance');
  const generalLife = collectTopics(topics, 'general');

  const careerTiming = pick(career, 6, offset).map((context, idx) => ({
    id: `career-timing-${idx + 1}`,
    level: 'intermediate',
    context,
    intent: 'career',
    requiresTiming: true
  }));

  const relationshipCases = pick(relationship, 4, offset + 2).map((context, idx) => ({
    id: `relationship-${idx + 1}`,
    level: 'intermediate',
    context,
    intent: 'relationship'
  }));

  const financeCases = pick(finance, 4, offset + 3).map((context, idx) => ({
    id: `finance-${idx + 1}`,
    level: 'intermediate',
    context,
    intent: 'finance'
  }));

  const generalCases = pick(generalLife, 4, offset + 1).map((context, idx) => ({
    id: `general-${idx + 1}`,
    level: 'intermediate',
    context,
    intent: 'general'
  }));

  return [...careerTiming, ...relationshipCases, ...financeCases, ...generalCases];
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}

const now = new Date();
const isoDate = now.toISOString().slice(0, 10);
const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
const offset = Number(process.env.QA_CASE_OFFSET || dayOfYear % 7);
const topics = getTarotPredictedQuestionsByTopic();

const learningCases = buildLearningCases(topics, offset);
const yearlyCases = buildYearlyCases(topics, offset);

writeJson(learningPath, learningCases);
writeJson(yearlyPath, yearlyCases);
writeJson(registryPath, {
  generatedAt: now.toISOString(),
  generatedDate: isoDate,
  offset,
  learningCases: learningCases.length,
  yearlyCases: yearlyCases.length,
  source: 'apps/api/src/data/question-intents.js'
});

console.log('[qa-cases] refreshed');
console.log(JSON.stringify({ learningCases: learningCases.length, yearlyCases: yearlyCases.length, generatedDate: isoDate, offset }, null, 2));

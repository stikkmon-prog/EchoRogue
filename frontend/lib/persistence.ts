import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'frontend', 'data');
const MCP_STATE_FILE = path.join(DATA_DIR, 'mcp_state.json');
const DATASET_STATE_FILE = path.join(DATA_DIR, 'dataset_store.json');

export type McpRepoState = {
  slug: string;
  url: string;
  path: string;
  clonedAt: string;
  status: string;
};

export type DatasetItem = {
  id: string;
  text: string;
  source: string;
  vector: number[];
};

export type DatasetEntry = {
  name: string;
  sourceType: string;
  sourceUrl: string;
  createdAt: string;
  preview: string;
  items: DatasetItem[];
};

export const ensureDataDirectory = async () => {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
};

const readJson = async <T>(filePath: string, fallback: T): Promise<T> => {
  try {
    await ensureDataDirectory();
    const raw = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = async (filePath: string, data: unknown) => {
  await ensureDataDirectory();
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
};

export const readMcpState = async (): Promise<{ repos: McpRepoState[] }> => {
  return readJson(MCP_STATE_FILE, { repos: [] });
};

export const writeMcpState = async (state: { repos: McpRepoState[] }) => {
  await writeJson(MCP_STATE_FILE, state);
};

export const readDatasetState = async (): Promise<{ datasets: DatasetEntry[] }> => {
  return readJson(DATASET_STATE_FILE, { datasets: [] });
};

export const writeDatasetState = async (state: { datasets: DatasetEntry[] }) => {
  await writeJson(DATASET_STATE_FILE, state);
};

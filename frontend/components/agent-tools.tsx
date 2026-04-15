'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { InstallCommandEntry, getInstallHelp } from '../lib/installCommands';

type TerminalEntry = {
  id: string;
  command: string;
  output: string;
  error?: string;
};

type UploadResult = {
  fileName: string;
  size: number;
  downloadUrl: string;
  preview?: string;
};

const safeSources = ['txt', 'csv', 'url', 'mcp', 'kaggle', 'huggingface'] as const;
const allowedTerminalCommands = [
  'pwd', 'ls', 'cat', 'echo', 'whoami', 'id', 'uname', 'df', 'du', 'head', 'tail',
  'find', 'grep', 'wc', 'sort', 'uniq', 'cut', 'tr', 'awk', 'sed', 'xargs', 'tee',
  'basename', 'dirname', 'file', 'stat', 'env', 'printenv', 'date', 'uptime', 'sleep',
  'ps', 'top', 'htop', 'lsof', 'mount', 'umount', 'journalctl', 'dmesg', 'ping', 'traceroute',
  'curl', 'wget', 'netstat', 'ss', 'ip', 'ifconfig', 'nmap', 'tcpdump', 'arp', 'dig', 'host',
  'nslookup', 'ssh', 'scp', 'git', 'python', 'python3', 'node', 'npm', 'bash', 'sh', 'perl', 'ruby',
  'tar', 'gzip', 'gunzip', 'bzip2', 'bunzip2', 'zip', 'unzip', 'nc', 'openssl', 'gdb'
] as const;

function formatDuration(ms: number) {
  return `${Math.round(ms / 100) / 100}s`;
}

function LoadingCard({ title }: { title: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#02040f]/90 p-5 text-sm text-slate-500 shadow-sm animate-pulse">
      <div className="mb-3 h-4 w-3/5 rounded-full bg-slate-700" />
      <div className="space-y-2">
        <div className="h-3 rounded-full bg-slate-800" />
        <div className="h-3 w-5/6 rounded-full bg-slate-800" />
        <div className="h-3 w-2/3 rounded-full bg-slate-800" />
      </div>
    </div>
  );
}

export function AgentTools() {
  const [terminalCommand, setTerminalCommand] = useState('pwd');
  const [terminalHistory, setTerminalHistory] = useState<TerminalEntry[]>([]);
  const [terminalWorking, setTerminalWorking] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadWorking, setUploadWorking] = useState(false);
  const [trainSource, setTrainSource] = useState<typeof safeSources[number]>('txt');
  const [trainUrl, setTrainUrl] = useState('');
  const [trainDatasetName, setTrainDatasetName] = useState('my-dataset');
  const [trainResponse, setTrainResponse] = useState<string>('');
  const [trainWorking, setTrainWorking] = useState(false);
  const [mcpWorking, setMcpWorking] = useState(false);
  const [codeWorking, setCodeWorking] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [autoSearchEnabled, setAutoSearchEnabled] = useState(true);
  const [datasetQuery, setDatasetQuery] = useState('');
  const [debouncedDatasetQuery, setDebouncedDatasetQuery] = useState('');
  const [datasetDetailsCache, setDatasetDetailsCache] = useState<Record<string, { details: { name: string; sourceType: string; sourceUrl: string; createdAt: string; itemCount: number; preview: string }; items: Array<{ id: string; text: string; source: string }> }>>({});
  const [mcpTarget, setMcpTarget] = useState('https://github.com/username/repo.git');
  const [datasetList, setDatasetList] = useState<Array<{ name: string; sourceType: string; sourceUrl: string; createdAt: string; itemCount: number }>>([]);
  const [datasetSearchName, setDatasetSearchName] = useState('my-dataset');
  const [datasetSearchResults, setDatasetSearchResults] = useState<Array<{ text: string; score: number; source: string }>>([]);
  const [datasetSearchLoading, setDatasetSearchLoading] = useState(false);
  const [datasetSearchResponse, setDatasetSearchResponse] = useState('');
  const [selectedDatasetDetails, setSelectedDatasetDetails] = useState<null | { name: string; sourceType: string; sourceUrl: string; createdAt: string; itemCount: number; preview: string }> (null);
  const [selectedDatasetItems, setSelectedDatasetItems] = useState<Array<{id: string; text: string; source: string}>>([]);
  const [datasetDetailStatus, setDatasetDetailStatus] = useState('No dataset selected.');
  const [datasetDetailLoading, setDatasetDetailLoading] = useState(false);
  const [installToolQuery, setInstallToolQuery] = useState('');
  const [installHelpResult, setInstallHelpResult] = useState<InstallCommandEntry | null>(null);
  const [mcpAction, setMcpAction] = useState<'clone' | 'inspect' | 'status'>('status');
  const [mcpResponse, setMcpResponse] = useState<string>('Ready to connect to MCP tools.');
  const [browserUrl, setBrowserUrl] = useState('https://example.com');
  const [browserPreview, setBrowserPreview] = useState('');
  const [browserTitle, setBrowserTitle] = useState('');
  const [browserStatus, setBrowserStatus] = useState('Ready to browse.');
  const [browserLoading, setBrowserLoading] = useState(false);
  const [codeSnippet, setCodeSnippet] = useState('');
  const [codeLanguage, setCodeLanguage] = useState<'python' | 'javascript'>('python');
  const [codeAction, setCodeAction] = useState<'debug' | 'clean' | 'analyze'>('debug');
  const [codeResult, setCodeResult] = useState<string>('');
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const terminalRows = useMemo(() => terminalHistory.slice(-8).reverse(), [terminalHistory]);

  useEffect(() => {
    const handler = window.setTimeout(() => setDebouncedDatasetQuery(datasetQuery), 700);
    return () => window.clearTimeout(handler);
  }, [datasetQuery]);

  useEffect(() => {
    if (!autoSearchEnabled || !debouncedDatasetQuery.trim() || !datasetSearchName) {
      return;
    }
    handleDatasetSearch(debouncedDatasetQuery, datasetSearchName);
  }, [autoSearchEnabled, debouncedDatasetQuery, datasetSearchName]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  }, []);

  const runTerminalCommand = useCallback(async () => {
    const command = terminalCommand.trim();
    if (!command) return;
    setTerminalWorking(true);
    const entry: TerminalEntry = { id: `${Date.now()}-${Math.random()}`, command, output: 'Running…' };
    setTerminalHistory(prev => [...prev, entry]);

    try {
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });
      const data = await response.json();
      const output = data.output ?? data.error ?? 'No response from terminal.';
      setTerminalHistory(prev => prev.map(item => (item.id === entry.id ? { ...item, output, error: data.error } : item)));
    } catch (error) {
      setTerminalHistory(prev => prev.map(item => (item.id === entry.id ? { ...item, output: 'Terminal request failed.', error: String(error) } : item)));
    } finally {
      setTerminalWorking(false);
    }
  }, [terminalCommand]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const handleUploadSubmit = useCallback(async () => {
    if (!uploadFile) {
      showToast('Choose a file to upload first.', 'error');
      return;
    }
    setUploadWorking(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    setUploadResult(null);
    try {
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) {
        setUploadResult({ fileName: uploadFile.name, size: uploadFile.size, downloadUrl: '', preview: `Upload failed: ${data.error || response.statusText}` });
        showToast(`Upload failed: ${data.error || response.statusText}`, 'error');
        return;
      }
      setUploadResult({
        fileName: data.fileName,
        size: data.size,
        downloadUrl: data.downloadUrl,
        preview: data.preview ?? ''
      });
      showToast('Upload completed successfully.', 'success');
    } catch (error) {
      setUploadResult({ fileName: uploadFile.name, size: uploadFile.size, downloadUrl: '', preview: `Upload failed: ${String(error)}` });
      showToast(`Upload failed: ${String(error)}`, 'error');
    } finally {
      setUploadWorking(false);
    }
  }, [uploadFile, showToast]);

  const refreshDatasetList = useCallback(async () => {
    try {
      const response = await fetch('/api/dataset');
      const data = await response.json();
      if (Array.isArray(data.datasets)) {
        setDatasetList(data.datasets);
        if (data.datasets.length > 0) {
          setDatasetSearchName(data.datasets[0].name);
        }
      }
    } catch {
      // ignore refresh failures
    }
  }, []);

  const handleTrain = useCallback(async () => {
    if (!trainDatasetName.trim()) {
      showToast('Dataset name is required.', 'error');
      return;
    }
    if (!trainUrl.trim()) {
      showToast('Source URL or repository path is required.', 'error');
      return;
    }
    if (trainSource === 'url') {
      try {
        new URL(trainUrl.startsWith('http') ? trainUrl : `https://${trainUrl}`);
      } catch {
        showToast('Enter a valid URL for URL ingestion.', 'error');
        return;
      }
    }

    setTrainWorking(true);
    setTrainResponse('Starting training workflow…');
    try {
      const response = await fetch('/api/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: trainSource,
          sourceUrl: trainUrl,
          datasetName: trainDatasetName
        })
      });
      const data = await response.json();
      setTrainResponse(data.message || JSON.stringify(data, null, 2));
      if (response.ok) {
        showToast('Training workflow started successfully.', 'success');
      } else {
        showToast(data.error || 'Training workflow failed.', 'error');
      }
      await refreshDatasetList();
    } catch (error) {
      setTrainResponse(`Training request failed: ${String(error)}`);
      showToast(`Training request failed: ${String(error)}`, 'error');
    } finally {
      setTrainWorking(false);
    }
  }, [trainDatasetName, trainUrl, trainSource, refreshDatasetList, showToast]);

  const handleInstallHelp = useCallback(() => {
    const search = installToolQuery.trim();
    if (!search) {
      setInstallHelpResult(null);
      return;
    }
    const help = getInstallHelp(search);
    setInstallHelpResult(help);
  }, [installToolQuery]);

  const handleMcpRequest = useCallback(async () => {
    setMcpWorking(true);
    setMcpResponse('Contacting MCP server…');
    try {
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mcpAction, target: mcpTarget })
      });
      const data = await response.json();
      setMcpResponse(data.message || JSON.stringify(data, null, 2));
      if (response.ok) {
        showToast('MCP action completed.', 'success');
      } else {
        showToast(data.error || 'MCP action failed.', 'error');
      }
    } catch (error) {
      setMcpResponse(`MCP request failed: ${String(error)}`);
      showToast(`MCP request failed: ${String(error)}`, 'error');
    } finally {
      setMcpWorking(false);
    }
  }, [mcpAction, mcpTarget, showToast]);

  const handleBrowse = useCallback(async () => {
    const url = browserUrl.trim();
    if (!url) {
      setBrowserStatus('Enter a URL to browse.');
      showToast('Browser URL is required.', 'error');
      return;
    }
    setBrowserLoading(true);
    setBrowserStatus('Fetching page…');
    try {
      const response = await fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await response.json();
      if (data.error) {
        setBrowserStatus(`Browser error: ${data.error}`);
        setBrowserPreview('');
        setBrowserTitle('');
        showToast(`Browser error: ${data.error}`, 'error');
      } else {
        setBrowserTitle(data.title || url);
        setBrowserPreview(data.preview || 'No preview available.');
        setBrowserStatus(`Loaded ${data.url} (${data.contentType})`);
        showToast('Page loaded successfully.', 'success');
      }
    } catch (error) {
      setBrowserStatus(`Browser request failed: ${String(error)}`);
      setBrowserPreview('');
      setBrowserTitle('');
      showToast(`Browser request failed: ${String(error)}`, 'error');
    } finally {
      setBrowserLoading(false);
    }
  }, [browserUrl, showToast]);

  const handleDatasetSearch = useCallback(async (query = datasetQuery, datasetName = datasetSearchName) => {
    if (!datasetName || !query.trim()) {
      setDatasetSearchResponse('Please choose a dataset and enter a search query.');
      return;
    }
    setDatasetSearchLoading(true);
    setDatasetSearchResponse('Querying dataset vector index…');
    try {
      const response = await fetch('/api/dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetName, query, topK: 5 })
      });
      const data = await response.json();
      if (data.hits) {
        setDatasetSearchResults(data.hits);
        setDatasetSearchResponse(`Found ${data.hits.length} similarity hits in dataset '${data.dataset}'.`);
        showToast(`Dataset search returned ${data.hits.length} hits.`, 'success');
      } else {
        setDatasetSearchResponse(data.error || 'No results returned.');
        if (data.error) showToast(`Dataset search failed: ${data.error}`, 'error');
      }
    } catch (error) {
      setDatasetSearchResponse(`Dataset query failed: ${String(error)}`);
      showToast(`Dataset query failed: ${String(error)}`, 'error');
    } finally {
      setDatasetSearchLoading(false);
    }
  }, [datasetQuery, datasetSearchName, showToast]);

  const fetchDatasetDetails = useCallback(async () => {
    if (!datasetSearchName) {
      setDatasetDetailStatus('Choose a dataset to inspect.');
      return;
    }

    const cached = datasetDetailsCache[datasetSearchName];
    if (cached) {
      setSelectedDatasetDetails(cached.details);
      setSelectedDatasetItems(cached.items);
      setDatasetDetailStatus(`Loaded cached details for ${datasetSearchName}.`);
      return;
    }

    setDatasetDetailLoading(true);
    setDatasetDetailStatus('Loading dataset details…');
    try {
      const response = await fetch(`/api/dataset?name=${encodeURIComponent(datasetSearchName)}`);
      const data = await response.json();
      if (data.error) {
        setDatasetDetailStatus(`Dataset error: ${data.error}`);
        setSelectedDatasetDetails(null);
        setSelectedDatasetItems([]);
      } else {
        setSelectedDatasetDetails(data.dataset);
        setSelectedDatasetItems(data.items || []);
        setDatasetDetailsCache(prev => ({
          ...prev,
          [datasetSearchName]: { details: data.dataset, items: data.items || [] }
        }));
        setDatasetDetailStatus(`Loaded ${data.items?.length ?? 0} items from ${datasetSearchName}.`);
      }
    } catch (error) {
      setDatasetDetailStatus(`Dataset request failed: ${String(error)}`);
      setSelectedDatasetDetails(null);
      setSelectedDatasetItems([]);
    } finally {
      setDatasetDetailLoading(false);
    }
  }, [datasetSearchName, datasetDetailsCache]);

  const deleteDataset = useCallback(async () => {
    if (!datasetSearchName) {
      setDatasetDetailStatus('Choose a dataset to delete.');
      return;
    }
    setDatasetDetailLoading(true);
    try {
      const response = await fetch('/api/dataset', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetName: datasetSearchName })
      });
      const data = await response.json();
      if (data.error) {
        setDatasetDetailStatus(`Delete failed: ${data.error}`);
      } else {
        setDatasetDetailStatus(data.message || 'Dataset deleted.');
        setSelectedDatasetDetails(null);
        setSelectedDatasetItems([]);
        await refreshDatasetList();
      }
    } catch (error) {
      setDatasetDetailStatus(`Delete request failed: ${String(error)}`);
    } finally {
      setDatasetDetailLoading(false);
    }
  }, [datasetSearchName, refreshDatasetList]);

  const handleCodeTool = useCallback(async () => {
    setCodeWorking(true);
    setCodeResult(`${codeAction === 'clean' ? 'Cleaning' : codeAction === 'debug' ? 'Debugging' : 'Analyzing'} code…`);
    try {
      const response = await fetch('/api/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeSnippet, language: codeLanguage, action: codeAction })
      });
      const data = await response.json();
      setCodeResult(data.result || data.error || 'No result returned.');
    } catch (error) {
      setCodeResult(`Code tool failed: ${String(error)}`);
    } finally {
      setCodeWorking(false);
    }
  }, [codeAction, codeLanguage, codeSnippet]);

  useEffect(() => {
    if (datasetSearchName) {
      setSelectedDatasetDetails(null);
      setSelectedDatasetItems([]);
      setDatasetDetailStatus(`Selected ${datasetSearchName}. Inspect to load details.`);
    }
  }, [datasetSearchName]);

  useEffect(() => {
    refreshDatasetList();
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {toast ? (
        <div className={`col-span-full rounded-3xl border border-white/10 p-4 text-sm ${toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-200' : toast.type === 'error' ? 'bg-rose-500/10 text-rose-200' : 'bg-slate-500/10 text-slate-200'}`}>
          {toast.message}
        </div>
      ) : null}
      <section className="rounded-[2rem] border border-white/10 bg-[#050712]/85 p-5 shadow-[0_32px_80px_rgba(14,165,233,0.06)] backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Linux Shell</p>
            <h2 className="text-lg font-semibold text-white">Interactive Terminal</h2>
          </div>
          <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-cyan-200">safe shell</span>
        </div>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Input value={terminalCommand} onChange={e => setTerminalCommand(e.target.value)} placeholder="Enter a shell command" />
            <Button variant="primary" onClick={runTerminalCommand} disabled={terminalWorking}>Run</Button>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#02040f]/90 p-4 text-sm text-slate-300">
            {terminalRows.length === 0 ? (
              <p className="text-slate-500">Run a command like <span className="text-cyan-300">pwd</span> or <span className="text-cyan-300">ls -la</span>.</p>
            ) : (
              <div className="space-y-4">
                {terminalRows.map(entry => (
                  <div key={entry.id} className="space-y-2">
                    <div className="rounded-2xl bg-[#070a13]/90 px-4 py-3 text-cyan-200 shadow-inner shadow-cyan-500/5">
                      <span className="font-mono text-xs">$ {entry.command}</span>
                    </div>
                    <pre className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-[#01050c]/90 p-4 text-[0.82rem] leading-6 text-slate-200">
                      {entry.output}
                    </pre>
                    {entry.error ? <p className="text-xs text-rose-300">{entry.error}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-[#050712]/85 p-5 shadow-[0_32px_80px_rgba(79,70,229,0.08)] backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">MCP + Dataset</p>
            <h2 className="text-lg font-semibold text-white">Repository & Training Hub</h2>
          </div>
          <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-violet-200">built-in MCP</span>
        </div>

        <div className="grid gap-5">
          <div className="space-y-3 rounded-3xl border border-white/10 bg-[#070914]/80 p-4">
            <p className="text-sm font-semibold text-white">Upload files</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                ref={uploadInputRef}
                type="file"
                accept=".txt,.csv,.py,.js,.json,.md"
                onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-3xl border border-white/10 bg-[#02030c]/90 px-4 py-3 text-sm text-slate-100 outline-none"
              />
              <Button variant="primary" onClick={handleUploadSubmit} disabled={!uploadFile || uploadWorking}>
                {uploadWorking ? 'Uploading…' : 'Upload'}
              </Button>
            </div>
            {uploadResult ? (
              <div className="rounded-3xl border border-white/10 bg-[#02040f]/80 p-4 text-sm text-slate-200">
                <p><strong>File:</strong> {uploadResult.fileName}</p>
                <p><strong>Size:</strong> {uploadResult.size.toLocaleString()} bytes</p>
                <p><strong>Saved:</strong> {uploadResult.downloadUrl}</p>
                {uploadResult.preview ? <pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-[#02030c]/90 p-3 text-xs text-slate-300">{uploadResult.preview}</pre> : null}
              </div>
            ) : null}
          </div>

          <div className="space-y-3 rounded-3xl border border-white/10 bg-[#070914]/80 p-4">
            <p className="text-sm font-semibold text-white">Train on custom data</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
              <select
                value={trainSource}
                onChange={e => setTrainSource(e.target.value as typeof trainSource)}
                className="rounded-3xl border border-white/10 bg-[#02030c]/90 px-4 py-3 text-sm text-slate-100 outline-none"
              >
                {safeSources.map(source => (
                  <option key={source} value={source}>{source.toUpperCase()}</option>
                ))}
              </select>
              <Input value={trainDatasetName} onChange={e => setTrainDatasetName(e.target.value)} placeholder="Dataset name" />
            </div>
            <Input value={trainUrl} onChange={e => setTrainUrl(e.target.value)} placeholder="URL, Kaggle/HuggingFace path, or MCP repo" />
            <Button variant="secondary" onClick={handleTrain} disabled={trainWorking || !trainDatasetName.trim() || !trainUrl.trim()}>
              {trainWorking ? 'Running…' : 'Start ingestion'}
            </Button>
            <div className="rounded-3xl border border-white/10 bg-[#02040f]/80 p-4 text-sm text-slate-200">
              <p className="font-semibold text-white">Training engine</p>
              <p className="mt-2 text-xs leading-6 text-slate-400">Use a source URL or select a supported dataset source type, then begin ingestion. This panel accepts txt/csv URLs, MCP references, Kaggle dataset identifiers, and HuggingFace repository links.</p>
              {trainWorking ? (
                <LoadingCard title="Training workflow" />
              ) : (
                <pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-[#01050c]/90 p-3 text-xs text-slate-300">{trainResponse}</pre>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-3xl border border-white/10 bg-[#070914]/80 p-4">
            <p className="text-sm font-semibold text-white">Dataset vector search</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
              <select
                value={datasetSearchName}
                onChange={e => setDatasetSearchName(e.target.value)}
                className="rounded-3xl border border-white/10 bg-[#02030c]/90 px-4 py-3 text-sm text-slate-100 outline-none"
              >
                {datasetList.length === 0 ? (
                  <option value="">No datasets loaded</option>
                ) : (
                  datasetList.map(dataset => (
                    <option key={dataset.name} value={dataset.name}>{dataset.name}</option>
                  ))
                )}
              </select>
              <Input value={datasetQuery} onChange={e => setDatasetQuery(e.target.value)} placeholder="Search query" />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="inline-flex items-center gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={autoSearchEnabled}
                  onChange={e => setAutoSearchEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border border-slate-700 bg-[#02030c] text-cyan-400"
                />
                Auto-search on pause
              </label>
              <Button variant="secondary" onClick={() => handleDatasetSearch()} disabled={datasetSearchLoading || !datasetSearchName || !datasetQuery.trim()}>
                {datasetSearchLoading ? 'Searching…' : 'Search dataset'}
              </Button>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#02040f]/80 p-4 text-sm text-slate-200">
              <p className="font-semibold text-white">Vector index</p>
              <p className="mt-2 text-xs leading-6 text-slate-400">Search persisted dataset chunks using a local vector index. Results are ranked by semantic similarity.</p>
              <p className="mt-3 text-xs text-slate-300">{datasetSearchResponse}</p>
              {datasetSearchLoading ? (
                <LoadingCard title="Searching dataset" />
              ) : (
                <div className="mt-3 space-y-3">
                  {datasetSearchResults.map((hit, index) => (
                    <div key={index} className="rounded-2xl border border-white/10 bg-[#01050c]/90 p-3 text-xs text-slate-200">
                      <p className="font-semibold text-white">Hit {index + 1} - {hit.score.toFixed(3)}</p>
                      <p className="mt-2 text-slate-300 line-clamp-3">{hit.text}</p>
                      <p className="mt-2 text-xs text-slate-500">Source: {hit.source}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-3xl border border-white/10 bg-[#070914]/80 p-4">
            <p className="text-sm font-semibold text-white">Dataset details</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <Button variant="secondary" onClick={fetchDatasetDetails} disabled={!datasetSearchName || datasetDetailLoading}>Inspect</Button>
              <Button variant="secondary" onClick={deleteDataset} disabled={!datasetSearchName || datasetDetailLoading}>Delete</Button>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#02040f]/80 p-4 text-sm text-slate-200">
              <p className="font-semibold text-white">Status</p>
              <p className="mt-2 text-xs leading-6 text-slate-400">{datasetDetailStatus}</p>
              {selectedDatasetDetails ? (
                <div className="mt-3 space-y-2 text-slate-200">
                  <p><strong>Name:</strong> {selectedDatasetDetails.name}</p>
                  <p><strong>Items:</strong> {selectedDatasetDetails.itemCount}</p>
                  <p><strong>Source:</strong> {selectedDatasetDetails.sourceType} / {selectedDatasetDetails.sourceUrl}</p>
                  <p><strong>Created:</strong> {selectedDatasetDetails.createdAt}</p>
                </div>
              ) : null}
              {selectedDatasetItems.length > 0 ? (
                <div className="mt-3 space-y-2">
                  <p className="font-semibold text-white">Sample items</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedDatasetItems.slice(0, 5).map(item => (
                      <div key={item.id} className="rounded-2xl border border-white/10 bg-[#01050c]/90 p-3 text-xs text-slate-200">
                        <p className="font-semibold text-white">Source: {item.source}</p>
                        <p className="mt-1 text-slate-300 line-clamp-3">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-3 rounded-3xl border border-white/10 bg-[#070914]/80 p-4">
            <p className="text-sm font-semibold text-white">MCP / GitHub tool</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input value={mcpTarget} onChange={e => setMcpTarget(e.target.value)} placeholder="GitHub repo URL or MCP target" />
              <select
                value={mcpAction}
                onChange={e => setMcpAction(e.target.value as typeof mcpAction)}
                className="rounded-3xl border border-white/10 bg-[#02030c]/90 px-4 py-3 text-sm text-slate-100 outline-none"
              >
                <option value="status">Status</option>
                <option value="inspect">Inspect</option>
                <option value="clone">Clone</option>
              </select>
            </div>
            <Button variant="primary" onClick={handleMcpRequest} disabled={mcpWorking}>
              {mcpWorking ? 'Working…' : 'Run MCP action'}
            </Button>
            <div className="rounded-3xl border border-white/10 bg-[#02040f]/80 p-4 text-sm text-slate-200">
              <p className="font-semibold text-white">MCP server</p>
              <pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-[#01050c]/90 p-3 text-xs text-slate-300">{mcpResponse}</pre>
            </div>
          </div>

          <div className="space-y-3 rounded-3xl border border-white/10 bg-[#070914]/80 p-4">
            <p className="text-sm font-semibold text-white">Web browser</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input value={browserUrl} onChange={e => setBrowserUrl(e.target.value)} placeholder="Enter a website URL" />
              <Button variant="primary" onClick={handleBrowse} disabled={browserLoading}>Browse</Button>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#02040f]/80 p-4 text-sm text-slate-200">
              <p className="font-semibold text-white">Browser status</p>
              <p className="mt-2 text-xs leading-6 text-slate-400">Use the built-in browser to fetch a page and preview its content in the UI.</p>
              <p className="mt-3 text-xs text-slate-300">{browserStatus}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#02040f]/80 p-4 text-sm text-slate-200">
              <p className="font-semibold text-white">Page preview</p>
              <p className="mt-2 text-xs text-slate-400">Title: {browserTitle || 'No page loaded yet'}</p>
              {browserLoading ? (
                <LoadingCard title="Loading page preview" />
              ) : (
                <pre className="mt-3 max-h-60 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-[#01050c]/90 p-3 text-xs text-slate-300">{browserPreview || 'Browse a page to see text content here.'}</pre>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-[#050712]/85 p-5 shadow-[0_32px_80px_rgba(14,165,233,0.06)] backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">AI Code Tools</p>
            <h2 className="text-lg font-semibold text-white">Debug & Clean Code</h2>
          </div>
          <span className="rounded-full bg-slate-900/70 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-300">dev workflow</span>
        </div>
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <select
              value={codeLanguage}
              onChange={e => setCodeLanguage(e.target.value as typeof codeLanguage)}
              className="rounded-3xl border border-white/10 bg-[#02030c]/90 px-4 py-3 text-sm text-slate-100 outline-none"
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
            </select>
            <select
              value={codeAction}
              onChange={e => setCodeAction(e.target.value as typeof codeAction)}
              className="rounded-3xl border border-white/10 bg-[#02030c]/90 px-4 py-3 text-sm text-slate-100 outline-none"
            >
              <option value="debug">Debug</option>
              <option value="clean">Clean</option>
              <option value="analyze">Analyze</option>
            </select>
          </div>
          <textarea
            value={codeSnippet}
            onChange={e => setCodeSnippet(e.target.value)}
            rows={10}
            className="w-full rounded-3xl border border-white/10 bg-[#02030c]/90 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500"
            placeholder="Paste code here for analysis, cleaning, or debugging."
          />
          <Button variant="primary" onClick={handleCodeTool} disabled={!codeSnippet.trim() || codeWorking}>
            {codeWorking ? 'Processing…' : 'Run code tool'}
          </Button>
          <div className="rounded-3xl border border-white/10 bg-[#02040f]/80 p-4 text-sm text-slate-200">
            <p className="font-semibold text-white">Result</p>
            <pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-[#01050c]/90 p-3 text-xs text-slate-300">{codeResult}</pre>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-[#050712]/85 p-5 shadow-[0_32px_80px_rgba(79,70,229,0.08)] backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Install Help</p>
            <h2 className="text-lg font-semibold text-white">Package Install Guidance</h2>
          </div>
          <span className="rounded-full bg-slate-900/70 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-300">quick setup</span>
        </div>
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Input value={installToolQuery} onChange={e => setInstallToolQuery(e.target.value)} placeholder="Tool or package name" />
            <Button variant="primary" onClick={handleInstallHelp}>Lookup</Button>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#02040f]/80 p-4 text-sm text-slate-200">
            {installHelpResult ? (
              <>
                <p className="font-semibold text-white">Install command</p>
                <pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-[#01050c]/90 p-3 text-xs text-slate-300">{installHelpResult.command}</pre>
                <p className="mt-3 text-slate-300">{installHelpResult.description}</p>
                <p className="mt-3 text-xs text-slate-500">Package: {installHelpResult.packageName}</p>
              </>
            ) : (
              <p className="text-slate-400">Enter a tool or package name to receive an apt install command and description.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

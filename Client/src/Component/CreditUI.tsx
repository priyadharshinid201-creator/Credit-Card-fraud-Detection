import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import Papa from 'papaparse';

type CsvRow = Record<string, string | number | null | undefined>;
type XYPoint = { x: number; y: number };

interface PredictionSummary {
  rows: number;
  fraud_count: number;
  non_fraud_count: number;
  fraud_rate: number;
  preview?: CsvRow[];
}

const API_TIMEOUT_MS = 120000;
const MAX_UI_ROWS = 5000;
const MAX_SCATTER_POINTS = 4000;

const parseNumber = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};
const detectColumns = (columns: string[]) => {
  const fallback = columns[0] ?? '';

  return {
    x: columns.find((col) => col.toLowerCase().includes('time')) ?? fallback,
    y: columns.find((col) => col.toLowerCase().includes('amount')) ?? fallback
  };
};
const getMissingValueCount = (rows: CsvRow[]) => {
  let count = 0;

  for (const row of rows) {
    for (const value of Object.values(row)) {
      if (value === '' || value === null || value === undefined) {
        count += 1;
      }
    }
  }
  return count;
};
const isNumericColumn = (rows: CsvRow[], column: string) => {
  for (const row of rows) {
    if (parseNumber(row[column]) !== null) {
      return true;
    }
  }
  return false;
};
const getChartColumnOptions = (columns: string[], numericColumns: string[]) =>
  numericColumns.length ? numericColumns : columns;

const getApiErrorMessage = (result: unknown, status: number) => {
  if (
    typeof result === 'object' &&
    result !== null &&
    'error' in result &&
    typeof (result as { error?: unknown }).error === 'string'
  ) {
    return (result as { error: string }).error;
  }

  return `Prediction request failed (${status})`;
};

const CreditUI: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [xAxisColumn, setXAxisColumn] = useState('Time');
  const [yAxisColumn, setYAxisColumn] = useState('Amount');
  const [fileUploaded, setFileUploaded] = useState(false);
  const [showDataPreview, setShowDataPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionSummary, setPredictionSummary] = useState<PredictionSummary | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [uiInfo, setUiInfo] = useState<string | null>(null);

  const hasData = fileUploaded && rows.length > 0;
  const numericColumns = useMemo(
    () => columns.filter((column) => isNumericColumn(rows, column)),
    [rows, columns]
  );

  const missingValues = useMemo(() => getMissingValueCount(rows), [rows]);
  const xyChartData = useMemo(
    () => {
      const points = rows
        .map((row) => ({
          x: parseNumber(row[xAxisColumn]),
          y: parseNumber(row[yAxisColumn])
        }))
        .filter((point): point is XYPoint => point.x !== null && point.y !== null);

      if (points.length <= MAX_SCATTER_POINTS) {
        return points;
      }

      const step = Math.ceil(points.length / MAX_SCATTER_POINTS);
      return points.filter((_, index) => index % step === 0).slice(0, MAX_SCATTER_POINTS);
    },
    [rows, xAxisColumn, yAxisColumn]
  );
  const previewRows = predictionSummary?.preview ?? [];
  const previewColumns = useMemo(
    () => Object.keys(previewRows[0] ?? {}).slice(0, 10),
    [previewRows]
  );
  const selectableColumns = useMemo(
    () => getChartColumnOptions(columns, numericColumns),
    [columns, numericColumns]
  );

  const runBackendPrediction = async () => {
    if (!uploadedFile) return;

    setIsPredicting(true);
    setPredictionError(null);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      const response = await fetch('/api/predict-csv', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      let result: unknown = null;
      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok) {
        throw new Error(getApiErrorMessage(result, response.status));
      }

      setPredictionSummary(result as PredictionSummary);
    } catch (error) {
      setPredictionSummary(null);
      if (error instanceof DOMException && error.name === 'AbortError') {
        setPredictionError('Request timed out after 120 seconds. Check backend server and try a smaller CSV.');
      } else {
        setPredictionError(error instanceof Error ? error.message : 'Unknown prediction error');
      }
    } finally {
      window.clearTimeout(timeoutId);
      setIsPredicting(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setPredictionError(null);
    setUiInfo(null);
    setPredictionSummary(null);
    setFileUploaded(false);
    setUploadedFile(file);
    

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      preview: MAX_UI_ROWS,
      complete: (results) => {
        const sampledRows = (results.data as CsvRow[]) ?? [];
        const headerColumns = (results.meta.fields ?? []).filter(Boolean);
        const firstNonEmptyRow = sampledRows.find((row) => Object.keys(row).length > 0);
        const parsedColumns = headerColumns.length ? headerColumns : Object.keys(firstNonEmptyRow ?? {});
        const parsedNumericColumns = parsedColumns.filter((column) => isNumericColumn(sampledRows, column));

        const detected = detectColumns(parsedColumns);
        const defaultNumeric = parsedNumericColumns[0] ?? parsedColumns[0] ?? '';
        setRows(sampledRows);
        setColumns(parsedColumns);
        setXAxisColumn(
          parsedColumns.includes(detected.x)
            ? detected.x
            : defaultNumeric
        );
        setYAxisColumn(
          parsedColumns.includes(detected.y)
            ? detected.y
            : defaultNumeric
        );
        setFileUploaded(sampledRows.length > 0);
        setIsUploading(false);

        if (sampledRows.length === 0) {
          setPredictionError('CSV has no data rows.');
        } else {
          setUiInfo(`Loaded first ${sampledRows.length.toLocaleString()} rows for fast UI preview. Prediction still uses full CSV file.`);
        }
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        setRows([]);
        setColumns([]);
        setFileUploaded(false);
        setIsUploading(false);
        setUiInfo(null);
        setPredictionError('Failed to parse CSV file.');
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 ">Credit Card Fraud Detection </h1>
          <p className="text-gray-600 mt-2">
            Upload a CSV file, run backend prediction, then inspect charts and summary.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-center gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-lg font-semibold text-gray-700">
                {isUploading ? 'Uploading CSV...' : 'Upload credit card dataset (.csv)'}
              </span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isUploading || isPredicting}
                className="hidden"
              />
            </label>
          </div>

          {isUploading && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 font-medium">
              CSV is loading. Please wait.
            </div>
          )}

          {fileUploaded && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 font-medium">
              File uploaded successfully.
            </div>
          )}

          {predictionError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {predictionError}
            </div>
          )}

          {uiInfo && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
              {uiInfo}
            </div>
          )}
        </div>

        {hasData && (
          <>
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 ">
              <div className='flex justify-between'>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Backend Prediction</h2>
                <button
                  type="button"
                  onClick={runBackendPrediction}
                  disabled={!uploadedFile || isPredicting}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {isPredicting ? 'Running backend prediction...' : 'Detect Fraud'}
                </button>
                {isPredicting && (
                  <p className="text-sm text-blue-700 mt-2">
                    Backend is processing the CSV. Please wait...
                  </p>
                )}
              
              </div>

              {predictionSummary && (
                <div className="mt-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Prediction Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6">
                      <div className="text-sm font-medium text-slate-600 mb-2">Rows Predicted</div>
                      <div className="text-3xl font-bold text-slate-900">{predictionSummary.rows.toLocaleString()}</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6">
                      <div className="text-sm font-medium text-green-700 mb-2">Non-Fraud</div>
                      <div className="text-3xl font-bold text-green-900">{predictionSummary.non_fraud_count.toLocaleString()}</div>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6">
                      <div className="text-sm font-medium text-red-700 mb-2">Fraud</div>
                      <div className="text-3xl font-bold text-red-900">{predictionSummary.fraud_count.toLocaleString()}</div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6">
                      <div className="text-sm font-medium text-amber-700 mb-2">Fraud Rate</div>
                      <div className="text-3xl font-bold text-amber-900">{(predictionSummary.fraud_rate * 100).toFixed(2)}%</div>
                    </div>
                  </div>

                  {previewRows.length > 0 && (
                    <div className="overflow-x-auto">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Prediction Preview (Top 5 Rows)</h4>
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            {previewColumns.map((column) => (
                              <th key={column} className="px-4 py-2 text-left text-sm font-semibold text-gray-900 border">
                                {column}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.slice(0, 5).map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              {previewColumns.map((column) => (
                                <td key={`${idx}-${column}`} className="px-4 py-2 text-sm text-gray-700 border">
                                  {String(row[column] ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Dataset Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
                  <div className="text-sm font-medium text-blue-600 mb-2">Rows (UI Preview)</div>
                  <div className="text-3xl font-bold text-blue-900">
                    {rows.length.toLocaleString()}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6">
                  <div className="text-sm font-medium text-purple-600 mb-2">Columns</div>
                  <div className="text-3xl font-bold text-purple-900">{columns.length}</div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6">
                  <div className="text-sm font-medium text-red-600 mb-2">Missing Values</div>
                  <div className="text-3xl font-bold text-red-900">{missingValues}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <button
                onClick={() => setShowDataPreview((prev) => !prev)}
                                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 "

              >
                <span>Preview Dataset (Top 5 Rows)</span>
               
              </button>

              {showDataPreview && (
                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        {columns.slice(0, 10).map((column) => (
                          <th key={column} className="px-4 py-2 text-left text-sm font-semibold text-gray-900 border">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          {columns.slice(0, 10).map((column) => (
                            <td key={`${idx}-${column}`} className="px-4 py-2 text-sm text-gray-700 border">
                              {String(row[column] ?? '').slice(0, 20)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Chart Column Selection</h2>
              <p className="text-sm text-gray-600 mb-4">
                You can change chart columns here during an interview demo.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">X-Axis Column</label>
                  <select
                    value={xAxisColumn}
                    onChange={(event) => setXAxisColumn(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  >
                    {selectableColumns.map((column) => (
                      <option key={column} value={column}>{column}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Y-Axis Column</label>
                  <select
                    value={yAxisColumn}
                    onChange={(event) => setYAxisColumn(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  >
                    {selectableColumns.map((column) => (
                      <option key={column} value={column}>{column}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Chart View</h2>
              <p className="text-sm text-gray-600 mb-4">
                Viewing <strong>{xAxisColumn || '-'}</strong> on X-axis and <strong>{yAxisColumn || '-'}</strong> on Y-axis.
              </p>
              <ResponsiveContainer width="100%" height={360}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="x" name={xAxisColumn} />
                  <YAxis type="number" dataKey="y" name={yAxisColumn} />
                  <Tooltip />
                  <Scatter data={xyChartData} fill="#2563eb" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {!fileUploaded && !isUploading && (
          <div className="rounded-3xl overflow-hidden shadow-lg bg-white pb-10 mt-52">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-10 text-white flex flex-col justify-center min-h-[320px]">
                <h2 className="text-4xl font-bold leading-tight">Credit Card Fraud Detection</h2>
                <p className="mt-4 text-slate-200 text-lg">
                  Upload your CSV file to start prediction and interactive analysis.
                </p>
                <p className="mt-6 text-sm text-slate-300">
                  Tip: prediction uses full CSV in backend, UI preview is optimized for speed.
                </p>
              </div>
              <div className="bg-gradient-to-b from-slate-100 to-slate-200 p-10 min-h-[320px] flex items-center justify-center">
                <div className="w-72 h-44 rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-950 shadow-2xl rotate-[-10deg] relative">
                  <div className="absolute top-6 left-6 w-10 h-8 rounded bg-slate-200/90" />
                  <div className="absolute bottom-12 left-6 right-6 text-slate-200 tracking-wider text-xl">
                    0374 1707 2709 2909
                  </div>
                  <div className="absolute bottom-6 left-6 text-slate-300 text-sm">12/01/07</div>
                  <div className="absolute bottom-6 right-6 w-16 h-8 rounded-full bg-slate-100/95" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreditUI;

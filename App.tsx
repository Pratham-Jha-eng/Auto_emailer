import React, { useState, useEffect, useCallback } from 'react';
import { ReportRow, SubBottlerGroup, EmailDraft, EmailMappings } from './types';
import { FileUpload } from './components/FileUpload';
import { ReportDashboard } from './components/ReportDashboard';
import { InfoIcon, WarningIcon } from './components/Icons';
import { generateEmailDraft } from './services/geminiService';
import { useLocalStorage } from './hooks/useLocalStorage';

// Since XLSX is loaded from a script tag, we declare it to TypeScript
declare var XLSX: any;

export default function App() {
  const [reportRows, setReportRows] = useState<ReportRow[] | null>(null);
  const [processedGroups, setProcessedGroups] = useState<SubBottlerGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [emailMappings, setEmailMappings] = useLocalStorage<EmailMappings>('emailMappings', {});
  const [emailDrafts, setEmailDrafts] = useState<Record<string, EmailDraft | 'loading' | 'error'>>({});

  const processFile = useCallback((file: File) => {
    setIsLoading(true);
    setError(null);
    setReportRows(null);
    setProcessedGroups(null);
    setEmailDrafts({});

    // --- NEW HELPER FUNCTION ---
    // This function will format JavaScript Date objects into DD-MM-YYYY
    const formatDate = (date: any): string => {
      if (date instanceof Date) {
        // Check if the date is valid
        if (isNaN(date.getTime())) {
          return "Invalid Date";
        }
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      }
      // If it's not a date, just convert it to a string
      return String(date ?? ''); // Handle null/undefined
    };
    // --- END HELPER FUNCTION ---

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (!e.target?.result) {
          throw new Error("Could not read the file content.");
        }

        let workbook;
        const fileType = file.type;
        const fileName = file.name.toLowerCase();

        if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
          // --- START OF AIRTIGHT PRE-PROCESSING ---
          let csvData = e.target.result as string;
          
          // 1. Remove Byte Order Mark (BOM)
          // This invisible character (\uFEFF) breaks parsing.
          csvData = csvData.replace(/^\uFEFF/, ''); 

          // 2. Sniff for and normalize delimiters
          // Check the first line for semicolons instead of commas.
          const firstLine = csvData.substring(0, csvData.indexOf('\n'));
          if (firstLine.includes(';') && !firstLine.includes(',')) {
              // If semicolons are found and commas are NOT, replace all.
              csvData = csvData.replace(/;/g, ',');
          }
          // --- END OF AIRTIGHT PRE-PROCESSING ---
          
          // Now, parse the *cleaned* CSV data
          workbook = XLSX.read(csvData, { type: 'string', cellDates: true });
          
        } else {
          // Handle Excel: XLSX.read needs an ArrayBuffer
          const data = new Uint8Array(e.target.result as ArrayBuffer);
          workbook = XLSX.read(data, { type: 'array', cellDates: true });
        }
        
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            throw new Error("The file does not contain any sheets.");
        }
        const worksheet = workbook.Sheets[sheetName];
        
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { cellDates: true });

        if (json.length === 0) {
          throw new Error("The uploaded file is empty or in an unsupported format.");
        }

        // --- START OF AIRTIGHT HEADER NORMALIZATION ---
        // Normalize all keys to be robust against "dirty" headers
        const normalizedJson = json.map(row => {
          const newRow: { [key: string]: any } = {};
          for (const key in row) {
            if (Object.prototype.hasOwnProperty.call(row, key)) {
              
              // 1. Remove all non-ASCII printable characters.
              // This strips BOM, zero-width spaces, and other "gremlins".
              const cleanKey = key.replace(/[^\x20-\x7E]/g, ''); 
              
              // 2. Normalize to lowercase, trim, and replace all spaces/underscores with a dash.
              // "Sub Bottler" -> "sub-bottler"
              // "sub_bottler" -> "sub-bottler"
              // " sub-bottler " -> "sub-bottler"
              const normalizedKey = cleanKey.toLowerCase().trim().replace(/[\s_]+/g, '-');
              
              newRow[normalizedKey] = row[key];
            }
          }
          return newRow;
        });
        // --- END OF AIRTIGHT HEADER NORMALIZATION ---

        const requiredColumns = ['bottler', 'sub-bottler'];
        const firstRow = normalizedJson[0];
        const availableColumns = Object.keys(firstRow);
        
        for (const col of requiredColumns) {
            if (!availableColumns.includes(col)) {
                // The error message now shows the *normalized* headers, which is better for debugging
                throw new Error(`The file is missing the required column: '${col}'. Please ensure your column headers are correct. Found headers: [${availableColumns.join(', ')}].`);
            }
        }
        
        // --- UPDATED ---
        // We now map over the data and use our formatDate function
        const cleanedRows: ReportRow[] = normalizedJson.map(row => {
          // Create a copy of the row to avoid overwriting Date objects
          const newRow: any = {};

          // Iterate over all keys and format dates
          for (const key in row) {
             if (Object.prototype.hasOwnProperty.call(row, key)) {
                // --- UPDATED TO USE NORMALIZED KEYS ---
                if (key === 'installed-date' || key === 'last-hit') {
                  newRow[key] = formatDate(row[key]);
                } else {
                  // Ensure all other values are strings
                  newRow[key] = String(row[key] ?? '');
                }
             }
          }

          // Special handling for subbottler logic
          // --- UPDATED TO USE NORMALIZED KEYS ---
          // This logic now correctly reads from the already-normalized keys
          newRow.subbottler = String((String(row['sub-bottler']).toUpperCase() === 'NAN' || !row['sub-bottler']) ? (row.bottler ?? '') : row['sub-bottler']);
          newRow.bottler = String(row.bottler ?? '');
          
          return newRow as ReportRow;
        });

        setReportRows(cleanedRows);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred while parsing the file.');
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setError('Failed to read the file. It might be corrupted or in use by another program.');
      setIsLoading(false);
    };

    // New logic: Read CSV as text, otherwise read as ArrayBuffer
    if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }, []);

  useEffect(() => {
    if (reportRows) {
      try {
          const groups: Record<string, ReportRow[]> = reportRows.reduce((acc, row) => {
            const key = row.subbottler;
            if (!acc[key]) {
              acc[key] = [];
            }
            acc[key].push(row);
            return acc;
          }, {} as Record<string, ReportRow[]>);

          const groupedArray: SubBottlerGroup[] = Object.keys(groups).map(key => ({
            name: key,
            rows: groups[key],
          }));

          setProcessedGroups(groupedArray);
          
          // Initialize drafts as loading
          const initialDrafts: Record<string, 'loading'> = {};
          groupedArray.forEach(group => {
            initialDrafts[group.name] = 'loading';
          });
          setEmailDrafts(initialDrafts);
      } catch (err) {
          setError(err instanceof Error ? `Error processing data: ${err.message}` : 'An unknown error occurred while grouping data.');
      } finally {
          setIsLoading(false);
      }
    }
  }, [reportRows]);

  const generateSingleDraft = useCallback(async (group: SubBottlerGroup) => {
    setEmailDrafts(prev => ({ ...prev, [group.name]: 'loading' }));
    try {
      const draft = await generateEmailDraft(group.name, group.rows);
      setEmailDrafts(prev => ({ ...prev, [group.name]: draft }));
    } catch (err) {
      console.error(`Failed to generate draft for ${group.name}:`, err);
      setError((err as Error).message); // Set the error for the main display
      setEmailDrafts(prev => ({ ...prev, [group.name]: 'error' }));
    }
  }, []);

  const generateAllDrafts = useCallback(async () => {
    if (!processedGroups) return;
    
    // Process requests in smaller, paced batches to respect the 15 RPM limit of the Gemini free tier.
    const BATCH_SIZE = 5; // 5 requests per batch
    const DELAY_BETWEEN_BATCHES_MS = 20000; // 20 seconds delay (5 reqs / 20s = 15 RPM)

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Create chunks of groups to process in batches
    const batches: SubBottlerGroup[][] = [];
    for (let i = 0; i < processedGroups.length; i += BATCH_SIZE) {
        batches.push(processedGroups.slice(i, i + BATCH_SIZE));
    }

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        // Process all requests in the current batch in parallel
        const promises = batch.map(group => generateSingleDraft(group));
        await Promise.all(promises);

        // If it's not the last batch, pause before processing the next one
        if (i < batches.length - 1) {
            await sleep(DELAY_BETWEEN_BATCHES_MS);
        }
    }
  }, [processedGroups, generateSingleDraft]);
  
  const handleRegenerateSingle = (groupName: string) => {
    const groupToRegenerate = processedGroups?.find(g => g.name === groupName);
    if (groupToRegenerate) {
      setError(null); // Clear previous errors before retrying
      generateSingleDraft(groupToRegenerate);
    }
  };

  useEffect(() => {
    if(processedGroups && processedGroups.length > 0) {
      generateAllDrafts();
    }
  }, [generateAllDrafts, processedGroups]);

  const handleReset = () => {
    setReportRows(null);
    setProcessedGroups(null);
    setError(null);
    setEmailDrafts({});
  };

  const handleFileError = (errorMessage: string) => {
      setError(errorMessage);
      setIsLoading(false);
  }

  return (
    <div className="min-h-screen text-slate-800 dark:text-slate-200 antialiased">
      <main className="container mx-auto p-4 md:p-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-teal-400">
            Intelligent Report Mailer
          </h1>
          <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
            Automate your reporting workflow with AI-powered email drafting.
          </p>
        </header>

        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 mb-8 border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <InfoIcon />
            How It Works
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Due to web browser security policies, this app cannot directly log into websites or access your downloaded files automatically. Instead, this tool automates the most time-consuming parts of your workflow:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-slate-600 dark:text-slate-400">
            <li>Manually download the report Excel or CSV file from your admin panel.</li>
            <li>Upload the file below. The app will process it in your browser—no data is sent to a server.</li>
            <li>The app cleans the data, groups it by sub-bottler, and uses AI to generate a draft email for each group.</li>
            <li>Review the drafts, map sub-bottlers to recipient emails, and click to open them in your default email client.</li>
          </ol>
        </div>
        
        {error && (
            <div className="max-w-4xl mx-auto bg-red-100 dark:bg-red-900/20 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mb-6" role="alert">
                <strong className="font-bold flex items-center gap-2"><WarningIcon /> Error: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        )}

        {!processedGroups ? (
          <FileUpload onFileUpload={processFile} onFileError={handleFileError} isLoading={isLoading} />
        ) : (
          <ReportDashboard
            groups={processedGroups}
            emailMappings={emailMappings}
            setEmailMappings={setEmailMappings}
            emailDrafts={emailDrafts}
            onReset={handleReset}
            onRegenerateAll={generateAllDrafts}
            onRegenerateSingle={handleRegenerateSingle}
          />
        )}
      </main>
      <footer className="text-center p-4 text-sm text-slate-500 dark:text-slate-400">
        <p>&copy; {new Date().getFullYear()} Intelligent Report Mailer. All rights reserved.</p>
      </footer>
    </div>
  );
}
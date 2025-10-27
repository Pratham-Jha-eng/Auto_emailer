import React, { useState } from 'react';
import { SubBottlerGroup, EmailMappings, EmailDraft, ReportRow } from '../types';
import { EmailIcon, ResetIcon, EditIcon, CheckIcon, DownloadIcon, RegenerateIcon, WarningIcon } from './Icons';

// New Icon for Sending
const SendIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.875L6 12zM6 12h9" />
  </svg>
);

// New Icon specifically for Gmail
const GmailIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  // Simple envelope icon - could be replaced with a more specific Gmail logo SVG if needed
  <svg {...props} className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" >
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z" />
  </svg>
);


interface ReportDashboardProps {
  groups: SubBottlerGroup[];
  emailMappings: EmailMappings; // Stores emails as comma-separated string
  setEmailMappings: React.Dispatch<React.SetStateAction<EmailMappings>>;
  emailDrafts: Record<string, EmailDraft | 'loading' | 'error'>;
  onReset: () => void;
  onRegenerateAll: () => void;
  onRegenerateSingle: (groupName: string) => void;
}

// --- UPDATED EmailMappingEditor ---
const EmailMappingEditor: React.FC<{
  groupName: string;
  emailString: string; // Renamed from 'email'
  onSave: (emailString: string) => void;
}> = ({ groupName, emailString, onSave }) => {
  const [currentEmailString, setCurrentEmailString] = useState(emailString);
  const [isEditing, setIsEditing] = useState(false);

  // Basic validation (optional)
  const validateEmails = (emails: string): boolean => {
    if (!emails.trim()) return true; // Allow empty
    const emailArray = emails.split(',').map(e => e.trim()).filter(e => e);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailArray.every(email => emailRegex.test(email));
  };

  const handleSave = () => {
    const trimmedEmails = currentEmailString.split(',').map(e => e.trim()).filter(e => e).join(', '); // Clean up spacing
    if (validateEmails(trimmedEmails)) {
        onSave(trimmedEmails);
        setIsEditing(false);
    } else {
        alert("One or more email addresses seem invalid. Please check them (use commas to separate).");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        handleSave();
    } else if (e.key === 'Escape') {
        setIsEditing(false);
        setCurrentEmailString(emailString); // Revert changes
    }
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      {isEditing ? (
        <>
          <input
            type="text" // Changed from 'email' to 'text'
            value={currentEmailString}
            onChange={(e) => setCurrentEmailString(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="email1@eg.com, email2@eg.com" // Updated placeholder
            autoFocus
            className="block w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button onClick={handleSave} aria-label="Save emails" className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            <CheckIcon className="w-5 h-5" />
          </button>
        </>
      ) : (
        <>
          <span className="text-sm text-slate-500 dark:text-slate-400 truncate">{emailString || 'No emails set'}</span>
          <button onClick={() => setIsEditing(true)} aria-label="Edit emails" className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            <EditIcon className="w-5 h-5" />
          </button>
        </>
      )}
    </div>
  );
};

export const ReportDashboard: React.FC<ReportDashboardProps> = ({ groups, emailMappings, setEmailMappings, emailDrafts, onReset, onRegenerateAll, onRegenerateSingle }) => {
  
  const [copiedGroup, setCopiedGroup] = useState<string | null>(null);
  const [copiedGmailGroup, setCopiedGmailGroup] = useState<string | null>(null); 
  const [sendingState, setSendingState] = useState<Record<string, 'idle' | 'loading' | 'sent' | 'error'>>({});

  // Helper function to get valid emails array from string
  const getValidEmails = (emailString: string | undefined): string[] => {
      if (!emailString) return [];
      return emailString.split(',')
                 .map(e => e.trim())
                 .filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)); // Filter only valid-looking emails
  };

  const handleSaveEmail = (groupName: string, emailString: string) => {
    setEmailMappings(prev => ({ ...prev, [groupName]: emailString }));
  };
  
  const reportRowsToCSV = (rows: ReportRow[]): string => {
    // ... (no changes needed) ...
    if (!rows || rows.length === 0) {
      return '';
    }
    const headers = Object.keys(rows[0]);
    const headerRow = headers.join(',');
    const bodyRows = rows.map(row => {
      return headers.map(header => {
        const cellData = String(row[header] ?? '');
        const escapedData = cellData.replace(/"/g, '""');
        if (cellData.includes(',') || cellData.includes('\n') || cellData.includes('"')) {
          return `"${escapedData}"`;
        }
        return escapedData;
      }).join(',');
    });
    return [headerRow, ...bodyRows].join('\n');
  };

  const handleDownloadCSV = (rows: ReportRow[], groupName: string) => {
    // ... (no changes needed) ...
    const csvContent = reportRowsToCSV(rows);
    if (!csvContent) {
        alert("No data available to download.");
        return;
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const sanitizedGroupName = groupName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.setAttribute('download', `Report-${sanitizedGroupName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- "COPY & OPEN DEFAULT CLIENT" FUNCTION (UPDATED) ---
  const handleEmailClick = (e: React.MouseEvent<HTMLAnchorElement>, groupName: string) => {
    e.preventDefault();
    
    const emailString = emailMappings[groupName];
    const draft = emailDrafts[groupName];
    const validEmails = getValidEmails(emailString); // Get valid emails

    // Use only the *first* email for mailto, as it handles multiple poorly
    const recipientEmail = validEmails[0]; 

    if (!recipientEmail || !draft || typeof draft === 'string') {
      alert("Please set at least one valid recipient email first.");
      return;
    }
    
    const mailtoLink = `mailto:${recipientEmail}?subject=${encodeURIComponent(draft.subject)}`;

    try {
      const blob = new Blob([draft.body], { type: 'text/html' });
      const data = [new ClipboardItem({ 'text/html': blob })];
      
      navigator.clipboard.write(data).then(
        () => {
          window.location.href = mailtoLink; 
          setCopiedGroup(groupName);
          setTimeout(() => setCopiedGroup(null), 2000);
        },
        (err) => {
          console.error('Failed to copy HTML to clipboard:', err);
          navigator.clipboard.writeText(draft.body).then(() => {
              window.location.href = mailtoLink; 
          });
        }
      );
    } catch (err) {
      console.error('Clipboard API error:', err);
      alert("Could not copy HTML. Opening email client - please copy the content manually.");
      window.location.href = mailtoLink; 
    }
  };

  // --- "COPY & OPEN GMAIL" FUNCTION (UPDATED) ---
  const handleGmailClick = (e: React.MouseEvent<HTMLAnchorElement>, groupName: string) => {
    e.preventDefault();
    
    const emailString = emailMappings[groupName];
    const draft = emailDrafts[groupName];
    const validEmails = getValidEmails(emailString); // Get valid emails

    if (validEmails.length === 0 || !draft || typeof draft === 'string') {
        alert("Please set at least one valid recipient email first.");
        return;
    }
    
    // Join valid emails with commas for Gmail URL
    const recipientsString = validEmails.join(','); 
    
    const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipientsString)}&su=${encodeURIComponent(draft.subject)}`;

    try {
      const blob = new Blob([draft.body], { type: 'text/html' });
      const data = [new ClipboardItem({ 'text/html': blob })];
      
      navigator.clipboard.write(data).then(
        () => {
          window.open(gmailLink, '_blank', 'noopener,noreferrer');
          setCopiedGmailGroup(groupName); 
          setTimeout(() => setCopiedGmailGroup(null), 2000);
        },
        (err) => {
          console.error('Failed to copy HTML to clipboard:', err);
          navigator.clipboard.writeText(draft.body).then(() => {
              window.open(gmailLink, '_blank', 'noopener,noreferrer');
          });
        }
      );
    } catch (err) {
      console.error('Clipboard API error:', err);
      alert("Could not copy HTML. Opening Gmail - please copy the content manually.");
      window.open(gmailLink, '_blank', 'noopener,noreferrer');
    }
  };


  // --- "SEND VIA BACKEND" FUNCTION (UPDATED) ---
  const handleSendEmail = async (groupName: string) => {
    const emailString = emailMappings[groupName];
    const draft = emailDrafts[groupName];
    const validEmails = getValidEmails(emailString); // Get valid emails array

    if (validEmails.length === 0) {
      alert("Please set at least one valid recipient email first.");
      return;
    }
    if (!draft || typeof draft === 'string') {
      alert("Email draft is not ready.");
      return;
    }

    setSendingState(prev => ({ ...prev, [groupName]: 'loading' }));

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft: draft,
          recipientEmails: validEmails, // Send the array of emails
        }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Failed to send email');
      }
      
      setSendingState(prev => ({ ...prev, [groupName]: 'sent' }));
      setTimeout(() => setSendingState(prev => ({ ...prev, [groupName]: 'idle' })), 3000);

    } catch (error: any) {
      console.error(error);
      alert(`Error: ${error.message}`);
      setSendingState(prev => ({ ...prev, [groupName]: 'error' }));
      setTimeout(() => setSendingState(prev => ({ ...prev, [groupName]: 'idle' })), 3000);
    }
  };


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Generated Reports</h2>
        <div className="flex gap-2">
          {/* ... (Regenerate All and Start Over buttons - no change) ... */}
           <button
            onClick={onRegenerateAll}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
          >
            <RegenerateIcon />
            Regenerate All
          </button>
          <button
            onClick={onReset}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            <ResetIcon />
            Start Over
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {groups.map((group) => {
          const draft = emailDrafts[group.name];
          const emailString = emailMappings[group.name] || ''; // Get the raw string
          const validEmails = getValidEmails(emailString); // Get valid emails array
          const currentSendingState = sendingState[group.name] || 'idle';
          
          return (
            <div key={group.name} className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">{group.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{group.rows.length} records found</p>
                {/* --- Pass emailString to editor --- */}
                <EmailMappingEditor groupName={group.name} emailString={emailString} onSave={(newString) => handleSaveEmail(group.name, newString)} />
              </div>
              
              <div className="p-5 flex-grow flex flex-col">
                <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">AI-Generated Email Draft</h4>
                {/* ... (Loading and Error states - no change) ... */}
                 {draft === 'loading' && (
                  <div className="flex-grow flex items-center justify-center text-slate-500 dark:text-slate-400">
                    {/* ... loading spinner ... */}
                     <div className="text-center">
                        <svg className="animate-spin h-6 w-6 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="mt-2 block">Generating draft...</span>
                    </div>
                  </div>
                )}
                {draft === 'error' && (
                    <div className="flex-grow flex flex-col items-center justify-center text-red-600 dark:text-red-400 text-sm text-center">
                       {/* ... error message and retry button ... */}
                        <WarningIcon className="w-8 h-8 mb-2" />
                        <p>Failed to generate draft.</p>
                        <button 
                            onClick={() => onRegenerateSingle(group.name)}
                            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                        >
                            <RegenerateIcon className="w-4 h-4" />
                            Retry
                        </button>
                    </div>
                )}
                {draft && typeof draft !== 'string' && (
                  <div className="space-y-4 flex-grow flex flex-col">
                     {/* ... (Subject and Body display - no change) ... */}
                     <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                        <p className="font-medium text-sm text-slate-800 dark:text-slate-200">{draft.subject}</p>
                     </div>
                     <div className="prose prose-sm max-w-none text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md p-3 max-h-60 overflow-y-auto flex-grow" dangerouslySetInnerHTML={{ __html: draft.body }} />
                     
                     {/* --- BUTTON GROUP (UPDATED DISABLING LOGIC) --- */}
                     <div className="flex flex-wrap gap-2 pt-2">
                        {/* --- "COPY & OPEN DEFAULT" BUTTON --- */}
                        <a
                            href="#"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${validEmails.length === 0 ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                            style={{ minWidth: '190px' }} 
                            aria-disabled={validEmails.length === 0}
                            onClick={(e) => handleEmailClick(e, group.name)}
                            title="Open in default email client & copy body (uses first email)"
                        >
                          {copiedGroup === group.name ? ( /* ... copied state ... */ <><CheckIcon className="w-5 h-5" /> Copied! Just Paste.</> ) : 
                          ( /* ... default state ... */ <><EmailIcon /> Open & Copy Email</> )}
                        </a>

                        {/* --- "COPY & OPEN GMAIL" BUTTON --- */}
                        <a
                            href="#"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${validEmails.length === 0 ? 'bg-slate-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                            style={{ minWidth: '210px' }} 
                            aria-disabled={validEmails.length === 0}
                            onClick={(e) => handleGmailClick(e, group.name)}
                            title="Open in Gmail & copy body (uses all valid emails)"
                        >
                          {copiedGmailGroup === group.name ? ( /* ... copied state ... */ <><CheckIcon className="w-5 h-5" /> Copied! Paste in Gmail.</> ) : 
                          ( /* ... default state ... */ <><GmailIcon /> Open in Gmail & Copy</> )}
                        </a>

                        {/* --- "SEND VIA BACKEND" BUTTON --- */}
                        <button
                          onClick={() => handleSendEmail(group.name)}
                          disabled={validEmails.length === 0 || currentSendingState === 'loading' || currentSendingState === 'sent'}
                          className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                            validEmails.length === 0 ? 'bg-slate-400 cursor-not-allowed' :
                            currentSendingState === 'loading' ? 'bg-yellow-500 cursor-wait' :
                            currentSendingState === 'sent' ? 'bg-green-500 cursor-not-allowed' :
                            currentSendingState === 'error' ? 'bg-red-500' :
                            'bg-teal-600 hover:bg-teal-700'
                          }`}
                          style={{ minWidth: '130px' }}
                          title="Send email automatically to all valid emails"
                        >
                          {/* ... (button text/icon logic - no change) ... */}
                          {currentSendingState === 'loading' && ( <svg className="animate-spin h-5 w-5" /* ... */> </svg> )}
                          {currentSendingState === 'idle' && <><SendIcon /> Send Email</>}
                          {currentSendingState === 'loading' && 'Sending...'}
                          {currentSendingState === 'sent' && <><CheckIcon /> Sent!</>}
                          {currentSendingState === 'error' && <><WarningIcon className="w-5 h-5" /> Retry</>}
                        </button>
                     </div>
                     <div className="flex flex-wrap gap-2 pt-2">
                         {/* --- DOWNLOAD CSV BUTTON --- */}
                         <button
                            onClick={() => handleDownloadCSV(group.rows, group.name)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                        >
                            <DownloadIcon />
                            Download CSV
                        </button>
                     </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


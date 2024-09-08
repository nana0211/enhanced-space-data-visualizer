import React, { useState, useCallback, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import ColumnSelection from './components/ColumnSelection';
import AnimatedEllipsis from './components/AnimatedEllipsis';
import './styles/App.css'; 

const getAllColumns = (obj) => {
  let columns = [];
  if (Array.isArray(obj)) {
    return obj;
  }
  if (typeof obj === 'object') {
    for (let key in obj) {
      columns = columns.concat(getAllColumns(obj[key]));
    }
  }
  return columns;
};


export default function App() {
  const [file, setFile] = useState(null);
  const [filePath, setFilePath] = useState(null);
  const [outputOption, setOutputOption] = useState('detailed');
  const [columns, setColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [error, setError] = useState(null);
 
  const [isFileUploaded, setIsFileUploaded] = useState(false);
  const [isFetchingColumns, setIsFetchingColumns] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showDetailedDescriptions, setShowDetailedDescriptions] = useState(false);

  useEffect(() => {
    if (Object.keys(columns).length > 0) {
      const allColumns = getAllColumns(columns);
      console.log("All columns in useEffect？？？:", allColumns);
      setSelectedColumns(allColumns);
    }
  }, [columns]);

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
    setError(null);
    setIsFileUploaded(false);
    setColumns([]);  // Clear any previously fetched columns
  };
  // Add this new function to process the columns
  const processColumns = (rawColumns) => {
    if (typeof rawColumns === 'object' && !Array.isArray(rawColumns)) {
      // If rawColumns is already an object with categories, return it as is
      return rawColumns;
    }
    // If rawColumns is an array, we need to categorize it
    const categorizedColumns = {
      'Perspective taking': [],
      'Perspective summaries': []
    };
    
    rawColumns.forEach(column => {
      if (column.startsWith('Perspective_trial_')) {
        categorizedColumns['Perspective taking'].push(column);
      } else if (column.startsWith('Perspective_')) {
        categorizedColumns['Perspective summaries'].push(column);
      } else {
        // You can add more categories or a default category here if needed
      }
    });
    
    return categorizedColumns;
  };

  const handleUploadAndFetchColumns = async () => {
    if (!file) {
      setError('Please select a file before uploading.');
      return;
    }
  
    setError(null);
    setIsFileUploaded(false);
    setIsExpanded(false);
    setIsUploading(true);
  
    try {
      console.log("Starting file upload...");
      const formData = new FormData();
      formData.append('file', file);
      const uploadResponse = await fetch('http://localhost:7069/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (!uploadResponse.ok) {
        throw new Error(`HTTP error! status: ${uploadResponse.status}`);
      }
      const uploadData = await uploadResponse.json();
      if (!uploadData.success) {
        throw new Error(uploadData.message || 'Unknown error occurred during file upload');
      }
      console.log("File uploaded successfully. Response:", uploadData);
      setFilePath(uploadData.file_path);
  
      console.log("Fetching columns...");
      await fetchColumns(uploadData.file_path);
     
      setIsUploading(false);
      setIsFetchingColumns(true);
      await fetchColumns(uploadData.file_path);
      setIsFileUploaded(true);
    } catch (e) {
      console.error('Error during upload or fetching columns:', e);
      setError(e.message || 'Failed to upload file or fetch columns. Please try again.');
    } finally {
      setIsUploading(false);
      setIsFetchingColumns(false);
    }
  };

  const fetchColumns = useCallback(async (path) => {
    setError(null);
    setIsFetchingColumns(true);
    try {
      const fetchPath = path || filePath;
      console.log(`Fetching columns with option: ${outputOption.option}, file_path: ${fetchPath}`);
      const response = await fetch(`http://localhost:7069/api/columns?option=${outputOption.option}&file_path=${encodeURIComponent(fetchPath)}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Raw data received from server:", data);
      
      let newColumns = [];
      if (data && typeof data === 'object' && data.columns) {
        if (Array.isArray(data.columns)) {
          newColumns = data.columns;
        } else if (typeof data.columns === 'object') {
          // If columns is an object, flatten it into an array of column names
         newColumns = data.columns;
        } else {
          throw new Error("Unexpected columns data format");
        }
      } else {
        throw new Error("Unexpected data format received from server");
      }
      // const processedColumns = processColumns(newColumns);
      setColumns(newColumns);
      console.log("Columns set in state:", newColumns);
        // Set all columns as selected by default
      const allColumns = getAllColumns(newColumns);
      setSelectedColumns(allColumns);
      console.log("All columns selected by default:", allColumns);
    } catch (e) {
      console.error('Error fetching columns:', e);
      setError(`Failed to fetch columns: ${e.message}`);
    } finally {
    
      setIsFetchingColumns(false);
    }
  }, [outputOption.option, filePath]);

  const handleSetSelectedColumns = (newSelectedColumns) => {
    console.log("Updating selected columns in App:", newSelectedColumns);
    setSelectedColumns(newSelectedColumns);
  };

  const handleDownload = async () => {
    setError(null);
    setIsDownloading(true);
    try {
      const requestData = { 
        columns: selectedColumns, 
        option: outputOption.option,
        file_path: filePath
      };
      console.log('Sending download request with:', JSON.stringify(requestData, null, 2));
      const response = await fetch('http://localhost:7069/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
        credentials: 'include'
      });
      console.log('Response status:', response.status);
      console.log('Response headers:', JSON.stringify(Object.fromEntries(response.headers), null, 2));
 
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'combined_output.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error processing data:', e);
      setError(`Failed to process data: ${e.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={`app-container ${isExpanded ? 'expanded' : ''}`} style={{
      display: 'flex', 
      height: '100vh',
      // transition: 'all 0.3s ease-in-out'// new added
      }}>
      {/* Left Panel */}
      <div className="left-panel" style={{
        width: isExpanded ? '30%' : '50%',//new added
        backgroundColor: '#f97316', 
        color: 'white', 
        padding: '48px', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between',
        alignItems: 'center',//new added
        // transition: 'all 0.3s ease-in-out' //new added
      }}>
        <div>
          <h1 style={{fontSize: '3rem', fontWeight: 'bold', marginBottom: '48px'}}>Enhanced Space Data Visualizer</h1>
          <FileUpload onFileSelect={handleFileSelect} file={file} />

          <div style={{marginTop: '48px'}}>
            <h3 style={{fontSize: '1.5rem', marginBottom: '24px'}}>Select Output Option:</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.125rem'}}>
                <input
                  type="radio"
                  value="detailed"
                  checked={outputOption.option === 'detailed'}
                  onChange={() => setOutputOption({ option: 'detailed', showDetailedDescriptions: true })}
                  style={{width: '20px', height: '20px'}}
                />
                <span>Detailed Measures</span>
              </label>
              <label style={{display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.125rem'}}>
                <input
                  type="radio"
                  value="summary"
                  checked={outputOption.option === 'summary'}
                  onChange={() => setOutputOption({ option: 'summary', showDetailedDescriptions: false })}
                  style={{width: '20px', height: '20px'}}
                />
                <span>Quick Summary of Measures</span>
              </label>
            </div>
          </div>

          <button 
            onClick={handleUploadAndFetchColumns}
            style={{
              marginTop: '24px',
              backgroundColor: 'white',
              color: '#f97316',
              padding: '12px 24px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#fb923c';
              e.target.style.color = 'white';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'white';
              e.target.style.color = '#fb923c';
            }}
          >
            Upload your file
          </button>

          <div style={{fontSize: '0.875rem', marginTop: '48px'}}>
            © 2024 Enhanced Space Data Visualizer. All rights reserved.
          </div>
        </div>
        
  
      </div>

       {/* Right Panel */}
      <div style={{
        width: isExpanded ? '70%' : '50%', 
        backgroundColor: 'white', 
        padding: '48px', 
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        // transition: 'all 0.3s ease-in-out'
        }}>
        <h2 style={{fontSize: '3rem', fontWeight: 'bold', marginBottom: '32px', color: '#1f2937'}}>Select Columns for Download</h2>
        {isUploading && <p style={{fontSize: '1.25rem', color: '#4b5563'}}> Uploading your file<AnimatedEllipsis /></p>}
        {isFetchingColumns && <p style={{fontSize: '1.25rem', color: '#4b5563'}}>Fetching columns<AnimatedEllipsis /></p>}
        {isDownloading && <p style={{fontSize: '1.25rem', color: '#4b5563'}}> File downloading, wait a few seconds<AnimatedEllipsis />.</p>}
        {error && (
          <div style={{fontSize: '1.25rem', color: 'red', marginBottom: '20px'}}>
            <p>Error: {error}</p>
            <p>Please try uploading the file again or contact support if the problem persists.</p>
          </div>
        )}
        {!isUploading && !isFetchingColumns && !isDownloading && !error && (
          isFileUploaded ? (
            console.log("Columns in render!!!!:", columns),
            Object.keys(columns).length > 0 ? (
              <ColumnSelection
                columns={columns}
                selectedColumns={selectedColumns}
                setSelectedColumns={handleSetSelectedColumns}
                onDownload={handleDownload}
                showDetailedDescriptions={showDetailedDescriptions} // This should be controlled by the left pa
                // getAllColumns={getAllColumns}
              />
            ) : (
              <p style={{fontSize: '1.25rem', color: '#4b5563'}}>No columns found in the uploaded file.</p>
            )
          ) : (
            <p style={{fontSize: '1.25rem', color: '#4b5563'}}>
              {file ? 'Click "Upload your file" to process and view columns' : 'Please select a file to upload'}
            </p>
          )
        )}
      </div>
    </div>
  );
}
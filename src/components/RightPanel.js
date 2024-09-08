import React, { useState } from 'react';
import ColumnSelection from './ColumnSelection';
import '../styles/RightPanel.css';

function RightPanel({ file, columns, outputOption }) {
  const [selectedColumns, setSelectedColumns] = useState([]);

  const handleDownload = () => {
    // Implement download logic here
    console.log('Downloading with selected columns:', selectedColumns);
  };

  return (
    <div className="RightPanel">
      <h2>Select Columns for Download</h2>
      {file ? (
        <>
          <ColumnSelection 
            columns={columns}
            selectedColumns={selectedColumns}
            setSelectedColumns={setSelectedColumns}
          />
          <button onClick={handleDownload}>Convert and Download</button>
        </>
      ) : (
        <p>Please upload a file to select columns</p>
      )}
    </div>
  );
}

export default RightPanel;
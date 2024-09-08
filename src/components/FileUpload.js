import React from 'react';
import { Upload } from 'lucide-react';

function FileUpload({onFileSelect, file }) {
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  return (
    <div style={{ marginBottom: '32px' }}>
      <label style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '128px',
        border: '2px dashed white',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'background-color 0.3s',
      }}
      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <Upload size={48} color="white" />
        <span style={{ marginTop: '8px', color: 'white' }}>Select a file</span>
        <input type="file" onChange={handleFileChange} style={{ display: 'none' }} />
      </label>
      {file && <p style={{ marginTop: '8px', color: 'white' }}>Selected file: {file.name}</p>}
    </div>
  );
}

export default FileUpload;
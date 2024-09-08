import React from 'react';
import FileUpload from './FileUpload';
import '../styles/LeftPanel.css';

function LeftPanel({ onFileUpload, outputOption, setOutputOption }) {
  return (
    <div className="LeftPanel">
      <h1>FAIR FIGHT FOR ALL</h1>
      <h2>ETHNICITY MATTERS.</h2>
      <FileUpload onFileUpload={onFileUpload} />
      <div className="output-options">
        <h3>Select Output Option:</h3>
        <label>
          <input
            type="radio"
            value="detailed"
            checked={outputOption === 'detailed'}
            onChange={() => setOutputOption('detailed')}
          />
          Detailed Measures
        </label>
        <label>
          <input
            type="radio"
            value="summary"
            checked={outputOption === 'summary'}
            onChange={() => setOutputOption('summary')}
          />
          Quick Summary of Measures
        </label>
      </div>
    </div>
  );
}

export default LeftPanel;
import React, { useState, useEffect } from 'react';

const ColumnSelection = ({ columns, selectedColumns, setSelectedColumns, onDownload, showDetailedDescriptions }) => {
  const [localSelectedColumns, setLocalSelectedColumns] = useState(new Set(selectedColumns));
  const [expandedGroups, setExpandedGroups] = useState({});
  const orderedGroups = ['Player', 'Training', 'PI (for each trial)', 'Pointing error', 'Map','Memory','Perspective taking', 'Overall Measures'];
  
  const detailedGroupDescriptions = {
    'Player': 'This group includes player-related information such as player ID, age, gender, education level, etc.',
    'Training': 'This group includes several time measures during the training session. For example, RotationTime indicates how long the user rotated during training, and TotalTrainingTime is the sum of all training activities.',
    'PI (for each trial)': 'Path Integration (PI) data includes specific measures like PI TotalTime, PI Distance, PI DistanceRatio, PI FinalAngle, and Corrected PI Angle for each trial. The averages in PI Summaries (e.g., Avg_PI_TotalTime, Avg_PI_Distance) are calculated by averaging these measures across all selected trials. **If no specific PI trials are selected, the averages are calculated using data from all available trials. However, if only certain trials (e.g., PI_trial_0, PI_trial_1, PI_trial_j) are selected, the averages will be computed based on these selected trials only.**',
    'Pointing error': 'Pointing error data includes measures related to the accuracy of pointing judgments in each trial. Each trial has an absolute error measure (e.g., PointingJudgement_AbsoluteError). The averages in Pointing Error Averages (e.g., Average_PointingJudgementError_all) are calculated by averaging the errors across all selected pointing trials. **If no specific pointing trials are selected, the average is based on all available trials. If only certain trials are selected, the average is computed based on those selected trials.**',
    'Perspective taking': 'Perspective taking involves tasks where the user estimates spatial perspectives relative to different objects. The Perspective_Error_Average is computed by averaging the error measures across all selected perspective trials. **If no specific trials are selected, the averages are calculated using all available trials. If only certain perspective trials are selected, the average error is computed based on those specific trials only.**',
    'Overall Measures': 'Overall measures include key timestamps like SPACEStartTime and SPACEEndTime, as well as SPACETotalTime, which represents the total duration of the experiment from start to finish.'
  };

  const quickSummaryGroupDescriptions = {
    'Player': 'Player-related information, such as the player ID.',
    'Training': 'This includes the total time spent during the training session (TotalTrainingTime).',
    'PI (for each trial)': 'Summary averages of key PI measures, including TotalTime, Distance, and Final Angle. **These averages (Avg_PI_TotalTime, Avg_PI_Distance, Avg_PI_FinalAngle) are calculated by averaging the corresponding measures across all PI trials.**',
    'Pointing error': 'The overall average of pointing judgment errors across all pointing trials. **The average (Average_PointingJudgementError_all) is calculated by averaging the pointing errors across all trials, providing a comprehensive measure of pointing accuracy.**',
    'Perspective taking': 'The average error in perspective-taking tasks. **The average (Avg_PerspectiveErrorMeasure) is calculated by averaging the error measures across all perspective-taking trials, providing an overall measure of accuracy in perspective-taking tasks.**',
    'Overall Measures': 'Key timestamps such as SPACEStartTime and SPACEEndTime, and the total time of the entire experiment (SPACETotalTime).'
  };

  useEffect(() => {
    setLocalSelectedColumns(new Set(selectedColumns));
  }, [selectedColumns]);

  const handleColumnToggle = (column, parentColumns, isChecked) => {
    setLocalSelectedColumns(prev => {
      const newSet = new Set(prev);
      
      const toggleColumn = (col) => {
        if (isChecked) {
          newSet.delete(col);
        } else {
          newSet.add(col);
        }
      };

      const toggleGroup = (group) => {
        const childColumns = getChildColumns(group);
        childColumns.forEach(col => {
          if (isChecked) {
            newSet.delete(col);
          } else {
            newSet.add(col);
          }
        });
      };

      if (Array.isArray(parentColumns) || typeof parentColumns === 'string') {
        // Leaf node
        toggleColumn(column);
      } else {
        // Group node
        toggleGroup(parentColumns[column]);
      }
      // After updating the set, immediately update the parent component
      const updatedColumns = Array.from(newSet);
      console.log("Updating selected columns:", updatedColumns);
      setSelectedColumns(updatedColumns);

      return newSet;
    });
  };

  const getChildColumns = (obj) => {
    if (Array.isArray(obj)) {
      return obj;
    }
    if (typeof obj === 'string') {
      return [obj];
    }
    return Object.values(obj).flatMap(getChildColumns);
  };

  const toggleGroup = (group) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };
  const sortColumns = (columns, group) => {
    if (group === 'PI (for each trial)' || group === 'Perspective taking') {
      return Object.keys(columns).sort((a, b) => {
        if (group === 'PI (for each trial)') {
          if (a === 'PI Summaries') return -1;
          if (b === 'PI Summaries') return 1;
        } else if (group === 'Perspective taking') {
          if (a === 'Pespective summaries') return -1;
          if (b === 'Pespective summaries') return 1;
        }
        const aNum = parseInt(a.split('_').pop());
        const bNum = parseInt(b.split('_').pop());
        return aNum - bNum;
      });
    }
    return Object.keys(columns);
  };

  const renderColumns = (columns, depth = 0, group, parent = '') => {
    if (Array.isArray(columns)) {
      return columns.map(column => (
        <div key={column} style={{marginLeft: `${depth * 20}px`, marginBottom: '8px'}}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '1rem',
            color: '#4b5563',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={localSelectedColumns.has(column)}
              onChange={() => handleColumnToggle(column, columns, localSelectedColumns.has(column))}
              style={{
                marginRight: '8px',
                width: '18px',
                height: '18px',
                accentColor: '#f97316'
              }}
            />
            {column.replace(/_/g, ' ')}
          </label>
        </div>
      ));
    } else if (typeof columns === 'object') {
      const sortedKeys = sortColumns(columns, group);
        return sortedKeys.map(key => {
          const value = columns[key];
          const childColumns = getChildColumns(value);
          const allSelected = childColumns.every(col => localSelectedColumns.has(col));
          const someSelected = childColumns.some(col => localSelectedColumns.has(col));

          const isExpanded = expandedGroups[`${group}.${key}`];
          const isLeaf = !Array.isArray(value) && typeof value !== 'object';
          const shouldRenderChildren = isExpanded || isLeaf;


        return (
          <div key={key} style={{marginBottom: '8px', marginLeft: `${depth * 20}px`}}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: depth === 0 ? '1.1rem' : '1rem',
              fontWeight: depth === 0 ? 'bold' : 'normal',
              color: depth === 0 ? '#1f2937' : '#4b5563',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={allSelected}
                ref={input => {
                  if (input) {
                    input.indeterminate = someSelected && !allSelected;
                  }
                }}
                onChange={() => handleColumnToggle(key, columns, allSelected)}
                style={{
                  marginRight: '8px',
                  width: '18px',
                  height: '18px',
                  accentColor: '#f97316'
                }}
              />
              {key.replace(/_/g, ' ')}
              {!isLeaf && (
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    toggleGroup(`${group}.${key}`);
                  }}
                  style={{
                    marginLeft: '8px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  {isExpanded ? '▼' : '►'}
                </button>
              )}
            </label>
            {shouldRenderChildren && renderColumns(value, depth + 1, group, key)}
          </div>
        );
      });
    }
    return null;
  };

  return (
    <div>
      {orderedGroups.map(group => {
        if (columns[group]) {
          return (
            <div key={group} style={{marginBottom: '24px'}}>
              <h3 style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', color: '#1f2937'}}>{group}</h3>
              <p style={{marginBottom: '12px', color: '#4b5563'}}>
                {showDetailedDescriptions ? detailedGroupDescriptions[group] : quickSummaryGroupDescriptions[group]}
              </p>
              {renderColumns(columns[group], 0, group)}
            </div>
          );
        }
        return null;
      })}
      <button 
        onClick={() => {
          const finalSelectedColumns = Array.from(localSelectedColumns);
          console.log("Columns being sent for download:", finalSelectedColumns);
          setSelectedColumns(finalSelectedColumns);
          onDownload();
        }} 
        style={{
          marginTop: '24px',
          backgroundColor: '#f97316',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '4px',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '1rem',
          transition: 'background-color 0.3s ease'
        }}
        onMouseOver={(e) => e.target.style.backgroundColor = '#fb923c'}
        onMouseOut={(e) => e.target.style.backgroundColor = '#f97316'}
      >
        Download Selected Columns
      </button>
    </div>
  );
};

export default ColumnSelection;

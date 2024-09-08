import os
import pandas as pd
import numpy as np
import zipfile
from flask import Flask, request, send_file, jsonify, send_from_directory, session
from werkzeug.utils import secure_filename
from finalJSONtoCSV import get_column_groups, JSONtoCSV, get_summary_columns, calculate_pi_averages, clean_column_groups, calculate_pointing_averages, calculate_pet_averages
from getTrialNumbers import findAllTrials
from flask_cors import CORS
from flask_session import Session
from datetime import timedelta
import logging
import sys

app = Flask(__name__)
CORS(app, supports_credentials=True)
app.secret_key = "supersecretkey"  # Make sure this is set
app.config['SESSION_TYPE'] = 'filesystem'  # Use filesystem-based sessions
app.config['SESSION_FILE_DIR'] = '/tmp/flask_session'
app.config['SESSION_PERMANENT'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=30)
UPLOAD_FOLDER = 'uploads'
DOWNLOAD_FOLDER = 'downloads'
ALLOWED_EXTENSIONS = {'json', 'zip'}
Session(app)

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                    handlers=[logging.StreamHandler(sys.stdout)])

# Create a logger for app.py
app_logger = logging.getLogger(__name__)

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['DOWNLOAD_FOLDER'] = DOWNLOAD_FOLDER

# At the top of your file, after your imports
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
app.config['DOWNLOAD_FOLDER'] = os.path.join(project_root, 'downloads')
app_logger.info(f"DOWNLOAD_FOLDER set to: {app.config['DOWNLOAD_FOLDER']}")

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def clear_folder(folder):
    for filename in os.listdir(folder):
        file_path = os.path.join(folder, filename)
        try:
            if os.path.isfile(file_path) or os.path.islink(file_path):
                os.unlink(file_path)
        except Exception as e:
            print(f'Failed to delete {file_path}. Reason: {e}')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        clear_folder(app.config['UPLOAD_FOLDER'])
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        session['file_path'] = file_path
        app_logger.info(f"File uploaded successfully: {file_path}")
        app_logger.info(f"Session file_path set to: {session.get('file_path')}")
        return jsonify({'success': True, 'message': 'File uploaded successfully', 'file_path': file_path}), 200
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/api/columns', methods=['GET', 'POST'])
def get_columns():
    app_logger.info(f"Session contents: {dict(session)}")
    app_logger.info(f"Request method: {request.method}")
    app_logger.info(f"Request args: {request.args}")
    app_logger.info(f"Request form: {request.form}")
    app_logger.info(f"Request headers: {dict(request.headers)}")
    
    if request.method == 'GET':
        output_option = request.args.get('option', 'all_trials')
        file_path = request.args.get('file_path')
    else:  # POST
        data = request.get_json(silent=True) or {}
        output_option = data.get('option', 'all_trials')
        file_path = data.get('file_path')
    
    app_logger.info(f"Output option: {output_option}")
    app_logger.info(f"File path from request: {file_path}")
    
    session_file_path = session.get('file_path')
    app_logger.info(f"File path from session: {session_file_path}")
    
    if not file_path and not session_file_path:
        app_logger.error("File path not found in request or session")
        return jsonify({'error': 'File path not found'}), 400
    
    file_path = file_path or session_file_path
    
    if not os.path.exists(file_path):
        app_logger.error(f"File not found at path: {file_path}")
        return jsonify({'error': 'File not found at the specified path'}), 400

    try:
        json_files = []
        if file_path.endswith('.zip'):
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                zip_ref.extractall(app.config['UPLOAD_FOLDER'])
                json_files = [os.path.join(app.config['UPLOAD_FOLDER'], f) for f in zip_ref.namelist() if f.endswith('.json')]
        else:
            json_files = [file_path]
        num_pi, num_pj, num_pot, num_pet = findAllTrials(json_files)
        df = JSONtoCSV(json_files, os.path.basename(file_path), num_pi, num_pj, num_pot, num_pet)
        app_logger.info(f"OMG！！！DataFrame shape: {df.shape}")
        app_logger.info(f"OMG！！！DataFrame columns: {df.columns.tolist()}")
        app_logger.info(f"OMG ！！！DataFrame: {df['Nest_X'].values}")
        app_logger.info(f"OMG ！！！DataFrame: {df['Nest_Y'].values}")
        app_logger.info(f"OMG ！！！DataFrame: {df['Cave_X'].values}")
        app_logger.info(f"OMG ！！！DataFrame: {df['Cave_Y'].values}")
        app_logger.info(f"OMG ！！！DataFrame: {df['Arch_X'].values}")
        app_logger.info(f"OMG ！！！DataFrame: {df['Arch_Y'].values}")
        if output_option == 'summary':
            app_logger.info("Returning summary columns")
            column_groups = get_summary_columns()
        else:
            app_logger.info("Returning all trials columns")
            column_groups = get_column_groups(df, num_pi, num_pj, num_pot, num_pet)
        app_logger.info(f"OMG！！！Column groups: {column_groups}")
        
        cleaned_column_groups = clean_column_groups(column_groups, df)
        
        app_logger.info(f"Processed column groups: {cleaned_column_groups}")
        app_logger.info(f"Column groups type: {type(cleaned_column_groups)}")
        app_logger.info(f"Column groups keys: {cleaned_column_groups.keys() if isinstance(cleaned_column_groups, dict) else 'Not a dict'}")
        
        def process_group(group):
            if isinstance(group, dict):
                processed = {}
                for k, v in group.items():
                    if k == "PI (for each trial)":
                        # Sort PI trials numerically
                        sorted_trials = sorted(v.keys(), key=lambda x: int(x.split('_')[-1]) if x.startswith('PI_trial_') else float('inf'))
                        processed[k] = {trial: v[trial] for trial in sorted_trials}
                    else:
                        processed[k] = process_group(v)
                return processed
            elif isinstance(group, list):
                return group
            return group
       
        top_level_groups = {k: process_group(v) for k, v in cleaned_column_groups.items()}
        app_logger.info(f"Processed top_level_groups: {top_level_groups}")
        response_data = {"columns": top_level_groups}
        return jsonify(response_data)
    except Exception as e:
        app_logger.error(f'Error in get_columns: {str(e)}')
        import traceback
        app_logger.error(traceback.format_exc())
        return jsonify({'error': f'An error occurred while fetching columns: {str(e)}'}), 500
    

def expand_selected_columns(selected_columns, column_groups_all_trials, column_groups_average, df, output_option):
    expanded_columns = []
    app_logger.info(f"Input selected_columns: {selected_columns}")
    app_logger.info(f"Output option: {output_option}")
    app_logger.info(f"DataFrame columns: {df.columns.tolist()}")
    if not selected_columns:
        app_logger.warning("No columns selected")
        return expanded_columns

    def expand_pi_trial(trial_num, df_columns):
        pi_columns = [c for c in df_columns if c.startswith(f'PI_') and c.split('_')[2] == trial_num]
        order = ['TotalTime', 'Distance', 'DistRatio', 'FinalAngle', 'Angle', 'Corrected_PI_Angle']
        return sorted(pi_columns, key=lambda x: order.index(x.split('_')[1]) if x.split('_')[1] in order else len(order))

    for col in selected_columns:
        app_logger.info(f"Processing column: {col}")
        if output_option in ['all_trials', 'detailed']:
            if col == 'Player_ID':
                expanded_columns.append(col)
            elif col.startswith('PI_trial_'):
                trial_num = col.split('_')[-1]
                expanded_columns.extend(expand_pi_trial(trial_num, df.columns))
            elif col.startswith('Pointing_trial_'):
                trial_num = col.split('_')[-1]
                expanded_columns.extend([c for c in df.columns if c.startswith(f'PointingJudgement_AbsoluteError_{trial_num}_')])
            elif col.startswith('Perspective_trial_'):
                trial_num = col.split('_')[-1]
                expanded_columns.extend([c for c in df.columns if c.startswith(f'Perspective') and f'_{trial_num}' in c])
            else:
                expanded_columns.append(col)
        elif output_option == 'summary':
            if col.startswith('PI_'):
                expanded_columns.append(col)
            elif col.startswith('Pointing_Error_'):
                expanded_columns.append(col)
            elif col.startswith('Perspective'):
                expanded_columns.append(col)
            else:
                expanded_columns.append(col)

    expanded_columns = list(dict.fromkeys(expanded_columns))  # Remove duplicates
    return expanded_columns

@app.route('/api/process', methods=['POST'])
def process_columns():
    data = request.json
    download_folder = app.config['DOWNLOAD_FOLDER']
    app_logger.info(f"Download folder: {download_folder}")
    # Ensure the download folder exists
    os.makedirs(download_folder, exist_ok=True)

    app_logger.info(f"Received data: {data}")
    selected_columns = data.get('columns', [])
    output_option = data.get('option', 'all_trials')
    file_path = data.get('file_path')
    app_logger.info(f"Selected columns: {selected_columns}")
    app_logger.info(f"Output option: {output_option}")
    app_logger.info(f"File path: {file_path}")
    if not file_path or not os.path.exists(file_path):
        app_logger.error(f"File not found at path: {file_path}")
        return jsonify({'error': 'File not found'}), 400

    try:
        json_files = []
        if file_path.endswith('.zip'):
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                zip_ref.extractall(app.config['UPLOAD_FOLDER'])
                json_files = [os.path.join(app.config['UPLOAD_FOLDER'], f) for f in zip_ref.namelist() if f.endswith('.json')]
        else:
            json_files = [file_path]

        num_pi, num_pj, num_pot, num_pet = findAllTrials(json_files)
        app_logger.info(f"Number of PI: {num_pi}, Number of PJ: {num_pj}, Number of POT: {num_pot}, Number of PET: {num_pet}")
        df = JSONtoCSV(json_files, os.path.basename(file_path), num_pi, num_pj, num_pot, num_pet)
        app_logger.info(f"SOS！！！DataFrame shape: {df.shape}")
        app_logger.info(f"SOS！！！DataFrame columns: {df.columns.tolist()}")
        app_logger.info(f"SOS！！！DataFrame: {df[['Nest_X', 'Nest_Y', 'Cave_X', 'Cave_Y', 'Arch_X', 'Arch_Y']]}")
        column_groups_all_trials = get_column_groups(df, num_pi, num_pj, num_pot, num_pet)
        column_groups_average = get_summary_columns()
        cleaned_column_groups_all_trials = clean_column_groups(column_groups_all_trials, df)
        cleaned_column_groups_averages = clean_column_groups(column_groups_average, df)

        expanded_columns = expand_selected_columns(selected_columns, cleaned_column_groups_all_trials, cleaned_column_groups_averages, df, output_option)
        app_logger.info(f"Expanded columns: {expanded_columns}")
        existing_columns = list(dict.fromkeys([col for col in expanded_columns if col in df.columns]))
        app_logger.info(f"Existing columns: {existing_columns}")
        # Identify missing columns
        missing_columns = [col for col in expanded_columns if col not in df.columns]
        app_logger.info(f"Missing columns: {missing_columns}")
        
        if not existing_columns:
            app_logger.error("No valid columns selected")
            return jsonify({'error': 'None of the selected columns were found in the data'}), 400
        
        if output_option in ['all_trials', 'detailed']:
            calculate_pi_averages(df, selected_columns)
            unselected_pot = calculate_pointing_averages(df, selected_columns, num_pot)
            calculate_pet_averages(df, selected_columns)
            
            # Drop unselected averages if needed
            columns_to_drop = [f'Avg_PointingJudgement_AbsoluteError_{trial}' for trial in unselected_pot]
            app_logger.info(f"UnSelected_trials_Pointing: {columns_to_drop}")
            existing_columns = [item for item in existing_columns if item not in columns_to_drop]

            new_df = df[existing_columns]
        else:
            new_df = df[expanded_columns]
        app_logger.info(f"Final DataFrame shape: {new_df.shape}")
        app_logger.info(f"Final DataFrame columns: {new_df.columns.tolist()}")
        csv_filename = 'combined_output.csv'
        csv_path = os.path.join(download_folder, csv_filename)
        app_logger.info(f"Attempting to save CSV to: {csv_path}")
        new_df.to_csv(csv_path, index=False)
        app_logger.info(f"CSV saved to: {csv_path}")
        # Check if the file was actually created
        if not os.path.exists(csv_path):
            app_logger.error(f"Failed to create CSV file at {csv_path}")
            return jsonify({'error': 'Failed to create CSV file'}), 500

        app_logger.info(f"Attempting to send file from: {csv_path}")
        try:
            return send_from_directory(directory=download_folder, path=csv_filename, as_attachment=True, mimetype='text/csv')
        except Exception as e:
            app_logger.error(f"Failed to send file: {str(e)}")
            return jsonify({'error': 'Failed to send file'}), 500
    except Exception as e:
        app_logger.error(f'Error in process_columns: {str(e)}')
        import traceback
        app_logger.error(traceback.format_exc())
        return jsonify({'error': 'An error occurred while processing the file. Please try again.'}), 500

@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

@app.route('/download/<path:filename>')
def download_file(filename):
    return send_file(os.path.join(app.config['DOWNLOAD_FOLDER'], filename), as_attachment=True)

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=7069, debug=True)
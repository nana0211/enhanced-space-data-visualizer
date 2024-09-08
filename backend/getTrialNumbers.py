import re
import json
import pandas as pd
import zipfile

# Define the pattern for matching columns
PATTERN_PATH_INTEGRATION = r"Sessions_PathIntegration_\d+_Trials_(\d+)"
PATTERN_POINTING_TASK = r"Sessions_Egocentric_\d+_PointingTasks_(\d+)"
PATTERN_POINTING_JUDGEMENT = r"Sessions_Egocentric_\d+_PointingTasks_\d+_PointingJudgements_(\d+)"
PATTERN_PERSPECTIVE_TAKING = r"Sessions_PerspectiveTaking_\d+_Trials_(\d+)"
PATTERN_LANDMARK = r"EstimatedCoordinates_(\w+)"

# Function to flatten nested dictionaries, excluding RawData
def flatten_json(y):
    out = {}

    def flatten(x, name=''):
        if type(x) is dict:
            for a in x:
                if a == "RawData":  # Skip RawData entries
                    continue
                flatten(x[a], name + a + '_')
        elif type(x) is list:
            i = 0
            for a in x:
                flatten(a, name + str(i) + '_')
                i += 1
        else:
            out[name[:-1]] = x

    flatten(y)
    return out

def process_single_json(file_path):
    with open(file_path, 'r') as f:
        data = json.load(f)
    flat_data = flatten_json(data)
    return pd.DataFrame([flat_data])

def process_zip_file(file_path):
    with zipfile.ZipFile(file_path, 'r') as zip_ref:
        with zip_ref.open(zip_ref.namelist()[0]) as f:
            data = json.load(f)
    flat_data = flatten_json(data)
    return pd.DataFrame([flat_data])

# Process the input file based on its type
def process_input(file_path):
    if file_path.endswith('.zip'):
        print('this is a zip file')
        return process_zip_file(file_path)
    elif file_path.endswith('.json'):
        print('this is a single json file')
        return process_single_json(file_path)
    else:
        raise ValueError("Input file must be either a .zip or .json file")

# Find maximum trial count based on a pattern
def findMaximumTrial(pattern, file_path):
    df = process_single_json(file_path)
    csv_header = df.columns
    max_j = -1  # Start at -1 to handle cases where no match is found

    # Find matching columns and extract j values
    for col in csv_header:
        match = re.match(pattern, col)
        if match:
            j = int(match.group(1))
            max_j = max(max_j, j)

    if max_j == -1:
        print(f"No matching columns found for pattern: {pattern}")
        return 0  # No trials found, return 0
    else:
        return max_j + 1  # Convert max index to total count

# Find all trials based on the file path
def findAllTrials(file_path):
    max_values = {
        "num_pi": 0,
        "num_pj": 0,
        "num_pot": 0,
        "num_pet": 0
    }

    if isinstance(file_path, list) and len(file_path) > 0:
        for file in file_path:
            print("Currently processing:" + file)
            # Skip unwanted files
            if "__MACOSX" in file or file.startswith("._"):
                print(f"Skipping unwanted file: {file}")
                continue

            max_values["num_pi"] = max(max_values["num_pi"], findMaximumTrial(PATTERN_PATH_INTEGRATION, file))
            max_values["num_pj"] = max(max_values["num_pj"], findMaximumTrial(PATTERN_POINTING_JUDGEMENT, file))
            max_values["num_pot"] = max(max_values["num_pot"], findMaximumTrial(PATTERN_POINTING_TASK, file))
            max_values["num_pet"] = max(max_values["num_pet"], findMaximumTrial(PATTERN_PERSPECTIVE_TAKING, file))

    else:
        num_pi = findMaximumTrial(PATTERN_PATH_INTEGRATION, file_path[0])
        num_pj = findMaximumTrial(PATTERN_POINTING_JUDGEMENT, file_path[0])
        num_pot = findMaximumTrial(PATTERN_POINTING_TASK, file_path[0])
        num_pet = findMaximumTrial(PATTERN_PERSPECTIVE_TAKING, file_path[0])
        print("Debug: Total trials found - PI: {}, PJ: {}, POT: {}, PET: {}".format(num_pi, num_pj, num_pot, num_pet))
        return num_pi, num_pj, num_pot, num_pet

    return max_values["num_pi"], max_values["num_pj"], max_values["num_pot"], max_values["num_pet"]

def findEstimatedLandmarks(path_file):
    df = process_single_json(path_file)
    csv_headers = df.columns
    result = [re.search(PATTERN_LANDMARK, string).group(1) for string in csv_headers if re.search(PATTERN_LANDMARK, string)]
    return result

def count_pointing_judgements(df):
    csv_header = df.columns
    judgements_per_task = {}

    for col in csv_header:
        match = re.match(PATTERN_POINTING_JUDGEMENT, col)
        if match:
            task_num, judgement_num = map(int, match.groups())
            if task_num not in judgements_per_task:
                judgements_per_task[task_num] = set()
            judgements_per_task[task_num].add(judgement_num)

    return {task: len(judgements) for task, judgements in judgements_per_task.items()}
    
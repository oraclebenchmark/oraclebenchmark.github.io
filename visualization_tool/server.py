from flask import Flask, request, jsonify, render_template
import json
import os
import glob

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('editor.html')

@app.route('/problems', methods=['GET'])
def get_problems():
    # Traverse all json files, collect unique identifiers for all problems
    json_files = glob.glob('./data/*.json')
    problem_keys = []
    for path in json_files:
        filename = os.path.basename(path).replace('.json', '')
        # Skip theorems.json file
        if filename == 'theorems':
            continue
        with open(path, 'r') as f:
            data = json.load(f)
            if isinstance(data, list):
                for item in data:
                    if 'data_id' in item:
                        problem_keys.append(f"{filename}_{item['data_id']}")
    return jsonify(problem_keys)

@app.route('/problem/<problem_id>', methods=['GET'])
def get_problem(problem_id):
    # problem_id: filename_dataid
    if '_' not in problem_id:
        return jsonify({'error': 'Invalid problem_id'}), 400
    filename, data_id = problem_id.split('_', 1)
    # Skip theorems.json file
    if filename == 'theorems':
        return jsonify({'error': 'File not accessible'}), 403
    source = f'./data/{filename}.json'
    if not os.path.exists(source):
        return jsonify({'error': 'File not found'}), 404
    with open(source, 'r') as f:
        data = json.load(f)
        if not isinstance(data, list):
            return jsonify({'error': 'Data is not a list'}), 500
        for obj in data:
            if str(obj.get('data_id')) == str(data_id):
                # Field conversion
                if 'source_proof_solution' in obj:
                    obj['solution'] = obj.pop('source_proof_solution')
                obj.pop('source_proof_problem', None)
                obj['filename'] = filename
                return jsonify(obj)
        return jsonify({'error': 'Problem not found'}), 404

@app.route('/save', methods=['POST'])
def save_problem():
    # The data must contain data_id and filename
    data = request.json
    data_id = str(data.get('data_id'))
    filename = data.get('filename')
    if not filename:
        return jsonify({'error': 'No filename provided'}), 400
    # Skip theorems.json file
    if filename == 'theorems':
        return jsonify({'error': 'File not accessible'}), 403
    source = f'./data/{filename}.json'
    if not os.path.exists(source):
        return jsonify({'error': 'File not found'}), 404
    with open(source, 'r') as f:
        problems = json.load(f)
    if not isinstance(problems, list):
        return jsonify({'error': 'Data is not a list'}), 500
    found = False
    for idx, obj in enumerate(problems):
        if str(obj.get('data_id')) == data_id:
            # When saving, only keep the solution field, not source_proof_problem/source_proof_solution
            new_obj = {k: v for k, v in data.items() if k not in ['source_proof_problem', 'source_proof_solution']}
            if 'solution' in new_obj:
                new_obj['solution'] = new_obj['solution']
            problems[idx] = new_obj
            found = True
            break
    if not found:
        return jsonify({'error': 'Problem not found'}), 404
    with open(source, 'w') as f:
        json.dump(problems, f, indent=4)
    return jsonify({'message': 'Problem saved'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
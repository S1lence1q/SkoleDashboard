import json
with open('words.txt', 'r') as f:
    words = [line.strip().upper() for line in f if len(line.strip()) == 5]
with open('wordle_data.js', 'w') as f:
    f.write('window.WordleDictionary = ' + json.dumps(words) + ';')

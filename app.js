const express = require('express');
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch');
const fs = require('fs');
const https = require('https');

const words = require('./data');

const app = express();
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 450
});

app.use(limiter);

app.get('/api/download/:page', async(req, res) => {
  let { page } = req.params;

  const start = page > 1 ? (page - 1) * 500 + 1 : 0;
  const end = words.length < start + 500 ? words.length : start + 500;

  for (let i = start; i < end; i++) {
    const word = words[i];
    const path = 'https://ssl.gstatic.com/dictionary/static/pronunciation/2022-03-02/audio/' + word.substring(0, 2) + '/';
    const ukFile = word + '-uk.mp3';

    if (!fs.existsSync('audio/' + ukFile)) {
      https.get(path + word + '_en_gb_1.mp3', function(response) {
        if (response.statusCode == 404) {
          console.log(word);
        } else {
          const file = fs.createWriteStream('audio/' + ukFile);

          response.pipe(file);

          file.on("finish", () => {
            file.close();
          });
        }
      });
    }
  }

  for (let i = start; i < end; i++) {
    const word = words[i];
    const path = 'https://ssl.gstatic.com/dictionary/static/pronunciation/2022-03-02/audio/' + word.substring(0, 2) + '/';
    const usFile = word + '-us.mp3';

    if (!fs.existsSync('audio/' + usFile)) {
      https.get(path + word + '_en_us_1.mp3', function(response) {
        if (response.statusCode == 404) {
          console.log(word);
        } else {
          const file = fs.createWriteStream('audio/' + usFile);

          response.pipe(file);

          file.on("finish", () => {
            file.close();
          });
        }
      });
    }
  }

  return res.status(200);
});

app.get('/api/fetch/:page', async(req, res) => {
  let { page } = req.params;

  const start = page > 1 ? (page - 1) * 50 : 0;
  const end = words.length < start + 50 ? words.length : start + 50;

  const functions = [];
  try {
    for (let i = start; i < end; i++) {
      functions.push(fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + words[i]));
    }

    const response = await Promise.all(functions);

    let writeData = '[';

    const data = await Promise.all(response.map(async(item) => {
      const items = await item.json();

      let result = {
        word: items[0].word,
        phonetics: [],
        meanings: []
      }

      for (let i = 0; i < items.length; i++) {
        const phonetics = items[i].phonetics;
        for (let j = 0; j < phonetics.length; j++) {
          if (phonetics[j].audio != '') {
            const audio = phonetics[j].audio.split('/');
            const filename = audio[audio.length - 1];

            if (!result.phonetics.includes(filename)) {
              if (!fs.existsSync('audio/' + filename)) {
                const file = fs.createWriteStream('audio/' + filename);
    
                https.get(phonetics[i].audio, function(response) {
                  response.pipe(file);
    
                  file.on("finish", () => {
                    file.close();
                  });
                });
              }
  
              result.phonetics.push(filename);
            }
          }
        }

        const meanings = items[i].meanings;
        for (let j = 0; j < meanings.length; j++) {
          const meaning = meanings[j];
          const definitions = [];

          for (let k = 0; k < meaning.definitions.length; k++) {
            const definition = meaning.definitions[k].definition;

            if (definition != '') {
              definitions.push(meaning.definitions[k].definition);
            }
          }

          result.meanings.push({
            partOfSpeech: meaning.partOfSpeech,
            definitions
          });
        }
      }

      writeData += JSON.stringify(result) + ',';

      return result;
    }));

    writeData = writeData.slice(0, -1) + ']';

    fs.appendFileSync('words.json', writeData);

    return res.status(200).json({data});
  } catch (e) {
    console.error(e);
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
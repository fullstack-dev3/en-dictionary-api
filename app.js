const express = require('express');
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch');
const fs = require('fs');
const https = require('https');

const app = express();
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 450
});

app.use(limiter);

app.get('/api/fetch', async(req, res) => {
  try {
    const functions = [
      fetch('https://api.dictionaryapi.dev/api/v2/entries/en/apple'),
      fetch('https://api.dictionaryapi.dev/api/v2/entries/en/peach'),
      fetch('https://api.dictionaryapi.dev/api/v2/entries/en/pear')
    ];

    const response = await Promise.all(functions);

    let writeData = '[';

    const data = await Promise.all(response.map(async(item) => {
      const result = await item.json();
      const phonetics = result[0].phonetics;
      for (let i = 0; i < phonetics.length; i++) {
        const audio = phonetics[i].audio.split('/');
        const filename = audio[audio.length - 1];

        if (!fs.existsSync('audio/' + filename)) {
          const file = fs.createWriteStream('audio/' + filename);

          https.get(phonetics[i].audio, function(response) {
            response.pipe(file);

            file.on("finish", () => {
              file.close();
            });
          });
        }
      }

      writeData += JSON.stringify(result[0]) + ',';

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
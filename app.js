const readline = require('readline');
const fs = require('fs');
const http = require('http');
const exec = require('child_process').exec;

var arguments = process.argv.splice(2);
if (arguments.length <= 0) {
  console.log('Usage: node app.js ./playback.m3u8');
  return;
}

var filename = arguments[0];
var concatFilename = 'filelist.txt';
console.log('读取文件：' + filename);

var host = 'http://ojaulfft5.bkt.clouddn.com';
var urls = [];
const rl = readline.createInterface({
  input: fs.createReadStream(filename),
  output: fs.createWriteStream(concatFilename)
});

rl.on('line', (line) => {
    if (!line.startsWith('#')) {
      var dest = line.split('/').pop();
      rl.output.write(`file \'./${dest}\'\n`);
      urls.push(host + line);
    }
  })
  .on('close', () => {
    console.log('文件读取完毕。');
    synchDownload(urls);
  });

function synchDownload(urls) {
  var url = urls.pop();
  console.log(`下载：${url} 剩余${urls.length}个`);
  var dest = url.split('/').pop();
  var file = fs.createWriteStream(dest);
  var request = http.get(url, (response) => {
    response.pipe(file);
    file.on('finish', () => {
      file.close(() => {
        if (urls.length) {
          synchDownload(urls);
        } else {
          console.log('下载完毕。');
          concatFiles();
        }
      });
    });
  }).on('error', (err) => {
    console.log(`下载出错 ${url} ${err}`);
    fs.unlink(dest, () => {
      console.log('停止下载。');
    })
  });
}

function concatFiles() {
  console.log('正在合并...');
  exec(`ffmpeg -f concat -i ${concatFilename} -acodec copy -vcodec copy -absf aac_adtstoasc out.mp4`, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
    console.log('合并完成。');

    cleanFiles();
  });
}

function cleanFiles() {
  console.log('清理ts文件...');
  exec(`rm ./*.ts ${concatFilename}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }

    console.log('程序完成。');
  });
}

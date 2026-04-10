const path = require('path');
const express = require('express');

const app = express();
const projectRoot = path.join(__dirname, '..');
const distRoot = path.join(projectRoot, 'dist');
const isDevelopment = process.argv.includes('--dev');
let compiler = null;

if (isDevelopment) {
  const webpack = require('webpack');
  const webpackDevMiddleware = require('webpack-dev-middleware');
  const createWebpackConfig = require('../webpack.config.js');

  compiler = webpack(createWebpackConfig({}, {mode: 'development'}));

  app.use(webpackDevMiddleware(compiler, {
    publicPath: '/',
    writeToDisk: false,
  }));
} else {
  app.use(express.static(distRoot));
}

function sendIndexHtml(req, res) {
  if (isDevelopment && compiler) {
    const outputFileSystem = compiler.outputFileSystem;
    const indexPath = path.join(compiler.outputPath, 'index.html');

    outputFileSystem.readFile(indexPath, (error, fileBuffer) => {
      if (error) {
        res.status(500).send('Failed to load development index.html');
        return;
      }

      res.set('Content-Type', 'text/html');
      res.send(fileBuffer);
    });
    return;
  }

  res.sendFile(path.join(distRoot, 'index.html'));
}

app.get('/', sendIndexHtml);
app.get(/^\/(?!api|fonts|icons|img|js|css|sw\.js).*/, sendIndexHtml);

const PORT = 8081;

app.listen(PORT, () => {
  console.log(
      `Frontend server is running on http://localhost:${PORT} ` +
      `in ${isDevelopment ? 'development' : 'production'} mode`,
  );
});

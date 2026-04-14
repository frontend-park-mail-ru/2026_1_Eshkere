const path = require('path');
const http = require('http');
const express = require('express');

const app = express();
const projectRoot = path.join(__dirname, '..');
const distRoot = path.join(projectRoot, 'dist');
const publicRoot = path.join(projectRoot, 'public');
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

  app.use(express.static(publicRoot));
} else {
  app.use(express.static(distRoot));
}

function proxyApiRequest(req, res) {
  const target = new URL(`http://localhost:8000${req.originalUrl.replace(/^\/api/, '')}`);
  const headers = {...req.headers};
  headers.host = req.headers.host || 'localhost:8081';

  const proxyRequest = http.request(
      target,
      {
        method: req.method,
        headers,
      },
      (proxyResponse) => {
        const responseHeaders = {...proxyResponse.headers};
        delete responseHeaders['content-encoding'];
        delete responseHeaders['content-length'];

        res.writeHead(proxyResponse.statusCode || 502, responseHeaders);
        proxyResponse.pipe(res);
      },
  );

  proxyRequest.on('error', () => {
    res.status(502).json({error: 'backend unavailable'});
  });

  req.pipe(proxyRequest);
}

app.use('/api', proxyApiRequest);

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

const PORT = 8080;

app.listen(PORT, () => {
  console.log(
      `Frontend server is running on http://localhost:${PORT} ` +
      `in ${isDevelopment ? 'development' : 'production'} mode`,
  );
});

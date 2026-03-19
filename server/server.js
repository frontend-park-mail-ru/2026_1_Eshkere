const path = require('path');
const express = require('express');

const app = express();
const projectRoot = path.join(__dirname, '..');
const distRoot = path.join(projectRoot, 'dist');
const isDevelopment = process.argv.includes('--dev');

if (isDevelopment) {
  const webpack = require('webpack');
  const webpackDevMiddleware = require('webpack-dev-middleware');
  const createWebpackConfig = require('../webpack.config.js');

  const compiler = webpack(createWebpackConfig({}, {mode: 'development'}));

  app.use(webpackDevMiddleware(compiler, {
    publicPath: '/',
    writeToDisk: false,
  }));
} else {
  app.use(express.static(distRoot));
}

app.get('/', (req, res) => {
  res.sendFile(path.join(distRoot, 'index.html'));
});

const PORT = 8080;

app.listen(PORT, () => {
  console.log(
      `Frontend server is running on http://localhost:${PORT} ` +
      `in ${isDevelopment ? 'development' : 'production'} mode`,
  );
});

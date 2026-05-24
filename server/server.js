const path = require('path');
const fs = require('fs');
const http = require('http');
const http2 = require('http2');
const zlib = require('zlib');
const compression = require('compression');
const express = require('express');
const selfsigned = require('selfsigned');

const app = express();
const projectRoot = path.join(__dirname, '..');
const distRoot = path.join(projectRoot, 'dist');
const publicRoot = path.join(projectRoot, 'public');
const isDevelopment = process.argv.includes('--dev');
const forceHttp = process.argv.includes('--http') || process.env.FRONTEND_HTTP === '1';
let compiler = null;

app.use(compression());

function getCacheControl(filePath) {
  const normalizedPath = filePath.split(path.sep).join('/');

  if (
    normalizedPath.endsWith('/index.html') ||
    normalizedPath.endsWith('/sw.js') ||
    normalizedPath.endsWith('/manifest.json')
  ) {
    return 'no-cache';
  }

  if (
    normalizedPath.includes('/js/') ||
    normalizedPath.includes('/assets/') ||
    normalizedPath.includes('/css/') ||
    normalizedPath.includes('/img/') ||
    normalizedPath.includes('/icons/') ||
    normalizedPath.includes('/fonts/')
  ) {
    return 'public, max-age=31536000, immutable';
  }

  return 'public, max-age=3600';
}

function setStaticCacheHeaders(res, filePath) {
  res.setHeader('Cache-Control', getCacheControl(filePath));
}

if (isDevelopment) {
  const webpack = require('webpack');
  const webpackDevMiddleware = require('webpack-dev-middleware');
  const createWebpackConfig = require('../webpack.config.js');

  compiler = webpack(createWebpackConfig({}, {mode: 'development'}));

  app.use(webpackDevMiddleware(compiler, {
    publicPath: '/',
    writeToDisk: false,
  }));

  app.use(express.static(publicRoot, {
    setHeaders: setStaticCacheHeaders,
  }));
} else {
  app.use(express.static(distRoot, {
    setHeaders: setStaticCacheHeaders,
  }));
}

/**
 * Проксирует запрос к backend API на localhost:8000.
 * Убирает префикс /api из пути и пробрасывает заголовки и тело запроса.
 * @param {Object} req - Входящий запрос.
 * @param {Object} res - Объект ответа.
 * @return {void}
 */
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

/**
 * Проксирует публичные запросы к фиду объявлений на localhost:8000.
 * Путь передаётся как есть — /feed/{token} → http://localhost:8000/feed/{token}.
 * @param {Object} req - Входящий запрос.
 * @param {Object} res - Объект ответа.
 * @return {void}
 */
function proxyFeedRequest(req, res) {
  const target = new URL(`http://localhost:8000${req.originalUrl}`);
  const headers = {...req.headers};
  headers.host = req.headers.host || 'localhost:8081';

  const proxyRequest = http.request(
      target,
      {method: req.method, headers},
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

app.use('/feed', proxyFeedRequest);

/**
 * Проксирует публичные backend-маршруты без изменения пути.
 * Используется для статики, кликов и публичных рекламных URL.
 * @param {Object} req - Входящий запрос.
 * @param {Object} res - Объект ответа.
 * @return {void}
 */
function proxyBackendRequest(req, res) {
  const target = new URL(`http://localhost:8000${req.originalUrl}`);
  const headers = {...req.headers};
  headers.host = req.headers.host || 'localhost:8081';

  const proxyRequest = http.request(
      target,
      {method: req.method, headers},
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

app.use('/public', proxyBackendRequest);
app.use('/click', proxyBackendRequest);
app.use('/ad', proxyBackendRequest);

/**
 * Проксирует запрос к MinIO S3 на localhost:9000.
 * Убирает префикс /s3 из пути и пробрасывает метод запроса.
 * @param {Object} req - Входящий запрос.
 * @param {Object} res - Объект ответа.
 * @return {void}
 */
function proxyS3Request(req, res) {
  const target = new URL(`http://localhost:9000${req.originalUrl.replace(/^\/s3/, '')}`);
  const proxyRequest = http.request(
      target,
      { method: req.method, headers: { host: 'localhost:9000' } },
      (proxyResponse) => {
        res.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers);
        proxyResponse.pipe(res);
      },
  );
  proxyRequest.on('error', () => res.status(502).end());
  req.pipe(proxyRequest);
}

app.use('/s3', proxyS3Request);

/**
 * Отдаёт index.html для SPA-роутинга.
 * В режиме разработки читает файл из памяти webpack, в продакшне — с диска.
 * @param {Object} req - Входящий запрос.
 * @param {Object} res - Объект ответа.
 * @return {void}
 */
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
app.get(/^\/(?!api|s3|assets|fonts|icons|img|js|css|sw\.js|manifest\.json).*/, sendIndexHtml);

const PORT = Number(process.env.PORT || 8080);
const BACKEND_ORIGIN = 'http://localhost:8000';
const S3_ORIGIN = 'http://localhost:9000';
const STATIC_REQUEST_PREFIXES = [
  '/assets/',
  '/css/',
  '/fonts/',
  '/icons/',
  '/img/',
  '/js/',
  '/manifest.json',
  '/sdk.js',
  '/sw.js',
];
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.gif': 'image/gif',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
  };

  return contentTypes[extension] || 'application/octet-stream';
}

function isCompressibleContent(contentType) {
  return (
    contentType.startsWith('text/') ||
    contentType.includes('javascript') ||
    contentType.includes('json') ||
    contentType.includes('svg')
  );
}

function canUseGzip(headers, contentType, body) {
  const acceptEncoding = String(headers['accept-encoding'] || '');
  return (
    body.length >= 1024 &&
    acceptEncoding.includes('gzip') &&
    isCompressibleContent(contentType)
  );
}

function getSafeFilePath(root, requestPath) {
  let decodedPath;

  try {
    decodedPath = decodeURIComponent(requestPath);
  } catch {
    return null;
  }

  const safePath = path
      .normalize(decodedPath)
      .replace(/^(\.\.[/\\])+/, '')
      .replace(/^[/\\]+/, '');
  const filePath = path.resolve(root, safePath);
  const normalizedRoot = path.resolve(root);

  if (filePath !== normalizedRoot && !filePath.startsWith(`${normalizedRoot}${path.sep}`)) {
    return null;
  }

  return filePath;
}

function readCompilerAsset(requestPath) {
  if (!isDevelopment || !compiler) {
    return Promise.resolve(null);
  }

  const assetPath = requestPath === '/' ? '/index.html' : requestPath;
  const filePath = path.join(compiler.outputPath, assetPath.replace(/^[/\\]+/, ''));

  return new Promise((resolve) => {
    compiler.outputFileSystem.readFile(filePath, (error, fileBuffer) => {
      resolve(error ? null : { filePath, body: fileBuffer });
    });
  });
}

async function readDiskAsset(requestPath) {
  const root = isDevelopment ? publicRoot : distRoot;
  const filePath = getSafeFilePath(root, requestPath);

  if (!filePath) {
    return null;
  }

  try {
    const stat = await fs.promises.stat(filePath);

    if (!stat.isFile()) {
      return null;
    }

    return {
      filePath,
      body: await fs.promises.readFile(filePath),
    };
  } catch {
    return null;
  }
}

async function readHttp2Asset(pathname) {
  const assetPath = pathname === '/' ? '/index.html' : pathname;
  const compilerAsset = await readCompilerAsset(assetPath);

  if (compilerAsset) {
    return compilerAsset;
  }

  return readDiskAsset(assetPath);
}

function isStaticRequest(pathname) {
  return STATIC_REQUEST_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function getProxyTarget(pathWithQuery, pathname) {
  if (pathname.startsWith('/api')) {
    return new URL(`${BACKEND_ORIGIN}${pathWithQuery.replace(/^\/api/, '') || '/'}`);
  }

  if (
    pathname.startsWith('/feed') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/click') ||
    pathname.startsWith('/ad')
  ) {
    return new URL(`${BACKEND_ORIGIN}${pathWithQuery}`);
  }

  if (pathname.startsWith('/s3')) {
    return new URL(`${S3_ORIGIN}${pathWithQuery.replace(/^\/s3/, '') || '/'}`);
  }

  return null;
}

function getHttp2RequestHeaders(headers, target) {
  const requestHeaders = {};

  Object.entries(headers).forEach(([name, value]) => {
    if (!name.startsWith(':') && !HOP_BY_HOP_HEADERS.has(name)) {
      requestHeaders[name] = value;
    }
  });

  requestHeaders.host = target.host;
  return requestHeaders;
}

function getHttp2ResponseHeaders(proxyResponse) {
  const responseHeaders = {
    ':status': proxyResponse.statusCode || 502,
  };

  Object.entries(proxyResponse.headers).forEach(([name, value]) => {
    if (!HOP_BY_HOP_HEADERS.has(name) && value !== undefined) {
      responseHeaders[name] = value;
    }
  });

  return responseHeaders;
}

function respondHttp2Error(stream, status, message) {
  if (stream.destroyed || stream.closed) {
    return;
  }

  stream.respond({
    ':status': status,
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-cache',
  });
  stream.end(JSON.stringify({ error: message }));
}

function proxyHttp2Request(stream, headers, target) {
  const proxyRequest = http.request(
      target,
      {
        method: headers[':method'] || 'GET',
        headers: getHttp2RequestHeaders(headers, target),
      },
      (proxyResponse) => {
        stream.respond(getHttp2ResponseHeaders(proxyResponse));
        proxyResponse.pipe(stream);
      },
  );

  proxyRequest.on('error', () => {
    respondHttp2Error(stream, 502, 'backend unavailable');
  });

  stream.on('data', (chunk) => {
    proxyRequest.write(chunk);
  });
  stream.on('end', () => {
    proxyRequest.end();
  });
  stream.on('error', () => {
    proxyRequest.destroy();
  });
}

async function serveHttp2Asset(stream, headers, asset) {
  const contentType = getContentType(asset.filePath);
  const shouldGzip = canUseGzip(headers, contentType, asset.body);
  const body = shouldGzip ? zlib.gzipSync(asset.body) : asset.body;
  const responseHeaders = {
    ':status': 200,
    'content-type': contentType,
    'cache-control': getCacheControl(asset.filePath),
    'content-length': body.length,
    vary: 'Accept-Encoding',
  };

  if (shouldGzip) {
    responseHeaders['content-encoding'] = 'gzip';
  }

  stream.respond(responseHeaders);

  if (headers[':method'] === 'HEAD') {
    stream.end();
    return;
  }

  stream.end(body);
}

async function handleHttp2Stream(stream, headers) {
  const pathWithQuery = headers[':path'] || '/';
  const method = headers[':method'] || 'GET';
  const requestUrl = new URL(pathWithQuery, 'https://localhost');
  const pathname = requestUrl.pathname;
  const proxyTarget = getProxyTarget(pathWithQuery, pathname);

  if (proxyTarget) {
    proxyHttp2Request(stream, headers, proxyTarget);
    return;
  }

  if (method !== 'GET' && method !== 'HEAD') {
    respondHttp2Error(stream, 405, 'method not allowed');
    return;
  }

  const asset = await readHttp2Asset(pathname);

  if (asset) {
    await serveHttp2Asset(stream, headers, asset);
    return;
  }

  if (isStaticRequest(pathname)) {
    respondHttp2Error(stream, 404, 'not found');
    return;
  }

  const indexAsset = await readHttp2Asset('/index.html');

  if (indexAsset) {
    await serveHttp2Asset(stream, headers, indexAsset);
    return;
  }

  respondHttp2Error(stream, 404, 'not found');
}

function resolveMaybeRelative(filePath) {
  return path.isAbsolute(filePath)
    ? filePath
    : path.resolve(projectRoot, filePath);
}

function getConfiguredTlsCredentials() {
  const keyFile = process.env.HTTPS_KEY_FILE || process.env.FRONTEND_HTTPS_KEY_FILE;
  const certFile = process.env.HTTPS_CERT_FILE || process.env.FRONTEND_HTTPS_CERT_FILE;

  if (!keyFile || !certFile) {
    return null;
  }

  return {
    key: fs.readFileSync(resolveMaybeRelative(keyFile)),
    cert: fs.readFileSync(resolveMaybeRelative(certFile)),
  };
}

async function createLocalhostTlsCredentials() {
  const certDir = path.join(__dirname, 'certs');
  const keyPath = path.join(certDir, 'localhost-key.pem');
  const certPath = path.join(certDir, 'localhost-cert.pem');

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
  }

  const attrs = [{ name: 'commonName', value: 'localhost' }];
  const pems = await selfsigned.generate(attrs, {
    days: 365,
    keySize: 2048,
    algorithm: 'sha256',
    extensions: [
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },
          { type: 7, ip: '127.0.0.1' },
          { type: 7, ip: '::1' },
        ],
      },
    ],
  });

  fs.mkdirSync(certDir, { recursive: true });
  fs.writeFileSync(keyPath, pems.private, { mode: 0o600 });
  fs.writeFileSync(certPath, pems.cert);

  return {
    key: pems.private,
    cert: pems.cert,
  };
}

async function getTlsCredentials() {
  return getConfiguredTlsCredentials() || await createLocalhostTlsCredentials();
}

async function startServer() {
  if (forceHttp) {
    http.createServer(app).listen(PORT, () => {
      console.log(
          `Frontend server is running on http://localhost:${PORT} ` +
          `in ${isDevelopment ? 'development' : 'production'} mode`,
      );
    });
    return;
  }

  const server = http2.createSecureServer({
    ...await getTlsCredentials(),
    allowHTTP1: true,
  });

  server.on('stream', (stream, headers) => {
    handleHttp2Stream(stream, headers).catch(() => {
      respondHttp2Error(stream, 500, 'frontend server error');
    });
  });

  server.on('request', (req, res) => {
    if (req.httpVersionMajor >= 2) {
      return;
    }

    app(req, res);
  });

  server.listen(PORT, () => {
    console.log(
        `Frontend server is running on https://localhost:${PORT} ` +
        `with HTTP/2 in ${isDevelopment ? 'development' : 'production'} mode`,
    );
  });
}

startServer().catch((error) => {
  console.error('Failed to start frontend server:', error);
  process.exit(1);
});

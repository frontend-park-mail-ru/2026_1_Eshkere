const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv = {}) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    entry: path.resolve(__dirname, 'src/index.js'),
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? 'js/[name].[contenthash:8].js' : 'js/[name].js',
      assetModuleFilename: 'assets/[name][ext]',
      clean: true,
      publicPath: '/',
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    module: {
      rules: [
        {
          test: /\.js$/i,
          exclude: /node_modules/,
          use: 'babel-loader',
        },
        {
          test: /\.(sa|sc|c)ss$/i,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                url: {
                  filter: (url) => !url.startsWith('/img/') && !url.startsWith('/fonts/'),
                },
              },
            },
            'sass-loader',
          ],
        },
        {
          test: /\.hbs$/i,
          loader: 'handlebars-loader',
        },
        {
          test: /\.(png|jpe?g|gif|svg|webp)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/[name][ext]',
          },
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'public/index.html'),
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'public'),
            to: path.resolve(__dirname, 'dist'),
            noErrorOnMissing: true,
            globOptions: {
              ignore: ['**/index.html'],
            },
          },
        ],
      }),
    ],
    resolve: {
      roots: [
        path.resolve(__dirname, 'public'),
        path.resolve(__dirname, 'src'),
        path.resolve(__dirname),
      ],
      modules: [
        path.resolve(__dirname, 'src'),
      ],
      extensions: ['.js', '.scss', '.css'],
    },
  };
};
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv = {}) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    entry: path.resolve(__dirname, 'src/index.ts'),
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? 'js/[name].[contenthash:8].js' : 'js/[name].js',
      assetModuleFilename: 'assets/[name][ext]',
      clean: true,
      publicPath: '/',
    },
    optimization: isProduction
      ? {
          runtimeChunk: 'single',
          minimizer: [
            '...',
            new CssMinimizerPlugin(),
          ],
          splitChunks: {
            chunks: 'all',
          },
        }
      : undefined,
    devtool: isProduction ? 'hidden-source-map' : 'eval-source-map',
    module: {
      rules: [
        {
          test: /\.(js|ts)$/i,
          exclude: /node_modules/,
          use: 'babel-loader',
        },
        {
          test: /\.(sa|sc|c)ss$/i,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            {
              loader: 'css-loader',
              options: {
                sourceMap: !isProduction,
                url: {
                  filter: (url) => !url.startsWith('/img/') && !url.startsWith('/fonts/'),
                },
              },
            },
            {
              loader: 'sass-loader',
              options: {
                sourceMap: !isProduction,
              },
            },
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
      ...(isProduction
        ? [
            new MiniCssExtractPlugin({
              filename: 'css/[name].[contenthash:8].css',
              chunkFilename: 'css/[name].[contenthash:8].css',
            }),
          ]
        : []),
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
      extensions: ['.ts','.js', '.scss', '.css'],
    },
  };
};

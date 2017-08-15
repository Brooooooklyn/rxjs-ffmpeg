const { resolve } = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const { reduce } = require('lodash')

function getDir (path) {
  return resolve(process.cwd(), 'demo', path)
}

module.exports = {
  output: {
    filename: '[name].[hash].js',

    path: resolve(process.cwd(), 'dist'),

    chunkFilename: '[name].[hash].chunk.js',

    publicPath: '/'
  },

  entry: [
    'react-hot-loader/patch',
    'webpack-dev-server/client?http://localhost:3002',
    'webpack/hot/only-dev-server',
    './demo/index.tsx'
  ],

  module: {
    rules: [
      {
        test: /\.(ts|js|jsx|tsx)$/,
        loaders: [
          'react-hot-loader/webpack',
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              happyPackMode: true
            }
          }
        ],
        exclude: /node_modules/
      },
      {
        test: /\.js$/,
        loaders: [ 'source-map-loader' ],
        enforce: 'pre'
      },
      {
        test: /\.(svg|cur)$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 8192
            }
          }
        ]
      },
      {
        test: /\.(jpg|jpeg|png)$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 8192
            }
          }
        ]
      },
      {
        test: /\.(eot|svg|ttf|woff|woff2)$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 8192
            }
          }
        ]
      }
    ],
  },

  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx', '.less'],
    alias: {
      components: getDir('components'),
      store: getDir('store')
    }
  },

  node: {
    process: true
  },

  devtool: 'cheap-module-source-map',

  devServer: {
    hot: true,
    contentBase: resolve(process.cwd(), 'dist'),
    publicPath: '/',
    port: 3002,
    disableHostCheck: true
  },

  plugins: [
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './index.html',
      inject: true
    }),

    new webpack.HotModuleReplacementPlugin(),

    new ForkTsCheckerWebpackPlugin(),

    new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, /en/)
  ],
}

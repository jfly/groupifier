const webpack = require('webpack');
const path = require('path');

const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const sourcePath = path.resolve(__dirname, 'src');
const destinationPath = path.resolve(__dirname, 'build');

const production = process.env.NODE_ENV === 'production';

let config = {
  context: sourcePath,
  entry: './main.js',
  output: {
    path: destinationPath,
    filename: production ? '[name].[hash].js' : '[name].bundle.js'
  },
  resolve: {
    modules: [sourcePath, 'node_modules'],
    extensions: ['.js']
  },
  module: {
    rules: [{
      test: /\.js$/,
      use: ['babel-loader?presets[]=es2015'],
      exclude: /node_modules/
    }]
  },
  plugins: [
    new CleanWebpackPlugin(destinationPath),
    new HtmlWebpackPlugin({
      template: '../index.ejs',
      inject: 'body',
      base: production ? '/groupifier/' : '/' /* Repository path for GitHub pages. */
    })
  ],
  devServer: {
    contentBase: destinationPath
  }
};

if(production) {
  config.plugins.push(
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.UglifyJsPlugin({
      mangle: true,
      compress: {
        warnings: false
      }
    })
  );
}

if(!production) {
  config.devtool = 'eval';
}

module.exports = config;

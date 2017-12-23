const webpack = require('webpack');
const path = require('path');

const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');

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
    }, {
      test: /\.css$/,
      use: ExtractTextPlugin.extract({
        fallback: 'style-loader',
        use: 'css-loader'
      })
    }]
  },
  plugins: [
    new CleanWebpackPlugin(destinationPath),
    new HtmlWebpackPlugin({
      template: '../index.ejs',
      inject: 'body',
      base: production ? '/groupifier/' : '/' /* Repository path for GitHub pages. */
    }),
    new ExtractTextPlugin({ filename: '[name].[hash].css', disable: !production }),
    new webpack.DefinePlugin({
      WCA_ORIGIN_URL: JSON.stringify(production ? 'https://www.worldcubeassociation.org' : 'https://staging.worldcubeassociation.org'),
      WCA_OAUTH_CLIENT_ID: JSON.stringify(production ? 'd965f9184bbcf9dfade91e2327c05e2aedef7cd7b6c01c1de7e3e23d62530e5a' : 'example-application-id')
    })
  ],
  devServer: {
    contentBase: destinationPath
  }
};

if(production) {
  config.plugins.push(
    new webpack.optimize.UglifyJsPlugin({
      mangle: true,
      compress: {
        warnings: false
      }
    }),
    new FaviconsWebpackPlugin('../assets/favicon.svg')
  );
}

if(!production) {
  config.devtool = 'eval';
}

module.exports = config;

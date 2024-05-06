import path from "node:path";
import URL from "node:url";

const __filename = URL.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: {
    example1: './examples/example1.ts',
    test1: './examples/test1.ts',
    example2: './examples/example2.ts',
    "array-mesh": './examples/array-mesh.ts',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'public', 'js')
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.(wg|gl)sl$/,
        use: 'raw-loader'
      },
      {
        test: /\.obj$/,
        use: 'raw-loader'
      }
    ]
  },
  devtool: 'source-map',
  mode: "development",
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src/')
    }
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 9000
  }
};
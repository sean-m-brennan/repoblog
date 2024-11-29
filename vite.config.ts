import {defineConfig, PluginOption} from 'vite'
import react from '@vitejs/plugin-react-swc'
// @ts-expect-error 'types could not be resolved when respecting package.json "exports"'
import eslint from 'vite-plugin-eslint'
import dts from 'vite-plugin-dts'
import {resolve} from "path"
import * as fs from "node:fs"
import {glob} from "glob";

const plugins: PluginOption[] = [
  dts({
    rollupTypes: true,
    outDir: 'dist',
    tsconfigPath: './tsconfig.app.json',
  }),
  react()
]
// vite-plugin-eslint is incompatible with turbo
if (process.env.TURBO_HASH === undefined && !fs.existsSync('.turbo')) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-call
  plugins.push(eslint())
}

const sources = glob.sync('./**/*.{ts,tsx,css}', {
    ignore: ["./**/*.d.ts", "./**/*.config.ts", "./public/**/*"],
})

// https://vitejs.dev/config/
export default defineConfig({
  plugins: plugins,
  root: resolve(__dirname),
  base: "/repoblog/",
  build: {
    sourcemap: true,
    minify: false,
    lib: {
      entry: sources,
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        'react', 'react/jsx-runtime',
        'primereact', 'primeicons',
      ],
    },
  },
})

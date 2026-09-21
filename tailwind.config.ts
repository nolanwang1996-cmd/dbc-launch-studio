import type { Config } from 'tailwindcss'

const config: Config = {
    content: [
        './app/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './lib/**/*.{ts,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                ink: {
                    950: '#07090d',
                    900: '#0b0e14',
                    850: '#0f131c',
                    800: '#141926',
                    700: '#1d2434',
                    600: '#2a3347',
                },
                accent: {
                    DEFAULT: '#5eead4',
                    dim: '#2dd4bf',
                },
                violet2: '#a78bfa',
                amber2: '#fbbf24',
            },
            fontFamily: {
                mono: [
                    'ui-monospace',
                    'SFMono-Regular',
                    'Menlo',
                    'Monaco',
                    'Consolas',
                    'monospace',
                ],
            },
        },
    },
    plugins: [],
}
export default config

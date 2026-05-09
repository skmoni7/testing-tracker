import type { Config } from 'tailwindcss'

const config: Config = {
  // Enable dark mode via class on <html> element
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Custom brand color
        brand: '#6366f1',
      },
    },
  },
  plugins: [],
}

export default config

import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import prettier from 'eslint-config-prettier';

/** @type {import('eslint').Linter.Config[]} */
export default [
	js.configs.recommended,
	{
		files: ['**/*.{js,ts,svelte}'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: 2022,
				sourceType: 'module',
				extraFileExtensions: ['.svelte']
			},
			globals: {
				console: 'readonly',
				process: 'readonly',
				// Browser globals for tests
				Request: 'readonly',
				Response: 'readonly',
				URL: 'readonly',
				URLSearchParams: 'readonly',
				fetch: 'readonly',
				FormData: 'readonly',
				setInterval: 'readonly',
				clearInterval: 'readonly',
				setTimeout: 'readonly',
				clearTimeout: 'readonly',
				Event: 'readonly',
				confirm: 'readonly',
				window: 'readonly',
				HTMLDivElement: 'readonly',
				HTMLSelectElement: 'readonly',
				HTMLInputElement: 'readonly',
				// SvelteKit App namespace
				App: 'readonly'
			}
		},
		plugins: {
			'@typescript-eslint': ts
		},
		rules: {
			...ts.configs.recommended.rules,
			// Enforce strict TypeScript
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
			],
			// Security rules
			'no-eval': 'error',
			'no-implied-eval': 'error',
			'no-new-func': 'error',
			// Code quality
			'no-console': 'warn',
			'no-debugger': 'error',
			'no-unreachable': 'error',
			'consistent-return': 'error'
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tsParser,
				svelteFeatures: {
					experimentalGenerics: true
				}
			}
		},
		plugins: {
			svelte
		},
		rules: {
			...svelte.configs.recommended.rules,
			'svelte/no-at-html-tags': 'error'
		}
	},
	prettier,
	{
		// Test files configuration
		files: ['**/*.test.{js,ts}', '**/*.spec.{js,ts}'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off', // Allow any in test files for mocking
			'no-undef': 'off' // Vitest provides globals
		}
	},
	{
		// Node.js scripts configuration
		files: ['scripts/**/*.js'],
		languageOptions: {
			globals: {
				console: 'readonly',
				process: 'readonly',
				Buffer: 'readonly',
				__dirname: 'readonly',
				__filename: 'readonly'
			}
		},
		rules: {
			'no-console': 'off' // Allow console in scripts
		}
	},
	{
		ignores: [
			'.svelte-kit/**',
			'build/**',
			'dist/**',
			'node_modules/**',
			'**/*.config.js',
			'**/*.config.ts'
		]
	}
];

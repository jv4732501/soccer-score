# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SoccerScore — a soccer/football match scorer, sibling to `basketball-score` but built with React + Vite + TypeScript instead of a zero-build vanilla-JS stack. Client-side only: `localStorage` persistence, no backend, hosted on GitHub Pages via a GitHub Actions build+deploy workflow.

## Commands

- **Dev server:** `npm run dev`
- **Build:** `npm run build` (type-checks via `tsc -b`, then `vite build` to `dist/`)
- **Preview a production build:** `npm run preview`
- **Unit/logic tests (Vitest):** `npm run test` (single run) / `npm run test:watch` (watch mode)
- **Visual/E2E tests (Playwright):** `npm run test:e2e` (requires `npm run build` first so `preview` serves the current build; the config's `webServer` starts `preview` automatically)
- **Format:** `npm run format` / check only: `npm run format:check`

## Architecture

See `docs/superpowers/specs/2026-07-18-soccerscore-design.md` for the full design. In brief: a framework-free, unit-tested pure-logic layer under `src/logic/` (state transitions return new objects rather than mutating), consumed by a `useMatch` hook (`useReducer` + `localStorage` persistence), rendered by React components under `src/components/`.

## Workflow

Design/implementation history is tracked under `docs/superpowers/specs/` and `docs/superpowers/plans/`. This project follows TDD for logic-layer work: write the failing Vitest test before the implementation.

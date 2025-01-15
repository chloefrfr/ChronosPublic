@echo off
if not exist node_modules (call bun install)
bun run src/index.ts
pause
const { spawn } = require('child_process');
const path = require('path');

const backendDir = path.join(__dirname, 'backend');
const frontendDir = path.join(__dirname, 'frontend');

console.log('\x1b[36m%s\x1b[0m', '🚀 Starting Nuclear Oncology System...\n');

// Start Backend
const backend = spawn('node', ['src/index.js'], {
  cwd: backendDir,
  stdio: 'pipe',
  shell: true,
  env: { ...process.env }
});

backend.stdout.on('data', (data) => {
  process.stdout.write(`\x1b[32m[Backend]\x1b[0m ${data}`);
});
backend.stderr.on('data', (data) => {
  process.stderr.write(`\x1b[31m[Backend ERROR]\x1b[0m ${data}`);
});
backend.on('close', (code) => {
  console.log(`\x1b[31m[Backend] exited with code ${code}\x1b[0m`);
});

// Start Frontend after a short delay
setTimeout(() => {
  const frontend = spawn('npx', ['vite', '--host'], {
    cwd: frontendDir,
    stdio: 'pipe',
    shell: true,
    env: { ...process.env }
  });

  frontend.stdout.on('data', (data) => {
    process.stdout.write(`\x1b[35m[Frontend]\x1b[0m ${data}`);
  });
  frontend.stderr.on('data', (data) => {
    process.stderr.write(`\x1b[31m[Frontend ERROR]\x1b[0m ${data}`);
  });
  frontend.on('close', (code) => {
    console.log(`\x1b[31m[Frontend] exited with code ${code}\x1b[0m`);
  });

  process.on('SIGINT', () => {
    console.log('\n\x1b[33mShutting down...\x1b[0m');
    backend.kill();
    frontend.kill();
    process.exit();
  });
}, 1500);

console.log('\x1b[36m%s\x1b[0m', '⏳ Backend starting on port 5000...');
console.log('\x1b[36m%s\x1b[0m', '⏳ Frontend starting on port 5173...\n');

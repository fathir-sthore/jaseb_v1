// Entry point untuk development (jalan lokal)
const { startBot } = require('./botresming');

console.log('Starting bot in development mode...');
startBot().then(() => {
  console.log('Bot development started successfully!');
}).catch(error => {
  console.error('Failed to start bot:', error);
  process.exit(1);
});

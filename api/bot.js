const { bot, startBot } = require('../botresming');

// Inisialisasi bot saat pertama kali
let botStarted = false;

module.exports = async (req, res) => {
  // Start bot jika belum dimulai
  if (!botStarted) {
    try {
      await startBot();
      botStarted = true;
      console.log('Bot started via API endpoint');
    } catch (error) {
      console.error('Failed to start bot:', error);
    }
  }

  // Handle webhook update
  if (req.method === 'POST') {
    try {
      await bot.handleUpdate(req.body, res);
    } catch (error) {
      console.error('Error handling update:', error);
      res.status(200).send('OK');
    }
  } else {
    // GET request untuk testing
    res.status(200).json({
      status: 'Bot Telegram API is running',
      timestamp: new Date().toISOString(),
      bot: bot ? 'Active' : 'Not started'
    });
  }
};

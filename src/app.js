import BotController from './BotController/index.js';

const startApp = () => {
  const configsPath = process.argv[2];
  if (!configsPath) {
    throw new Error('Configs path is not specified');
  }

  new BotController(configsPath);

  console.log('Bot started'); 
};

export default startApp;
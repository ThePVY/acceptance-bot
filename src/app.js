import BotController from './BotController/index.js';

const startApp = async () => {
  const configsPath = process.argv[2];
  if (!configsPath) {
    throw new Error('Configs path is not specified');
  }

  await BotController.factory(configsPath);

  console.log('Bot started'); 
};

export default startApp;
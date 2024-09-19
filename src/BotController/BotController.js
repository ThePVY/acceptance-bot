import path from 'node:path';
import TelegramBot from 'node-telegram-bot-api';

import { ChatConfiguration, MainConfiguration } from '../modules/Configuration/index.js';
import ChatHandler from '../modules/ChatHandler/index.js';
import { SuppliesApiController } from '../modules/controllers/index.js';
import { SuppliesApiService } from '../modules/services/index.js';
import commands from './commands.js';

class BotController {
  chatHandlers = {};
  configurationsPath;
  configuration;

  constructor(configurationsPath) {
    this.configurationsPath = configurationsPath;
    this.configuration = new MainConfiguration(path.resolve(configurationsPath, 'acceptance-bot.config.json'));

    this.bot = new TelegramBot(this.configuration.botToken, {
      polling: {
        interval: this.configuration.botPollingInterval,
        autoStart: true,
      }
    });

    this.bot.setMyCommands(commands);

    this.bot.on('text', async (message) => {
      try {
        await this.handle(message);
      } catch (error) {
        console.error(error);
      }
    });
  }

  async handle(message) {
    const { text } = message;

    if (this.checkIsForbidden(message)) {
      return this.handleForbidden(message);
    }

    if (text.startsWith('/start')) {
      await this.createHandlerIfNeeded(message);
    }

    await this.handleMessage(message);

    if (text.startsWith('/clear')) {
      await this.deleteHandlerIfNeeded(message);
    }
  }

  createChatHandler(chatID) {
    const chatConfiguration = new ChatConfiguration(
      path.resolve(this.configurationsPath, `${chatID}.config.json`),
    );
    const apiController = new SuppliesApiController(
      new SuppliesApiService(),
      this.configuration,
      chatConfiguration,
    );
    const chatHandler = new ChatHandler(
      this.bot,
      chatID,
      apiController,
      chatConfiguration,
    );

    return chatHandler;
  }

  checkIsForbidden({ from: { username } }) {
    return !this.configuration.botWhitelist.includes(username)
  }

  async handleForbidden({ chat: { id } }) {
    return this.bot.sendMessage(id, 'Доступ запрещен');
  }

  async createHandlerIfNeeded({ chat: { id } }) {
    this.chatHandlers[id] = this.chatHandlers[id] || this.createChatHandler(id);
  }

  async deleteHandlerIfNeeded({ chat: { id } }) {
    if (!this.chatHandlers[id]) {
      return;
    }
    delete this.chatHandlers[id];

    return this.bot.sendMessage(id, 'Состояние сброшено');
  }

  async handleMessage(message) {
    const { chat: { id } } = message;
    if (!this.chatHandlers[id]) {
      return this.bot.sendMessage(id, 'Бот не запущен. Воспользуйтесь командой /start');
    }

    return this.chatHandlers[id].handleMessage(message);
  }
}

export default BotController;


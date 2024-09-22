import { handleSetConfiguration } from './utils.js';

class ChatHandler {
  bot;
  chatId;
  apiController;
  chatConfiguration;
  // null | 'ready' | 'tracking'
  _stateStep = null;
  // null | 'token' | 'warehouses' | 'coefficient' | 'preorderid' | 'reportmode' | 'timezone'
  configurationStep = null;
  configurationState = {
    token: false,
    warehouses: false,
    coefficient: false,
    preorderid: false,
    reportmode: false,
    timezone: false,
  }
  reportMessage;
  reportTimeMessage;

  constructor(bot, chatId, apiController, chatConfiguration) {
    this.bot = bot;
    this.chatId = chatId;
    this.apiController = apiController;
    this.chatConfiguration = chatConfiguration;
    this._stateStep = chatConfiguration.stateStep;
    this.configurationState = {
      token: !!chatConfiguration.token,
      warehouses: !!chatConfiguration.warehouses,
      coefficient: !!chatConfiguration.coefficient,
      preorderid: !!chatConfiguration.preorderid,
      reportmode: !!chatConfiguration.reportmode,
      timezone: !!chatConfiguration.timezone,
    }

    apiController.subscribeOnTick(this.trackingTickHandler.bind(this));
  }

  get isInitialized() {
    const { token, warehouses, coefficient } = this.configurationState;
    return token && warehouses && coefficient;
  }

  get toGetReadyMessage() {
    return `Вам необходимо предоставить:
${!this.configurationState.token ? '- токен для доступа к API Wildberries (команда /token)' : ''}
${!this.configurationState.warehouses ? '- имена складов для отслеживания (команда /warehouses)' : ''}
${!this.configurationState.coefficient ? '- максимальный коэффициент (команда /coefficient)' : ''}
`;
  }

  get stateStep() {
    return this._stateStep;
  }

  async setStateStep(step) {
    this._stateStep = step;
    await this.chatConfiguration.setProperty('stateStep', step);
  }

  async handleMessage(message) {
    const { text } = message;

    if (text.startsWith('/')) {
      return this.handleCommand(message);
    }

    await this.handleText(message);
  }

  async handleCommand(message) {
    const { text } = message;

    if (this.checkIsCommandForbidden(text)) {
      return this.handleForbiddenCommand(message);
    }

    if (text.startsWith('/start')) {
      return this.handleStart(message);
    }

    if (text.startsWith('/clear')) {
      return this.handleClear(message);
    }

    if (text.startsWith('/status')) {
      return this.handleStatus(message);
    }

    if (text.startsWith('/track')) {
      return this.handleTrack(message);
    }

    if (text.startsWith('/stop')) {
      return this.handleStop(message);
    }

    if (this.checkIsConfigurationCommand(text)) {
      return this.handleSetConfiguration(message);
    }
  }

  checkIsConfigurationCommand(text) {
    return Object.keys(this.configurationState).some(key => text.startsWith(`/${key}`));
  }

  checkIsCommandForbidden(text) {
    return this.stateStep === 'tracking' && !text.startsWith('/stop') && !text.startsWith('/status') && !text.startsWith('/clear');
  }

  async handleForbiddenCommand({ chat }) {
    return this.bot.sendMessage(chat.id, 'Во время отслеживания разрешены команды /stop, /clear, /status.');
  }

  async handleStart({ chat }) {
    await this.bot.sendMessage(chat.id, 'Бот запущен.');
    if (this.configurationState.token) {
      await this.bot.sendMessage(chat.id, 'Токен обнаружен');
    }
    if (this.configurationState.warehouses) {
      await this.bot.sendMessage(chat.id, `Список складов для отслеживания обнаружен: ${this.chatConfiguration.warehouses}`);
    }
    if (this.configurationState.coefficient) {
      await this.bot.sendMessage(chat.id, `Максимальный коэффициент обнаружен: ${this.chatConfiguration.coefficient}`);
    }

    if (this.isInitialized) {
      await this.bot.sendMessage(chat.id, 'Инициализация произведена. Вы можете воспользоваться командой /track для начала отслеживания выбранных складов. Для сброса настроек воспользуйтесь командой /clear.');

      return this.setStateStep('ready');
    }

    await this.bot.sendMessage(chat.id, this.toGetReadyMessage);
  }

  async handleClear({ chat }) {
    this.apiController.unsubscribeOnTick();
    if (this.stateStep === 'tracking') {
      await this.handleStop({ chat });
    }
    await this.chatConfiguration.deleteConfig();
    await this.setStateStep(null);
    return this.bot.sendMessage(chat.id, 'Состояние сброшено. Необходимо ввести команду /start заново и следовать инструкциям.');
  }

  async handleStatus({ chat }) {
    const { warehouses, coefficient, preorderid, reportmode, timezone } = this.chatConfiguration;
    await this.bot.sendMessage(chat.id, `Текущий статус: ${this.stateStep}

Текущая конфигурация:
токен: ${this.configurationState.token ? 'задан' : 'не задан, воспользуйтесь командой /token'}
склады: ${warehouses}
максимальный коэффициент: ${coefficient}
ID предзаказа: ${preorderid}
удалять ли старый отчет: ${reportmode}
часовой пояс: ${timezone}
`);
  }

  async handleSetConfiguration({ chat, text }) {
    const step = text.slice(1);
    const messageText = handleSetConfiguration.getMessageText(step);
    const options = handleSetConfiguration.getOptions(step);

    await this.bot.sendMessage(chat.id, messageText, options);
    this.configurationStep = step;
  }

  async handleTrack({ chat }) {
    if (!this.isInitialized) {
      await this.bot.sendMessage(chat.id, 'Невозможно начать отслеживание. Воспользуйтесь командой /start');

      return;
    }
    await this.apiController.startTracking();
    await this.bot.sendMessage(chat.id, `Отслеживание ${this.chatConfiguration.warehouses} начато.`);
    this.setStateStep('tracking');
  }

  async resumeTracking() {
    await this.apiController.startTracking();
    await this.bot.sendMessage(this.chatId, `Отслеживание ${this.chatConfiguration.warehouses} возобновлено.`);
  }

  async trackingTickHandler(metas) {
    try {
      const { coefficient: maxCoefficient, preorderid, timezone } = this.chatConfiguration;
      const appropriateMetas = metas
        .filter(meta => {
          const { coefficient, boxTypeID } = meta;

          return coefficient !== -1 && coefficient <= maxCoefficient && boxTypeID === 2;
        })
        .map((meta) => ({
          date: meta.date,
          coefficient: meta.coefficient,
          warehouseName: meta.warehouseName,
        }));

      const time = new Date().toLocaleTimeString('ru-RU', {
        timeZone: timezone,
        timeZoneName: 'short',
        hour12: false
      });

      if (appropriateMetas.length === 0) {
        const text = `Время последней проверки: ${time}`;
        if (!!this.reportTimeMessage) {
          this.reportTimeMessage = await this.bot.editMessageText(text, {
            chat_id: this.reportTimeMessage.chat.id,
            message_id: this.reportTimeMessage.message_id,
            disable_notification: true,
          });
        } else {
          this.reportTimeMessage = await this.bot.sendMessage(this.chatId, text, {
            disable_notification: true,
          });
        }

        return;
      }

      this.reportTimeMessage = null;

      if (this.reportMessage && this.chatConfiguration.reportmode === 'Удалять') {
        await this.bot.deleteMessage(this.reportMessage.chat.id, this.reportMessage.message_id);
      }
      const preorderURL = preorderid
        ? `\nhttps://seller.wildberries.ru/supplies-management/all-supplies/supply-detail/uploaded-goods?preorderId=${preorderid}&supplyId`
        : ''
      this.reportMessage = await this.bot.sendMessage(
        this.chatId,
        `Время формирования отчета: ${time}\n`
        + JSON.stringify({
          ...appropriateMetas,
        }, null, 2)
        + preorderURL,
      );
    } catch (error) {
      console.error(error);
    }
  }

  async handleStop({ chat }) {
    if (this.stateStep !== 'tracking') {
      await this.bot.sendMessage(chat.id, 'Отслеживание не начато. Воспользуйтесь командой /track');

      return;
    }
    await this.apiController.stopTracking();
    await this.bot.sendMessage(chat.id, 'Отслеживание остановлено.');
    this.setStateStep(null);
  }

  async handleText(message) {
    if (this.configurationStep === null) {
      await this.bot.sendMessage(message.chat.id, 'Воспользуйтесь одной из команд для установки конфигурации.');

      return;
    }

    if (!this.validateMessageForSetConfigStep(message)) {
      return this.bot.sendMessage(message.chat.id, `Сообщение не прошло валидацию для шага установки ${this.configurationStep}.`);
    }

    return this.handleStep(this.configurationStep, message);
  }

  async handleStep(step, { chat, text }) {
    this.configurationStep = null;
    await this.chatConfiguration.setProperty(step, text);
    this.configurationState[step] = true;
    await this.bot.sendMessage(chat.id, `Свойство ${step} успешно сохранено.`, {
      reply_markup: {
        remove_keyboard: true,
      },
    });
  }

  validateMessageForSetConfigStep(message) {
    return true;
  }
}

export default ChatHandler;
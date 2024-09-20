class ChatHandler {
  bot;
  chatId;
  apiController;
  chatConfiguration;
  // null | 'token' | 'warehouses' | 'ready' | 'tracking' | 'coefficient' | 'preorderID' | 'reportMode'
  stateStep = null;
  state = {
    token: false,
    warehousesNames: false,
    coefficient: false,
    preorderID: false,
  }
  reportMessage;

  constructor(bot, chatId, apiController, chatConfiguration) {
    this.bot = bot;
    this.chatId = chatId;
    this.apiController = apiController;
    this.chatConfiguration = chatConfiguration;
    this.state = {
      token: !!chatConfiguration.token,
      warehousesNames: !!chatConfiguration.warehousesNames,
      coefficient: !!chatConfiguration.coefficient,
      preorderID: !!chatConfiguration.preorderID,
    }

    apiController.subscribeOnTick(this.trackingTickHandler.bind(this));
  }

  get isInitialized() {
    return Object.values(this.state).every(val => val);
  }

  get statusMessage() {
    return `Вам необходимо предоставить:\n${!this.state.token ? '- токен для доступа к API Wildberries (команда /token)\n' : ''}${!this.state.warehousesNames ? '- имена складов для отслеживания (команда /warehouses)\n' : ''}${!this.state.coefficient ? '- максимальный коэффициен (команда /coefficient)\n' : ''}${!this.state.preorderID ? '- ID предзаказа (команда /preorderid)\n' : ''}`;
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

    if (text.startsWith('/token')) {
      return this.handleToken(message);
    }

    if (text.startsWith('/warehouses')) {
      return this.handleWarehouses(message);
    }

    if (text.startsWith('/coefficient')) {
      return this.handleCoefficient(message);
    }

    if (text.startsWith('/preorderid')) {
      return this.handlePreorderID(message);
    }

    if (text.startsWith('/reportmode')) {
      return this.handleReportMode(message);
    }

    if (text.startsWith('/track')) {
      return this.handleTrack(message);
    }

    if (text.startsWith('/stop')) {
      return this.handleStop(message);
    }
  }

  checkIsCommandForbidden(text) {
    return this.stateStep === 'tracking' && !text.startsWith('/stop') && !text.startsWith('/status') && !text.startsWith('/clear');
  }

  async handleForbiddenCommand({ chat }) {
    return this.bot.sendMessage(chat.id, 'Во время отслеживания разрешены команды /stop, /clear, /status.');
  }

  async handleStart({ chat }) {
    await this.bot.sendMessage(chat.id, 'Бот запущен.');
    if (this.state.token) {
      await this.bot.sendMessage(chat.id, 'Токен обнаружен');
    }
    if (this.state.warehousesNames) {
      await this.bot.sendMessage(chat.id, `Список складов для отслеживания обнаружен: ${this.chatConfiguration.warehousesNames}`);
    }
    if (this.state.coefficient) {
      await this.bot.sendMessage(chat.id, `Максимальный коэффициент обнаружен: ${this.chatConfiguration.coefficient}`);
    }
    if (this.state.preorderID) {
      await this.bot.sendMessage(chat.id, `ID предзаказа обнаружен: ${this.chatConfiguration.preorderID}`);
    }

    if (this.isInitialized) {
      await this.bot.sendMessage(chat.id, 'Инициализация произведена. Вы можете воспользоваться командой /track для начала отслеживания выбранных складов. Для сброса настроек воспользуйтесь командой /clear.');

      return this.stateStep = 'ready';
    }

    await this.bot.sendMessage(chat.id, this.statusMessage);
  }

  async handleClear({ chat }) {
    this.apiController.unsubscribeOnTick();
    if (this.stateStep === 'tracking') {
      await this.handleStop({ chat });
    }
    await this.chatConfiguration.deleteConfig();
    this.stateStep = null;
    return this.bot.sendMessage(chat.id, 'Состояние сброшено. Необходимо ввести команду /start заново и следовать инструкциям.');
  }

  async handleStatus({ chat }) {
    await this.bot.sendMessage(chat.id, `Текущий статус: ${this.stateStep}`);
  }

  async handleToken({ chat }) {
    await this.bot.sendMessage(chat.id, 'Предоставьте токен:');
    this.stateStep = 'token';
  }

  async handleWarehouses({ chat }) {
    await this.bot.sendMessage(chat.id, 'Предоставьте список складов для отслеживания (через запятую):');
    this.stateStep = 'warehouses';
  }

  async handleCoefficient({ chat }) {
    await this.bot.sendMessage(chat.id, 'Предоставьте максимальный коэффициент:');
    this.stateStep = 'coefficient';
  }

  async handlePreorderID({ chat }) {
    await this.bot.sendMessage(chat.id, 'Предоставьте ID поставки:');
    this.stateStep = 'preorderID';
  }

  async handleReportMode({ chat }) {
    const msg = await this.bot.sendMessage(chat.id, 'Выберите удалять ли сообщение с прошлым отчетом:', {
      reply_markup: {
        keyboard: [
          ['Удалять', 'Оставлять'],
        ],
        resize_keyboard: true,
      },
    });
    this.stateStep = 'reportMode';
  }

  async handleTrack({ chat }) {
    if (!this.isInitialized) {
      await this.bot.sendMessage(chat.id, 'Невозможно начать отслеживание. Воспользуйтесь командой /start');

      return;
    }
    await this.apiController.startTracking();
    await this.bot.sendMessage(chat.id, `Отслеживание ${this.chatConfiguration.warehousesNames} начато.`);
    this.stateStep = 'tracking';
  }

  async trackingTickHandler(metas) {
    try {
      const { coefficient: maxCoefficient, preorderID } = this.chatConfiguration;
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

      if (appropriateMetas.length === 0) {
        return;
      }

      if (this.reportMessage && this.chatConfiguration.reportMode === 'Удалять') {
        await this.bot.deleteMessage(this.reportMessage.chat.id, this.reportMessage.message_id);
      }
      this.reportMessage = await this.bot.sendMessage(
        this.chatId,
        `Время формирования отчета: ${new Date().toLocaleTimeString()}\n`
        + JSON.stringify({
          ...appropriateMetas,
        }, null, 2)
        + `\nhttps://seller.wildberries.ru/supplies-management/all-supplies/supply-detail/uploaded-goods?preorderId=${preorderID}&supplyId`,
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
    await this.bot.sendMessage(chat.id, 'Отслеживание отменено.');
    this.stateStep = null;
  }

  async handleText(message) {
    if (this.stateStep === null) {
      await this.bot.sendMessage(message.chat.id, 'Воспользуйтесь командой /start');

      return;
    }

    if (['token', 'coefficient', 'preorderID', 'reportMode'].includes(this.stateStep)) {
      await this.handleStep(this.stateStep, message);

      return;
    }

    if (this.stateStep === 'warehouses') {
      await this.handleStep('warehousesNames', message);

      return;
    }

    await this.bot.sendMessage(message.chat.id, `Текущий статус: ${this.stateStep}`);
  }

  async handleStep(step, { chat, text }) {
    this.stateStep = null;
    await this.chatConfiguration.setProperty(step, text);
    this.state[step] = true;
    await this.bot.sendMessage(chat.id, `Свойство ${step} успешно сохранено.`, {
      reply_markup: {
        remove_keyboard: true,
      },
    });
  }
}

export default ChatHandler;
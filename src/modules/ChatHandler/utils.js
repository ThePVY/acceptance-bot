const configPropsMap = {
  token: {
    message: 'Предоставьте токен:',
    options: {},
  },
  warehouses: {
    message: 'Предоставьте список складов для отслеживания (через запятую):',
    options: {},
  },
  coefficient: {
    message: 'Предоставьте максимальный коэффициент:',
    options: {},
  },
  preorderid: {
    message: 'Предоставьте ID поставки:',
    options: {},
  },
  reportmode: {
    message: 'Выберите удалять ли сообщение с прошлым отчетом:',
    options: {
      reply_markup: {
        keyboard: [
          ['Удалять', 'Оставлять'],
        ],
        resize_keyboard: true,
      },
    },
  },
  timezone: {
    message: 'Предоставьте часовой пояс:',
    options: {},
  },
};

const handleSetConfiguration = {
  getMessageText: (configProp) => configPropsMap[configProp].message,
  getOptions: (configProp) => configPropsMap[configProp].options,
};

export {
  handleSetConfiguration,
}

const commands = [
  {
    command: 'start',
    description: 'Запуск бота'
  },
  {
    command: 'track',
    description: 'Начать отслеживание согласно конфигурации'
  },
  {
    command: 'stop',
    description: 'Остановка отслеживания (конфигурация сохраняется)',
  },
  {
    command: 'clear',
    description: 'Сброс конфигурации',
  },
  {
    command: 'status',
    description: 'Узнать текущий статус',
  },
  {
    command: 'token',
    description: 'Настройка конфигурации: токен доступа к API',
  },
  {
    command: 'warehouses',
    description: 'Настройка конфигурации: список складов для отслеживания',
  },
  {
    command: 'coefficient',
    description: 'Настройка конфигурации: максимальный коэффициент',
  },
  {
    command: 'preorderid',
    description: 'Настройка конфигурации: ID предзаказа',
  },
  {
    command: 'reportmode',
    description: 'Настройка конфигурации: удалять ли старый отчет'
  },
]

export default commands;

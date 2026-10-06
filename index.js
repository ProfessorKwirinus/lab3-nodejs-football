import { Command } from 'commander';
import fs from 'node:fs';

const program = new Command();

program
  .name('football-cli')
  .description('CLI-програма для роботи з даними футбольного турніру')
  .version('1.0.0', '-V, --version', 'показати версію програми')
  .option(
    '-f, --file <path>',
    'шлях до JSON-файлу з даними турніру',
    'data.json'
  )
  .helpOption('-h, --help', 'показати довідку');

function printError(message) {
  console.error(`Помилка: ${message}`);
  process.exitCode = 1;
}

function loadData() {
  const filePath = program.opts().file;

  let text;

  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch {
    printError(`не вдалося прочитати файл "${filePath}".`);
    return null;
  }

  try {
    const data = JSON.parse(text);

    if (!Array.isArray(data.teams)) {
      printError('у JSON відсутній масив teams.');
      return null;
    }

    if (!Array.isArray(data.matches)) {
      printError('у JSON відсутній масив matches.');
      return null;
    }

    return data;
  } catch {
    printError(`файл "${filePath}" містить некоректний JSON.`);
    return null;
  }
}

function findTeam(data, teamName) {
  const requestedName = teamName.toLocaleLowerCase('uk-UA');

  return data.teams.find(
    (team) =>
      typeof team.name === 'string' &&
      team.name.toLocaleLowerCase('uk-UA') === requestedName
  );
}

function parsePositiveInteger(value, description) {
  if (!/^\d+$/.test(value)) {
    printError(`${description} має бути додатним цілим числом.`);
    return null;
  }

  const number = Number(value);

  if (number < 1) {
    printError(`${description} має бути більшим за нуль.`);
    return null;
  }

  return number;
}

function getNestedValue(object, path) {
  const parts = path.split('.');
  let current = object;

  for (const part of parts) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== 'object' ||
      !Object.prototype.hasOwnProperty.call(current, part)
    ) {
      return {
        exists: false,
        value: undefined
      };
    }

    current = current[part];
  }

  return {
    exists: true,
    value: current
  };
}

function printMatch(match) {
  const score =
    match.finished && match.score
      ? `${match.score.home}:${match.score.away}`
      : 'матч не завершено';

  console.log(
    `${match.date} | тур ${match.round} | ${match.homeTeam} ${score} ${match.awayTeam}`
  );
}

/*
 * ЗАГАЛЬНА МОЖЛИВІСТЬ 1
 * Стислий перелік основних елементів.
 */
program
  .command('list')
  .description('показати стислий перелік команд турніру')
  .option('-l, --limit <number>', 'обмежити кількість команд')
  .action((options) => {
    const data = loadData();
    if (!data) return;

    let teams = data.teams;

    if (options.limit !== undefined) {
      const limit = parsePositiveInteger(
        options.limit,
        'значення опції --limit'
      );

      if (limit === null) return;

      teams = teams.slice(0, limit);
    }

    if (teams.length === 0) {
      console.log('Команд немає.');
      return;
    }

    teams.forEach((team, index) => {
      const playerCount = Array.isArray(team.players)
        ? team.players.length
        : 0;

      console.log(
        `${index + 1}. ${team.name} — ${team.city}; гравців: ${playerCount}`
      );
    });
  });

/*
 * ЗАГАЛЬНА МОЖЛИВІСТЬ 2
 * Один елемент даних повністю.
 */
program
  .command('show')
  .description('показати всі дані вибраної команди')
  .argument('<team>', 'назва команди')
  .action((teamName) => {
    const data = loadData();
    if (!data) return;

    const team = findTeam(data, teamName);

    if (!team) {
      printError(`команду "${teamName}" не знайдено.`);
      return;
    }

    console.log(JSON.stringify(team, null, 2));
  });

/*
 * ЗАГАЛЬНА МОЖЛИВІСТЬ 3
 * Значення окремого, у тому числі вкладеного поля.
 */
program
  .command('field')
  .description('показати значення поля вибраної команди')
  .argument('<team>', 'назва команди')
  .argument(
    '<path>',
    'шлях до поля через крапку, наприклад players.0.fullName'
  )
  .action((teamName, path) => {
    const data = loadData();
    if (!data) return;

    const team = findTeam(data, teamName);

    if (!team) {
      printError(`команду "${teamName}" не знайдено.`);
      return;
    }

    const result = getNestedValue(team, path);

    if (!result.exists) {
      printError(`поле "${path}" відсутнє.`);
      return;
    }

    if (result.value === null) {
      console.log('null');
      return;
    }

    if (typeof result.value === 'object') {
      console.log(JSON.stringify(result.value, null, 2));
    } else {
      console.log(result.value);
    }
  });

/*
 * ВАРІАНТ 4 — МОЖЛИВІСТЬ 1
 * Склад вибраної команди.
 */
program
  .command('squad')
  .description('показати склад вибраної футбольної команди')
  .argument('<team>', 'назва команди')
  .option(
    '-d, --details',
    'показати додаткові відомості про команду'
  )
  .action((teamName, options) => {
    const data = loadData();
    if (!data) return;

    const team = findTeam(data, teamName);

    if (!team) {
      printError(`команду "${teamName}" не знайдено.`);
      return;
    }

    if (!Array.isArray(team.players)) {
      printError(`для команди "${team.name}" відсутній склад.`);
      return;
    }

    console.log(`Команда: ${team.name}`);

    if (options.details) {
      console.log(`Місто: ${team.city}`);
      console.log(`Кількість гравців: ${team.players.length}`);
    }

    console.log('Склад:');

    team.players.forEach((player) => {
      console.log(
        `№${player.number} — ${player.fullName}`
      );
    });
  });

/*
 * ВАРІАНТ 4 — МОЖЛИВІСТЬ 2
 * Матчі з фільтром за командою та/або датою.
 */
program
  .command('matches')
  .description('показати матчі з можливістю фільтрації')
  .option('-t, --team <name>', 'відбір матчів за командою')
  .option('-d, --date <date>', 'відбір матчів за датою YYYY-MM-DD')
  .action((options) => {
    const data = loadData();
    if (!data) return;

    if (options.team) {
      const team = findTeam(data, options.team);

      if (!team) {
        printError(`команду "${options.team}" не знайдено.`);
        return;
      }
    }

    if (
      options.date &&
      !/^\d{4}-\d{2}-\d{2}$/.test(options.date)
    ) {
      printError(
        'дата повинна мати формат YYYY-MM-DD, наприклад 2026-08-16.'
      );
      return;
    }

    let matches = data.matches;

    if (options.team) {
      const requestedTeam =
        options.team.toLocaleLowerCase('uk-UA');

      matches = matches.filter(
        (match) =>
          match.homeTeam.toLocaleLowerCase('uk-UA') === requestedTeam ||
          match.awayTeam.toLocaleLowerCase('uk-UA') === requestedTeam
      );
    }

    if (options.date) {
      matches = matches.filter(
        (match) => match.date === options.date
      );
    }

    if (matches.length === 0) {
      console.log('Матчів за заданими умовами не знайдено.');
      return;
    }

    matches.forEach(printMatch);
  });

/*
 * ВАРІАНТ 4 — МОЖЛИВІСТЬ 3
 * Рейтинг бомбардирів за кількістю голів.
 */
program
  .command('scorers')
  .description('показати список бомбардирів за кількістю голів')
  .option('-l, --limit <number>', 'обмежити кількість бомбардирів')
  .action((options) => {
    const data = loadData();
    if (!data) return;

    const scorerMap = new Map();

    for (const match of data.matches) {
      if (!Array.isArray(match.events)) continue;

      for (const event of match.events) {
        if (event.type !== 'гол') continue;

        const key = `${event.player}|||${event.team}`;

        if (!scorerMap.has(key)) {
          scorerMap.set(key, {
            player: event.player,
            team: event.team,
            goals: 0
          });
        }

        scorerMap.get(key).goals += 1;
      }
    }

    let scorers = [...scorerMap.values()].sort(
      (a, b) =>
        b.goals - a.goals ||
        a.player.localeCompare(b.player, 'uk')
    );

    if (options.limit !== undefined) {
      const limit = parsePositiveInteger(
        options.limit,
        'значення опції --limit'
      );

      if (limit === null) return;

      scorers = scorers.slice(0, limit);
    }

    if (scorers.length === 0) {
      console.log('У даних немає забитих голів.');
      return;
    }

    scorers.forEach((scorer, index) => {
      console.log(
        `${index + 1}. ${scorer.player} — ${scorer.team} — голів: ${scorer.goals}`
      );
    });
  });

program.exitOverride();

program.configureOutput({
  outputError: () => {}
});

function translateCommanderError(error) {
  const argumentMatch = error.message.match(/'([^']+)'/);
  const value = argumentMatch ? `"${argumentMatch[1]}"` : '';

  switch (error.code) {
    case 'commander.unknownOption':
      return `невідома опція ${value}.`;

    case 'commander.unknownCommand':
      return `невідома команда ${value}.`;

    case 'commander.missingArgument':
      return `пропущено обов'язковий аргумент ${value}.`;

    case 'commander.excessArguments':
      return 'передано зайві аргументи.';

    case 'commander.optionMissingArgument':
      return `для опції ${value} не вказано значення.`;

    default:
      return 'некоректний виклик програми.';
  }
}

try {
  program.parse(process.argv);
} catch (error) {
  if (
    error.code === 'commander.helpDisplayed' ||
    error.code === 'commander.version'
  ) {
    process.exitCode = 0;
  } else {
    printError(translateCommanderError(error));
  }
}

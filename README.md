# Лабораторна робота №3

## Варіант 4 — Футбольний турнір

CLI-програма на Node.js з використанням пакета commander.

## Запуск

npm install
node index.js --help

## Загальні команди

node index.js list
node index.js list --limit 2
node index.js show "Динамо Київ"
node index.js field "Динамо Київ" players.0.fullName

## Команди варіанта 4

node index.js squad "Динамо Київ"
node index.js squad "Динамо Київ" --details
node index.js matches
node index.js matches --team "Динамо Київ"
node index.js matches --date 2026-08-16
node index.js matches --team "Динамо Київ" --date 2026-08-16
node index.js scorers

## Робота з іншим JSON-файлом

node index.js --file data.json list

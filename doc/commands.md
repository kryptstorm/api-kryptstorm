# Command

## Syntax

- Run any script with babel on container: `doker exec kryptstorm_api npm run exec-file <path-to-file>`
- Run specific test file: `docker exec kryptstorm_api npm run --silent exec-test path/to/file.unit-test.js`.
- Sending command line arguments to npm script (example with sequelizeJS): `docker exec kryptstorm_api npm run sequelize seed:create -- --name=SEED_FILE_NAME`
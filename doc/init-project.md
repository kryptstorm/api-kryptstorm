# Init Kryptstorm API

## Requirement

- Docker - Tested on Docker version 17.03.1-ce, build c6d412e
- Kryptstorm image `kryptstorm/node6` - [See here](https://github.com/kryptstorm/docker-images)
- Please sure you are at root of project. Ex: `/home/kryptstorm/Project/api-kryptstorm`

## Install

- Install node modules: `docker run --rm -v $(pwd)/code:/code kryptstorm/node6 npm install`
- Run `kryptstorm_mariadb` - version 10.2.6: `docker run -d --restart always -p 3306:3306 -v $(pwd)/db/mariadb:/var/lib/mysql -e MYSQL_ROOT_PASSWORD=kryptstorm -e MYSQL_DATABASE=kryptstorm --name kryptstorm_mariadb mariadb:10 mysqld --character-set-server=utf8 --collation-server=utf8_unicode_ci --init-connect='SET NAMES UTF8;'`
- Run `kryptstorm_mariadb_admin` - version 4.7: `docker run -d --restart always -p 8080:80 --link kryptstorm_mariadb:db -e PMA_HOST=db -e PMA_PORT=3306 -e PMA_USER=root -e PMA_PASSWORD=kryptstorm --name kryptstorm_mariadb_admin phpmyadmin/phpmyadmin:4.7`
- Run `kryptstorm_api` - version 1.0.0: `docker run -d --restart always -p 9999:9999 -v $(pwd)/code:/code --link kryptstorm_mariadb:kryptstorm_mariadb -e DB_HOST=kryptstorm_mariadb -e DB_PORT-3306 -e DB_DATABASE=kryptstorm -e DB_USER=root -e DB_PASSWORD=kryptstorm -e API_PORT=9999 --name kryptstorm_api kryptstorm/node6:latest npm start`
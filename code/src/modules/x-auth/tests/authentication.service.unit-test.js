/** External modules */
import Seneca from 'seneca';
import _ from 'lodash';
import { expect } from 'chai';

/** Internal modules */
/** Kryptstorm system modules*/
import XMariadb from '../../../libs/x-mariadb';
import XService from '../../../libs/x-service';

/** Services */
import XAuth from '..';
import XUser from '../../x-user';

import { generateFakeUser } from '../../x-user/tests/helpers';
import User, { STATUS_ACTIVE, REAL_PUBLIC_FIELDS, VIRTUAL_PUBLIC_FILEDS } from '../../x-user/models/user.model';

const tablePrefix = 'kryptstorm';

/** Model config */
const models = [...XUser.models, ...XAuth.models];

/** Seneca plugins */
const services = [...XUser.services, ...XAuth.services];
describe('XAuth - authentication', function () {
  const TestApp = fn => {
    const App = Seneca({
      log: 'test'
    })
      .test(fn)
      .use(XService)
      .use(XMariadb, { models, tablePrefix, options: { logging: false } });

    return _.reduce(services, (app, nextService) => app.use(nextService), App);
  }
  let app, validUser, token;

  before((done) => {
    app = TestApp(done);
    app.ready(function () {
      const table = `${tablePrefix}_${User.name}`;
      app.XMariadb$.model(table).truncate({ force: true })
        .then(() => app.XMariadb$.query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`))
        .then(() => app.XService$.act('x_mariadb:create', { model: User.name, attributes: generateFakeUser({ status: STATUS_ACTIVE }), returnFields: [...REAL_PUBLIC_FIELDS, ...VIRTUAL_PUBLIC_FILEDS] }))
        .then(({ errorCode$ = 'ERROR_NONE', data$ }) => {
          if (errorCode$ !== 'ERROR_NONE') return done(new Error('Can not prepare data for unit test.'));
          validUser = {
            username: data$.username,
            email: data$.email,
            password: '123456',
          }
          return done();
        })
        .catch(err => done(err));
    })
  })

  it('Register new user', function (done) {
    const fakeUser = generateFakeUser();
    const payload$ = {
      attributes: _.assign(fakeUser, { confirmPassword: fakeUser.password })
    }

    app.XService$.act('x_user:users, func:create, scenario:register', { payload$ })
      .then(({ errorCode$ = 'ERROR_NONE', data$ }) => {
        expect(errorCode$).to.be.equal('ERROR_NONE');

        expect(data$).to.be.an('object');
        expect(data$.username).to.be.exist;
        expect(data$.username).to.be.equal(payload$.attributes.username.toLowerCase());
        expect(data$.email).to.be.equal(payload$.attributes.email.toLowerCase());

        return done();
      })
      .catch(err => done(err));
  });

  it('Login by username', function (done) {
    const payload$ = {
      attributes: {
        username: validUser.username,
        password: validUser.password
      }
    }

    app.XService$.act('x_auth:authentication, func:login', { payload$ })
      .then(({ errorCode$ = 'ERROR_NONE', data$ }) => {

        expect(errorCode$).to.be.equal('ERROR_NONE');

        expect(data$).to.be.an('object');
        expect(data$.token).to.be.exist;
        expect(data$.token).to.be.an('string');

        if (!token) token = data$.token;

        return done();
      })
      .catch(err => done(err));
  });

  it('Login by email', function (done) {
    const payload$ = {
      attributes: {
        email: validUser.email,
        password: validUser.password
      }
    }

    app.XService$.act('x_auth:authentication, func:login', { payload$ })
      .then(({ errorCode$ = 'ERROR_NONE', data$ }) => {

        expect(errorCode$).to.be.equal('ERROR_NONE');

        expect(data$).to.be.an('object');
        expect(data$.token).to.be.exist;
        expect(data$.token).to.be.an('string');

        if (!token) token = data$.token;

        return done();
      })
      .catch(err => done(err));
  });

  it('Authentication by token', function (done) {
    const payload$ = {
      _meta: { XToken: token }
    }

    app.XService$.act('x_auth:authentication, func:verify', { payload$ })
      .then(({ errorCode$ = 'ERROR_NONE', data$ }) => {

        expect(errorCode$).to.be.equal('ERROR_NONE');

        expect(data$).to.be.an('object');
        expect(data$.id).to.be.exist;
        expect(data$.username).to.be.equal(validUser.username);
        expect(data$.email).to.be.equal(validUser.email);

        return done();
      })
      .catch(err => done(err));
  });

});

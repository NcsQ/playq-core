import * as vars from './helper/bundle/vars';
import { webFixture } from './helper/fixtures/webFixture'; 
import { logFixture } from './helper/fixtures/logFixture';
import * as utils from './helper/util/utils';
import { faker } from '@helper/faker/customFaker';
import { webLocResolver } from './helper/fixtures/webLocFixture';
import * as comm from './helper/actions/commActions';
import * as web from './helper/actions/webActions';
import * as api from './helper/actions/apiActions';
import { dataTest } from '@helper/util/test-data/dataTest';

 const addons: any = (()=>{
    try {
        return require('@extend/addons');
    } catch {
        return undefined;
    }
})();

 const engines:any = (() => {
    try {
        return require('@extend/engines');
    } catch {
        return undefined;
    }
})();

const config: any = (()=>{
    try {
        return require('../resources/config').config;
    } catch {
        return {};
    }
})();





const testType = process.env.TEST_TYPE;
const allowedTypes = ['ui', 'api', 'mobile'] as const;

globalThis.runType = allowedTypes.includes(testType as any)
  ? (testType as typeof allowedTypes[number])
  : 'ui';

globalThis.vars = vars;
globalThis.webLocResolver = webLocResolver;
globalThis.uiFixture = webFixture;
globalThis.logFixture = logFixture;
globalThis.utils = utils;
globalThis.faker = faker;
globalThis.comm = comm;
globalThis.web = web;
globalThis.api = api;
globalThis.dataTest = dataTest;
globalThis.addons = addons;
globalThis.engines = engines;

export { vars, webLocResolver, webFixture, logFixture, utils, faker, comm, web, api, dataTest, addons, engines,config };
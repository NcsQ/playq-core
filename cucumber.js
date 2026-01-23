module.exports = {
  default: {
    formatOptions: { snippetInterface: 'async-await' },
    paths: [ './test/features/**/*.feature' ],
    dryRun: false,
    require: [ './test/steps/**/*.js' ],
    format: [ 'progress-bar' ],
    parallel: 1
  }
};

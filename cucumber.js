module.exports = {
  default: {
    formatOptions: { snippetInterface: 'async-await' },
    paths: [ './test/features/**/*.feature' ],
    dryRun: false,
    require: [ './test/steps/**/*.js' ],
    format: [
      'progress-bar',
      'html:test-results/cucumber-report.html',
      'json:test-results/cucumber-report.json'
    ],
    parallel: 1
  }
};

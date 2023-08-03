const fs = require('fs');
const path = require('path');

describe('version check', () => {
  it('should have same version in index.js and package.json', done => {
    // read the index.js file
    fs.readFile(path.join(__dirname, '..', 'index.js'), 'utf8', (err, data) => {
      if (err) {
        done(err);
        return;
      }

      // extract the version string using regex
      const versionMatch = data.match(/\.version\('(\d+\.\d+\.\d+)'\)/);
      if (!versionMatch || versionMatch.length < 2) {
        done(new Error('Unable to find version in index.js'));
        return;
      }

      const indexVersion = versionMatch[1];

      // read the package.json file
      fs.readFile(path.join(__dirname, '..', 'package.json'), 'utf8', (err, data) => {
        if (err) {
          done(err);
          return;
        }

        let packageJson;
        try {
          packageJson = JSON.parse(data);
        } catch (error) {
          done(new Error('Unable to parse package.json'));
          return;
        }

        const packageVersion = packageJson.version;

        // check if the version numbers are the same
        if (indexVersion === packageVersion) {
          done(); // test pass
        } else {
          done(new Error(`Version mismatch: index.js has ${indexVersion}, but package.json has ${packageVersion}`));
        }
      });
    });
  });
});

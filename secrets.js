// dependencies
const fs = require('fs');

const dockerSecret = {};

dockerSecret.read = function read(secretName) {
  try {
    return fs.readFileSync(`/run/secrets/${secretName}`, 'utf8');
  } catch(err) {
    if (err.code !== 'ENOENT') {
      throw new Error(`An error occurred while trying to read the secret: ${secretName}. Err: ${err}`);
    } else {
      throw new Error(`Could not find the secret, probably not running in swarm mode: ${secretName}. Err: ${err}`);
    }    
    return false;
  }
};

module.exports = dockerSecret;